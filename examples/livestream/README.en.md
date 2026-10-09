# YouTube / Twitch digital human livestream example

[中文](README.md)

This example consumes the published Kasamila Runtime API/SDK without modifying API, SDK or geometry code. YouTube uses Live Chat polling with `pollingIntervalMillis` and `nextPageToken`; Twitch uses EventSub WebSockets and Send Chat Message. Valid comments are submitted as text to Qwen realtime.

## Run locally

```bash
python -m venv .venv
# Activate the virtual environment
pip install -r requirements.txt
cp .env.example .env
# Fill local credentials in .env only
python authorize.py
uvicorn server:app --host 127.0.0.1 --port 8877
```

Register `OAUTH_CALLBACK` with the platform app. Twitch requests `user:read:chat user:write:chat`; YouTube requests `https://www.googleapis.com/auth/youtube.force-ssl`. Enable YouTube Data API v3 and configure Google consent, test users or verification as required. Authorize the actual channel owner. Each local instance manages one stream, with separate credentials for each platform.

Configure your Beijing/Singapore workspace WSS in `QWEN_ENDPOINT`; the default model is `qwen3.8-omni-flash-realtime`. Supply your own template media descriptor via `KASAMILA_MEDIA_DESCRIPTOR`, following the adjacent `geometry-runtime-web` example. Your Runtime Key must allow the chosen template and `DEMO_ORIGIN`, and have sufficient quota and concurrency.

Set a random `SOURCE_TOKEN` of at least 20 characters. Add this OBS Browser Source:

```text
http://127.0.0.1:8877/portal/apps/live/obs#room=demo&token=<SOURCE_TOKEN>
```

Use 1920×1080, enable **Control audio via OBS**, and disable **Shutdown source when not visible**. OBS handles streaming to YouTube/Twitch. Fragments do not enter HTTP access logs; the whole source URL grants control and must remain private. Bind this development server to loopback only.

## Behavior and limits

- Filters duplicates, bot echoes, commands, emote-only messages, links, repeated characters, flooding and configured blocked terms.
- Each accepted comment receives a platform text reply with `@username`. Low traffic receives spoken replies for each comment; busy chat selects questions with viewer fairness and an interval. OBS acknowledges playback to prevent overlapping speech.
- Remembers the last four turns independently per viewer for 30 minutes by default. Memory is cleared when the stream session ends. Reconnects do not promise persistent memory across streams.
- Rate limits queue retries; permissions, offline streams, moderation and model failures produce visible status. Delivery cannot be guaranteed when the platform rejects an API request. Accepted queues are process-local; stopping/restarting does not replay old messages.
- Existing Runtime authorization rotates every ten minutes. Closing or losing OBS releases the session; continuous streaming consumes normal Runtime quota.
- The hosted Portal includes platform video/chat embeds and an additional viewer OAuth text box. Viewer messages use the viewer's identity, never the broadcaster's credentials.

Hosted Portal credentials are configured through **Admin → Application demos → Livestream demos**. Environment variables are only for this standalone sample. The hosted version adds Admin authentication, CSRF, encrypted token storage, same-origin checks, single-source OBS ownership and source revocation.

Official protocols: [YouTube list](https://developers.google.com/youtube/v3/live/docs/liveChatMessages/list), [YouTube insert](https://developers.google.com/youtube/v3/live/docs/liveChatMessages/insert), [Twitch chat](https://dev.twitch.tv/docs/chat/send-receive-messages/), [EventSub WebSockets](https://dev.twitch.tv/docs/eventsub/handling-websocket-events/), [Qwen client events](https://help.aliyun.com/en/model-studio/client-events).
