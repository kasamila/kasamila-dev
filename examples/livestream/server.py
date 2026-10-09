"""Local OBS livestream sample; never expose this development server publicly."""
import asyncio
import json
import os
import secrets
import time
from contextlib import asynccontextmanager
from pathlib import Path

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from host.engine import LiveHub
from host.platforms import ChatPlatform
from host.runtime import sessions, finish_runtime

load_dotenv()
ROOT = Path(__file__).parent
ORIGIN = os.getenv("DEMO_ORIGIN", "http://127.0.0.1:8877")
API = os.getenv("KASAMILA_API_BASE", "https://api.kasamila.com").rstrip("/")
TOKEN_FILE = Path(os.getenv("PLATFORM_TOKEN_FILE", "platform-token.json"))
hub = None
gate = asyncio.Lock()
room = {"id": "demo", "platform": os.getenv("LIVE_PLATFORM", "twitch"), "destination": os.getenv("LIVE_DESTINATION", ""),
        "voice": os.getenv("QWEN_VOICE", "Tina"), "persona": os.getenv("LIVE_PERSONA", "You are a friendly livestream host."),
        "guardrails": os.getenv("LIVE_GUARDRAILS", "Do not request private information or promise real transactions."),
        "low_traffic_per_minute": 12, "voice_interval_seconds": 12, "memory_minutes": 30, "filter_links": True, "blocked_terms": []}
channel = {"provider": "qwen", "id": "qwen", "model": os.getenv("QWEN_MODEL", "qwen3.8-omni-flash-realtime"),
           "endpoint": os.getenv("QWEN_ENDPOINT", ""), "voice": room["voice"], "api_key": os.getenv("QWEN_API_KEY", "")}
avatar = {"name": os.getenv("LIVE_HOST_NAME", "Mia"), "persona": "", "guardrails": "", "voices": {}}


@asynccontextmanager
async def lifespan(app):
    yield
    if hub:
        await hub.close()


app = FastAPI(lifespan=lifespan)
app.mount("/web/portal", StaticFiles(directory=ROOT / "public"), name="public")


def failure(code, status=403):
    return JSONResponse({"error": {"code": code}}, status_code=status, headers={"Cache-Control": "no-store"})


def allowed(request, body):
    secret = os.getenv("SOURCE_TOKEN", "")
    return (len(secret) >= 20 and request.headers.get("origin") == ORIGIN and body.get("room") == "demo"
            and isinstance(body.get("token"), str) and secrets.compare_digest(body["token"], secret))


async def new_runtime():
    descriptor = json.loads(Path(os.environ["KASAMILA_MEDIA_DESCRIPTOR"]).read_text(encoding="utf-8"))
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.post(API + "/api/v1/runtime/sessions", headers={"Authorization": "Bearer " + os.environ["KASAMILA_API_KEY"]},
            json={"avatar_id": os.environ["KASAMILA_AVATAR_ID"], "template_code": os.getenv("KASAMILA_TEMPLATE_CODE", "001"),
                  "origin": ORIGIN, "input_modes": ["pcm_stream"], "max_duration_seconds": 600,
                  "client": {"sdk_version": "2.1.0", "protocol": "kasamila-runtime-v1", "geometry_contract": "kasamila-geometry-track-v2",
                    "update_policy": "pinned", "required_capabilities": ["geometry-v7", "hls", "protected-runtime-v1", "license-grant-v1"]}})
        response.raise_for_status()
        runtime = response.json()["data"]
    sessions[runtime["session_id"]] = runtime["client_token"]
    return {"runtime": runtime, "duration": 600, "api_base": API, "template_media": descriptor}


@app.get("/portal/apps/live/obs")
def source():
    return FileResponse(ROOT / "public/live-obs.html", headers={"Cache-Control": "no-store", "Referrer-Policy": "no-referrer"})


@app.post("/portal/apps/live/obs/{action}")
async def control(action: str, request: Request):
    global hub
    body = await request.json()
    if not allowed(request, body):
        return failure("live_obs_denied")
    if action == "connect":
        async with gate:
            if hub and not hub.closed:
                if time.monotonic() - hub.heartbeat < 45 and hub.controller != body.get("controller"):
                    return failure("live_obs_in_use", 409)
                await hub.close()
            token = json.loads(TOKEN_FILE.read_text(encoding="utf-8"))
            async def persist(value):
                TOKEN_FILE.write_text(json.dumps(value), encoding="utf-8")
                TOKEN_FILE.chmod(0o600)
            platform = ChatPlatform(room, {"client_id": os.environ["OAUTH_CLIENT_ID"], "client_secret": os.environ["OAUTH_CLIENT_SECRET"]}, token, persist)
            runtime = await new_runtime()
            hub = LiveHub(room, platform, channel, avatar)
            hub.controller, hub.heartbeat = body["controller"], time.monotonic()
            hub.runtime_session, hub.runtime_origin = runtime["runtime"]["session_id"], ORIGIN
            hub.tasks = [asyncio.create_task(hub.watch())]
            return {"runtime": runtime, "name": avatar["name"], "background": "transparent"}
    if not hub or hub.closed or hub.controller != body.get("controller"):
        return failure("live_obs_waiting", 409)
    hub.heartbeat = time.monotonic()
    if action == "ack":
        if body.get("done") == hub.voice_id:
            hub.voice_done.set()
            for event in hub.events:
                if event.get("id") == hub.voice_id:
                    event.pop("audio", None)
        return {"ok": True}
    if action == "release":
        await hub.close()
        return {"ok": True}
    if action == "runtime":
        await asyncio.to_thread(finish_runtime, hub.runtime_session, ORIGIN)
        value = await new_runtime()
        hub.runtime_session = value["runtime"]["session_id"]
        return value
    if action == "events":
        hub.start()
        after = max(0, int(body.get("after", 0)))
        async with hub.changed:
            if not any(event["seq"] > after for event in hub.events):
                try:
                    await asyncio.wait_for(hub.changed.wait(), 20)
                except TimeoutError:
                    pass
        return {"events": [event for event in hub.events if event["seq"] > after], "status": hub.status}
    return failure("live_unknown_action", 404)
