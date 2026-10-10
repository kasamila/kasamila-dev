"""YouTube/Twitch OAuth and chat adapters. Tokens never leave the server."""
import asyncio
import logging
import time
from datetime import datetime
from contextlib import aclosing
from urllib.parse import urlencode, urlsplit

import httpx

YOUTUBE = "https://www.googleapis.com/youtube/v3/"
TWITCH = "https://api.twitch.tv/helix/"
SCOPES = {"youtube": "https://www.googleapis.com/auth/youtube.force-ssl",
          "twitch": "user:read:chat user:write:chat"}
logger = logging.getLogger(__name__)
GOOGLE_ERRORS = {
    "invalid_client": "live_oauth_client_invalid",
    "unauthorized_client": "live_oauth_client_invalid",
    "invalid_grant": "live_oauth_code_invalid",
    "redirect_uri_mismatch": "live_oauth_redirect_invalid",
    "accessNotConfigured": "live_youtube_api_disabled",
    "SERVICE_DISABLED": "live_youtube_api_disabled",
    "insufficientPermissions": "live_youtube_permissions_required",
    "ACCESS_TOKEN_SCOPE_INSUFFICIENT": "live_youtube_permissions_required",
    "youtubeSignupRequired": "live_youtube_channel_required",
    "authenticatedUserNotChannel": "live_youtube_channel_required",
}


class PlatformError(Exception):
    def __init__(self, code, retry_after=0):
        self.code, self.retry_after = code, retry_after
        super().__init__(code)


async def request(method, url, **kwargs):
    async with httpx.AsyncClient(timeout=20, follow_redirects=False) as client:
        response = await client.request(method, url, **kwargs)
    if response.status_code >= 400:
        retry = response.headers.get("Retry-After", "")
        reset = response.headers.get("Ratelimit-Reset", "")
        wait = float(retry) if retry.isdigit() else max(1, float(reset) - time.time()) if reset.isdigit() else 30
        google = url.startswith(YOUTUBE) or url == "https://oauth2.googleapis.com/token"
        if google:
            try:
                error = response.json().get("error", {})
                reasons = [error] if isinstance(error, str) else [item.get("reason", "") for item in error.get("errors", []) + error.get("details", [])]
                reasons = [value for value in reasons if isinstance(value, str)]
                reason = next((value for value in reasons if value in GOOGLE_ERRORS), reasons[0] if reasons else "")
            except (ValueError, TypeError, AttributeError, IndexError):
                reason = ""
            # Never log response bodies/descriptions, codes, tokens, or request URLs.
            safe_reason = reason if reason in GOOGLE_ERRORS or reason in ("quotaExceeded", "dailyLimitExceeded", "rateLimitExceeded", "userRequestsExceedRateLimit", "liveChatEnded", "liveChatDisabled", "liveChatNotFound", "forbidden") else "unclassified"
            logger.warning("Portal livestream Google error service=%s status=%s reason=%s", "youtube" if url.startswith(YOUTUBE) else "oauth", response.status_code, safe_reason)
            if reason in GOOGLE_ERRORS:
                raise PlatformError(GOOGLE_ERRORS[reason])
            if reason in ("quotaExceeded", "dailyLimitExceeded", "rateLimitExceeded", "userRequestsExceedRateLimit"):
                raise PlatformError("live_platform_limited", 3600 if reason in ("quotaExceeded", "dailyLimitExceeded") else wait)
            if reason in ("liveChatEnded", "liveChatDisabled", "liveChatNotFound"):
                raise PlatformError("live_room_offline")
        raise PlatformError("live_auth_required" if response.status_code == 401 else
                            "live_platform_limited" if response.status_code == 429 else "live_platform_error", wait)
    return response.json() if response.content else {}


def authorization_url(platform, client_id, callback, state):
    endpoint = "https://accounts.google.com/o/oauth2/v2/auth" if platform == "youtube" else "https://id.twitch.tv/oauth2/authorize"
    params = {"client_id": client_id, "redirect_uri": callback, "response_type": "code", "scope": SCOPES[platform], "state": state}
    if platform == "youtube":
        params.update(access_type="offline", prompt="consent")
    else:
        params["force_verify"] = "true"
    return endpoint + "?" + urlencode(params)


async def exchange(platform, config, code, callback):
    url = "https://oauth2.googleapis.com/token" if platform == "youtube" else "https://id.twitch.tv/oauth2/token"
    token = await request("POST", url, data={"client_id": config["client_id"], "client_secret": config["client_secret"],
                          "code": code, "grant_type": "authorization_code", "redirect_uri": callback})
    token["expires_at"] = time.time() + token.get("expires_in", 3600)
    token["platform"] = platform
    headers = {"Authorization": "Bearer " + token["access_token"]}
    if platform == "twitch":
        profile = (await request("GET", TWITCH + "users", headers={**headers, "Client-Id": config["client_id"]}))["data"][0]
        token.update(user_id=profile["id"], name=profile["display_name"], login=profile["login"])
        validated = await request("GET", "https://id.twitch.tv/oauth2/validate", headers={"Authorization": "OAuth " + token["access_token"]})
        if validated.get("client_id") != config["client_id"] or not set(SCOPES["twitch"].split()).issubset(validated.get("scopes", [])):
            raise PlatformError("live_auth_required")
        token["validated_at"] = time.time()
    else:
        channels = (await request("GET", YOUTUBE + "channels", headers=headers, params={"part": "snippet", "mine": "true"})).get("items", [])
        if not channels:
            raise PlatformError("live_youtube_channel_required")
        token.update(user_id=channels[0]["id"], name=channels[0]["snippet"]["title"])
    return token


class ChatPlatform:
    def __init__(self, room, config, token, persist):
        self.room, self.config, self.token, self.persist = room, config, token, persist
        self.lock = asyncio.Lock()
        self.live_chat_id = None
        self.broadcaster_id = None
        self.last_sent = 0
        self.send_lock = asyncio.Lock()
        self.page_token = None
        self.youtube_since = None

    async def headers(self):
        async with self.lock:
            if self.token["expires_at"] < time.time() + 120:
                if not self.token.get("refresh_token"):
                    raise PlatformError("live_auth_required")
                url = "https://oauth2.googleapis.com/token" if self.room["platform"] == "youtube" else "https://id.twitch.tv/oauth2/token"
                result = await request("POST", url, data={"client_id": self.config["client_id"], "client_secret": self.config["client_secret"],
                              "grant_type": "refresh_token", "refresh_token": self.token["refresh_token"]})
                self.token.update(result, expires_at=time.time() + result.get("expires_in", 3600))
                await self.persist(self.token)
            headers = {"Authorization": "Bearer " + self.token["access_token"]}
            if self.room["platform"] == "twitch":
                if time.time() - self.token.get("validated_at", 0) > 3600:
                    result = await request("GET", "https://id.twitch.tv/oauth2/validate", headers={"Authorization": "OAuth " + self.token["access_token"]})
                    if result.get("client_id") != self.config["client_id"] or result.get("user_id") != self.token["user_id"]:
                        raise PlatformError("live_auth_required")
                    self.token["validated_at"] = time.time()
                headers["Client-Id"] = self.config["client_id"]
            return headers

    async def resolve(self, owner=False):
        headers = await self.headers()
        if self.room["platform"] == "youtube":
            value = await request("GET", YOUTUBE + "videos", headers=headers, params={"id": self.room["destination"], "part": "snippet,liveStreamingDetails"})
            rows = value.get("items", [])
            if not rows or owner and rows[0]["snippet"]["channelId"] != self.token["user_id"]:
                raise PlatformError("live_owner_mismatch")
            chat_id = rows[0].get("liveStreamingDetails", {}).get("activeLiveChatId")
            if chat_id != self.live_chat_id:
                self.page_token, self.youtube_since = None, None
            self.live_chat_id = chat_id
            if not self.live_chat_id:
                raise PlatformError("live_room_offline")
        else:
            rows = (await request("GET", TWITCH + "users", headers=headers, params={"login": self.room["destination"]})).get("data", [])
            if not rows or owner and rows[0]["id"] != self.token["user_id"]:
                raise PlatformError("live_owner_mismatch")
            self.broadcaster_id = rows[0]["id"]

    async def send(self, text, reply_id=None):
        async with self.send_lock:
            return await self._send(text, reply_id)

    async def _send(self, text, reply_id=None):
        if not (self.live_chat_id or self.broadcaster_id):
            await self.resolve()
        # Keep below Twitch broadcaster's per-channel send limit; platform 429 is also respected.
        await asyncio.sleep(max(0, self.last_sent + 1.1 - time.monotonic()))
        headers = await self.headers()
        if self.room["platform"] == "youtube":
            result = await request("POST", YOUTUBE + "liveChat/messages", headers=headers, params={"part": "snippet"}, json={"snippet": {
                "liveChatId": self.live_chat_id, "type": "textMessageEvent", "textMessageDetails": {"messageText": text[:200]}}})
            message_id = result["id"]
        else:
            body = {"broadcaster_id": self.broadcaster_id, "sender_id": self.token["user_id"], "message": text[:500]}
            if reply_id:
                body["reply_parent_message_id"] = reply_id
            result = (await request("POST", TWITCH + "chat/messages", headers=headers, json=body))["data"][0]
            if not result.get("is_sent"):
                raise PlatformError("live_message_rejected")
            message_id = result["message_id"]
        self.last_sent = time.monotonic()
        return message_id

    async def messages(self):
        if not (self.live_chat_id or self.broadcaster_id):
            await self.resolve(owner=True)
        if self.room["platform"] == "youtube":
            async with aclosing(self._youtube_messages()) as stream:
                async for item in stream:
                    yield item
        else:
            from websockets.asyncio.client import connect
            url, migrated = "wss://eventsub.wss.twitch.tv/ws", False
            ws = await connect(url, ping_interval=None, open_timeout=15, max_size=2**20, proxy=None)
            try:
                import json
                while True:
                    message = json.loads(await asyncio.wait_for(ws.recv(), 45))
                    kind, payload = message["metadata"]["message_type"], message["payload"]
                    if kind == "session_welcome" and not migrated:
                        await request("POST", TWITCH + "eventsub/subscriptions", headers=await self.headers(), json={
                            "type": "channel.chat.message", "version": "1", "condition": {
                                "broadcaster_user_id": self.broadcaster_id, "user_id": self.token["user_id"]},
                            "transport": {"method": "websocket", "session_id": payload["session"]["id"]}})
                    elif kind == "notification":
                        event = payload["event"]
                        yield {"id": event["message_id"], "user_id": event["chatter_user_id"],
                               "name": event["chatter_user_name"], "mention": event["chatter_user_login"], "text": event["message"]["text"],
                               "emote_only": not any(fragment["type"] == "text" and fragment["text"].strip()
                                                     for fragment in event["message"].get("fragments", []))}
                    elif kind == "session_reconnect":
                        new_url = payload["session"]["reconnect_url"]
                        if urlsplit(new_url).scheme != "wss" or urlsplit(new_url).hostname != "eventsub.wss.twitch.tv":
                            raise PlatformError("live_platform_error")
                        replacement = await connect(new_url, ping_interval=None, open_timeout=15, max_size=2**20, proxy=None)
                        welcome = json.loads(await asyncio.wait_for(replacement.recv(), 10))
                        if welcome["metadata"]["message_type"] != "session_welcome":
                            await replacement.close()
                            raise PlatformError("live_platform_error")
                        await ws.close()
                        ws, migrated = replacement, True
                    elif kind == "revocation":
                        raise PlatformError("live_auth_required")
            finally:
                await ws.close()

    async def _youtube_messages(self):
        from .youtube_stream import stream_pages, StreamError
        if self.youtube_since is None:
            self.youtube_since = time.time()
        delay, refreshed = 2, False
        while True:
            headers = await self.headers()
            # Reconnect with the cursor before the OAuth token expires. There is
            # no periodic list request while the stream is idle.
            lifetime = max(1, min(3000, self.token["expires_at"] - time.time() - 60))
            pages = stream_pages(headers, self.live_chat_id, self.page_token, lifetime)
            try:
                async for page in pages:
                    delay, refreshed = 2, False
                    for item in page["items"]:
                        try:
                            published = datetime.fromisoformat(item["published_at"].replace("Z", "+00:00"))
                            if published.tzinfo is None or published.timestamp() < self.youtube_since:
                                continue
                        except (ValueError, KeyError):
                            continue
                        yield {key: item[key] for key in ("id", "user_id", "name", "text")}
                    # Advance only after the entire batch has been handed off.
                    # A mid-batch retry may redeliver IDs; ChatPolicy deduplicates.
                    self.page_token = page["nextPageToken"] or self.page_token
                    if page.get("offlineAt") or page.get("ended"):
                        raise PlatformError("live_room_offline")
            except StreamError as error:
                if error.code == "live_auth_required" and not refreshed:
                    self.token["expires_at"] = 0
                    refreshed = True
                    continue
                if error.code != "live_stream_reconnect":
                    raise PlatformError(error.code, error.retry_after) from None
            finally:
                await pages.aclose()
            await asyncio.sleep(delay)
            delay = min(30, delay * 2)
