"""Discord Activity validation demo. Uses the published Runtime contract unchanged."""
import asyncio
import json
import os
import re
import secrets
from pathlib import Path

import httpx
from websockets.asyncio.client import connect as websocket_connect
from fastapi import APIRouter, Request, WebSocket
from fastapi.responses import FileResponse, JSONResponse
from pydantic import Field, model_validator

from ...core.errors import ApiError
from ...db.session import get_session_factory
from ..admin.dependencies import AdminIdentity, AdminCsrfIdentity, ensure_role
from ..admin.models import SystemSetting
from ..admin.secrets import decrypt_json, encrypt_json
from ..admin.service import audit
from ..identity.dependencies import DatabaseSession
from .demo_config import StrictModel
from .companion import catalog_value, start_runtime, finish_runtime
from .livestream import origin as admin_origin

router = APIRouter(include_in_schema=False)
ROOT = Path(__file__).resolve().parents[3]
KEY = "portal.discord_activity"
BRIDGE = "http://127.0.0.1:8791"


class DiscordSettings(StrictModel):
    enabled: bool = False
    application_id: str = Field(default="", pattern=r"^(?:\d{17,20})?$")
    client_secret: str = Field(default="", max_length=256)
    bot_token: str = Field(default="", max_length=512)
    clear_client_secret: bool = False
    clear_bot_token: bool = False
    guild_id: str = Field(default="", pattern=r"^(?:\d{17,20})?$")
    channel_id: str = Field(default="", pattern=r"^(?:\d{17,20})?$")
    avatars: list[str] = Field(default_factory=list, max_length=40)
    max_viewers: int = Field(default=4, ge=1, le=8)

    @model_validator(mode="after")
    def required(self):
        if self.enabled and not (self.application_id and self.guild_id and self.channel_id and self.avatars):
            raise ValueError("Configure application, test server, voice channel and allowed avatars first")
        if len(set(self.avatars)) != len(self.avatars):
            raise ValueError("Duplicate avatar")
        return self


def load(db):
    row = db.get(SystemSetting, KEY)
    return decrypt_json(row.encrypted_value) if row else DiscordSettings().model_dump()


def redacted(value):
    return {**{k: v for k, v in value.items() if k not in ("client_secret", "bot_token", "clear_client_secret", "clear_bot_token")},
            "client_secret_configured": bool(value.get("client_secret")), "bot_token_configured": bool(value.get("bot_token"))}


def bridge_secret():
    # Independent, local-only service credential; never put Discord credentials in env files.
    value = os.environ.get("KASAMILA_DISCORD_BRIDGE_SECRET", "")
    path = ROOT / ".portal-discord-bridge-secret"
    if not value and path.is_file():
        value = path.read_text().strip()
    if len(value) < 40:
        raise ApiError(503, "discord_bridge_unavailable", "Discord validation service is not installed")
    return value


async def bridge(path, body=None):
    try:
        async with httpx.AsyncClient(timeout=25, trust_env=False) as client:
            response = await client.request("POST" if body is not None else "GET", BRIDGE + path,
                headers={"Authorization": "Bearer " + bridge_secret()}, json=body)
        value = response.json()
    except (httpx.HTTPError, ValueError):
        raise ApiError(503, "discord_bridge_unavailable", "Discord validation service is unavailable") from None
    if response.status_code >= 400:
        raise ApiError(response.status_code, value.get("code", "discord_failed"), "Discord: " + value.get("code", "request_failed"))
    return value


def activity_origin(request, value):
    expected = "https://" + value["application_id"] + ".discordsays.com"
    if not value["enabled"] or request.headers.get("origin") != expected:
        raise ApiError(403, "discord_origin_denied", "Launch this Activity inside the configured Discord application")
    return expected


@router.get("/api/v1/admin/portal/discord/manage")
def admin_page(admin: AdminIdentity):
    ensure_role(admin, "superadmin", "operator", "auditor")
    return FileResponse(ROOT / "web/portal/discord-activity/admin.html", headers={"Cache-Control": "no-store"})


@router.get("/api/v1/admin/portal/discord/settings")
async def settings(admin: AdminIdentity, db: DatabaseSession):
    ensure_role(admin, "superadmin", "operator", "auditor")
    value = load(db)
    try:
        status = await bridge("/status")
    except ApiError:
        status = {"phase": "bridge_unavailable"}
    return JSONResponse({"settings": redacted(value), "avatars": catalog_value(db)["avatars"],
        "can_edit": admin.grant.role == "superadmin", "status": status}, headers={"Cache-Control": "no-store"})


@router.put("/api/v1/admin/portal/discord/settings")
def save(request: Request, payload: DiscordSettings, admin: AdminCsrfIdentity, db: DatabaseSession):
    ensure_role(admin, "superadmin")
    admin_origin(request)
    old, value = load(db), payload.model_dump()
    for name in ("client_secret", "bot_token"):
        value[name] = "" if value.pop("clear_" + name) else value[name] or old.get(name, "")
    if value["enabled"] and not (value["client_secret"] and value["bot_token"]):
        raise ApiError(422, "discord_credentials_required", "Configure Client Secret and Bot Token")
    allowed = {row["id"] for row in catalog_value(db)["avatars"]}
    if set(value["avatars"]) - allowed:
        raise ApiError(422, "discord_avatar_unavailable", "Choose enabled, ready Voice Companion avatars")
    row = db.get(SystemSetting, KEY)
    if row is None:
        row = SystemSetting(key=KEY, encrypted_value="", updated_by_user_id=admin.identity.user.id)
        db.add(row)
    row.encrypted_value = encrypt_json(value)
    row.updated_by_user_id = admin.identity.user.id
    audit(db, request, admin, "portal.discord.update", "setting", KEY, metadata={"enabled": value["enabled"], "avatars": len(value["avatars"])})
    db.commit()
    return JSONResponse(redacted(value), headers={"Cache-Control": "no-store"})


@router.get("/portal/apps/discord/internal-config")
def internal_config(request: Request, db: DatabaseSession):
    # This route is also denied by the public nginx location. Check loopback AND secret.
    if request.client.host not in ("127.0.0.1", "::1") or not secrets.compare_digest(
            request.headers.get("authorization", ""), "Bearer " + bridge_secret()):
        raise ApiError(403, "discord_internal_denied", "Forbidden")
    return JSONResponse(load(db), headers={"Cache-Control": "no-store"})


@router.get("/portal/apps/discord/activity/")
@router.get("/portal/apps/discord/activity")
def page():
    return FileResponse(ROOT / "web/portal/discord-activity/index.html", headers={
        "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Frame-Options": "",
        "Content-Security-Policy": "frame-ancestors https://discord.com https://*.discord.com https://*.discordsays.com", "X-Robots-Tag": "noindex"})


@router.get("/portal/apps/discord/config")
def public_config(db: DatabaseSession):
    value = load(db)
    return JSONResponse({"application_id": value["application_id"], "enabled": value["enabled"],
        "avatars": [row for row in catalog_value(db)["avatars"] if row["id"] in value["avatars"]]}, headers={"Cache-Control": "no-store"})


class Auth(StrictModel):
    code: str = Field(min_length=1, max_length=2048)
    instance_id: str = Field(min_length=1, max_length=200, pattern=r"^[A-Za-z0-9_-]+$")


@router.post("/portal/apps/discord/auth")
async def authorize(request: Request, payload: Auth, db: DatabaseSession):
    value = load(db)
    current_origin = activity_origin(request, value)
    return JSONResponse(await bridge("/auth", {**payload.model_dump(), "origin": current_origin}), headers={"Cache-Control": "no-store"})


class Runtime(StrictModel):
    session: str = Field(min_length=20, max_length=2048)
    avatar: str = Field(pattern=r"^[a-z0-9-]{1,48}$")
    consent: bool


class State(StrictModel):
    session: str = Field(min_length=20, max_length=2048)


@router.post("/portal/apps/discord/state")
async def state(request: Request, payload: State, db: DatabaseSession):
    current_origin = activity_origin(request, load(db))
    return JSONResponse(await bridge("/state", {"session": payload.session, "origin": current_origin}), headers={"Cache-Control": "no-store"})


@router.post("/portal/apps/discord/runtime")
async def runtime(request: Request, payload: Runtime, db: DatabaseSession):
    from ...core.encryption import seal_json
    value = load(db)
    current_origin = activity_origin(request, value)
    identity = await bridge("/verify", {"session": payload.session, "origin": current_origin})
    if not payload.consent or payload.avatar not in value["avatars"]:
        raise ApiError(403, "discord_consent_required", "Choose an allowed avatar and accept audio processing")
    if not runtime_limiter.check(identity["user_id"], 8, 600).allowed:
        raise ApiError(429, "discord_rate_limited", "Please try again later")
    result = await asyncio.to_thread(start_runtime, current_origin, payload.avatar)
    result["ticket"] = seal_json({"session": payload.session, "origin": current_origin,
        "runtime_id": result["runtime"]["session_id"], "avatar": payload.avatar,
        "nonce": secrets.token_urlsafe(24)}, "portal-discord-runtime")
    return JSONResponse(result, headers={"Cache-Control": "no-store"})


from ...core.rate_limit import InMemoryRateLimiter
runtime_limiter = InMemoryRateLimiter()


@router.websocket("/portal/apps/discord/socket")
async def socket_route(socket: WebSocket):
    from ...core.encryption import open_json
    from ..runtime.models import RuntimeSession
    from ..identity.models import utcnow
    from sqlalchemy import select
    ticket = None
    tasks = []
    upstream = None
    owned = False
    await socket.accept()
    try:
        raw = await asyncio.wait_for(socket.receive_text(), 10)
        if len(raw) > 8192:
            raise ValueError("Oversized admission")
        ticket = open_json(json.loads(raw)["ticket"], "portal-discord-runtime")
        if ticket["origin"] != socket.headers.get("origin") or not runtime_limiter.check("ticket:" + ticket["nonce"], 1, 1800).allowed:
            raise ValueError("Invalid admission")
        with get_session_factory()() as db:
            row = db.scalar(select(RuntimeSession).where(RuntimeSession.session_id == ticket["runtime_id"]))
            if not row or row.status != "active" or row.expires_at <= utcnow() or row.origin != ticket["origin"]:
                raise ValueError("Runtime ended")
            seconds = max(1, (row.expires_at - utcnow()).total_seconds())
            owned = True
        upstream = await websocket_connect("ws://127.0.0.1:8791/audio", max_size=16384, max_queue=8,
            additional_headers={"Authorization": "Bearer " + bridge_secret()}, open_timeout=10, proxy=None)
        await upstream.send(json.dumps({"session": ticket["session"], "origin": ticket["origin"], "avatar": ticket["avatar"]}))

        async def incoming():
            async for data in upstream:
                if isinstance(data, bytes):
                    await socket.send_bytes(data)
                else:
                    await socket.send_text(data)

        async def outgoing():
            while True:
                text = await socket.receive_text()
                if len(text) > 2048:
                    raise ValueError("Oversized command")
                await upstream.send(text)

        tasks = [asyncio.create_task(incoming()), asyncio.create_task(outgoing())]
        await asyncio.wait(tasks, timeout=seconds, return_when=asyncio.FIRST_COMPLETED)
    except Exception:
        try:
            await socket.send_json({"type": "error", "code": "discord_connection_ended"})
        except Exception:
            pass
    finally:
        for task in tasks:
            task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
        if upstream:
            await upstream.close()
        if owned:
            await asyncio.to_thread(finish_runtime, ticket["runtime_id"], ticket["origin"])
        try:
            await socket.close()
        except Exception:
            pass
