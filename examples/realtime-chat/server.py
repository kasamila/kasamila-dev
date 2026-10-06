"""Local reference app: browser PCM -> voice provider -> existing Kasamila SDK."""
import asyncio
import json
import os
import secrets
import time
from pathlib import Path

import httpx
from fastapi import FastAPI, Request, WebSocket
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from providers import VoiceTransport

ROOT = Path(__file__).resolve().parent
PUBLIC = ROOT / "public"
ORIGIN = os.getenv("APP_ORIGIN", "http://127.0.0.1:8792")
API = os.getenv("KASAMILA_API_BASE", "https://www.kasamila.com").rstrip("/")
PROVIDER = os.getenv("VOICE_PROVIDER", "openai")
DEFAULTS = {
    "openai": ("wss://api.openai.com/v1/realtime", "gpt-realtime-2.1", "marin", 24000),
    "gemini": ("wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent", "gemini-3.8-live", "Kore", 16000),
    "qwen": ("", "qwen3.8-omni-flash-realtime", "Tina", 16000),
    "grok": ("wss://api.x.ai/v1/realtime", "grok-voice-think-fast-2.0", "ara", 24000),
    "doubao": ("wss://openspeech.bytedance.com/api/v3/realtime/dialogue", "1.2.1.1", "zh_female_vv_jupiter_bigtts", 16000),
}
tickets = {}
app = FastAPI()
app.mount("/web/portal", StaticFiles(directory=PUBLIC), name="public")

@app.get("/web/kasamila-logo.svg")
def logo():
    return FileResponse(PUBLIC / "logo.svg")

@app.get("/")
def root():
    return RedirectResponse("/portal/apps/chat")

@app.get("/portal/apps")
@app.get("/portal/apps/chat")
def page():
    return FileResponse(PUBLIC / "applications.html")

@app.get("/portal/apps/catalog")
def catalog():
    return {"avatars": [{"id": "demo", "name": os.getenv("AVATAR_NAME", "Mia"), "names": {}, "channels": ["voice"],
                         "poster_url": "/web/portal/media/demo-portrait-friendly-v1.webp"}],
            "channels": [{"id": "voice", "label": PROVIDER, "provider": PROVIDER}], "max_duration_seconds": 180}

@app.get("/portal/{page}")
def website(page: str):
    return RedirectResponse(API + "/portal/" + page)

async def close_runtime(token):
    async with httpx.AsyncClient(timeout=10) as client:
        await client.post(API + "/api/v1/runtime/sessions/end", headers={"Authorization": "Bearer " + token, "Origin": ORIGIN})

@app.post("/portal/apps/sessions")
async def session(request: Request):
    # Local example only. Hosted anonymous demos must add auth/abuse controls;
    # the Portal implementation adds rate limits, a catalog allowlist and quotas.
    if request.headers.get("origin") != ORIGIN:
        return JSONResponse({"error": "Origin denied"}, status_code=403)
    body = await request.json()
    if not body.get("consent") or body.get("avatar") != "demo" or body.get("channel") != "voice":
        return JSONResponse({"error": "Invalid selection"}, status_code=422)
    try:
        if PROVIDER not in DEFAULTS or not os.getenv("VOICE_API_KEY"):
            raise ValueError("Configure the voice provider")
        # Customers host their own template media descriptor, as in the existing
        # geometry-runtime-web example. Never publish a permanent Runtime Key.
        descriptor = json.loads(Path(os.environ["KASAMILA_MEDIA_DESCRIPTOR"]).read_text(encoding="utf-8"))
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(API + "/api/v1/runtime/sessions", headers={"Authorization": "Bearer " + os.environ["KASAMILA_API_KEY"]}, json={
                "avatar_id": os.environ["KASAMILA_AVATAR_ID"], "template_code": os.getenv("KASAMILA_TEMPLATE_CODE", "001"),
                "origin": ORIGIN, "input_modes": ["pcm_stream"], "max_duration_seconds": 180,
                "client": {"sdk_version": "2.1.0", "protocol": "kasamila-runtime-v1", "geometry_contract": "kasamila-geometry-track-v2",
                           "update_policy": "pinned", "required_capabilities": ["geometry-v7", "hls", "protected-runtime-v1", "license-grant-v1"]}})
            response.raise_for_status()
            runtime = response.json()["data"]
        ticket = secrets.token_urlsafe(32)
        tickets[ticket] = {"token": runtime["client_token"], "expires": time.time() + 120, "locale": body.get("locale", "en")}
        return JSONResponse({"runtime": runtime, "ticket": ticket, "duration": 180, "api_base": API, "template_media": descriptor}, headers={"Cache-Control": "no-store"})
    except Exception:
        return JSONResponse({"error": "Check local configuration and provider access"}, status_code=503)

@app.websocket("/portal/apps/socket")
async def socket(browser: WebSocket):
    await browser.accept()
    state = None
    transport = None
    try:
        if browser.headers.get("origin") != ORIGIN:
            raise ValueError("Origin denied")
        first = json.loads(await asyncio.wait_for(browser.receive_text(), 10))
        state = tickets.pop(first.get("ticket", ""), None)
        if not state or state["expires"] < time.time():
            raise ValueError("Ticket expired")
        endpoint, model, voice, rate = DEFAULTS[PROVIDER]
        channel = {"provider": PROVIDER, "api_key": os.environ["VOICE_API_KEY"], "model": os.getenv("VOICE_MODEL", model),
                   "voice": os.getenv("VOICE_NAME", voice), "endpoint": os.getenv("VOICE_ENDPOINT", endpoint),
                   "app_id": os.getenv("DOUBAO_APP_ID", ""), "app_key": os.getenv("DOUBAO_APP_KEY", ""),
                   "resource_id": os.getenv("DOUBAO_RESOURCE_ID", "volc.speech.dialog")}
        transport = VoiceTransport(channel, os.getenv("AGENT_INSTRUCTIONS", "You are a helpful demonstration assistant. Never request sensitive personal data.")
                                   + " Respond in language " + state["locale"], channel["voice"],
                                   {"endpoint": endpoint, "model": model, "voice": voice, "input_rate": rate})
        await transport.connect()
        async def receive():
            while True:
                raw = await browser.receive_text()
                if len(raw) > 70000:
                    raise ValueError("Frame too large")
                await transport.input(json.loads(raw))
        async def emit():
            async for event in transport.events():
                await browser.send_json(event)
        tasks = [asyncio.create_task(receive()), asyncio.create_task(emit())]
        try:
            await asyncio.wait(tasks, timeout=180, return_when=asyncio.FIRST_COMPLETED)
        finally:
            for task in tasks:
                task.cancel()
            await asyncio.gather(*tasks, return_exceptions=True)
    except Exception:
        try:
            await browser.send_json({"type": "error", "code": "connection_failed"})
        except Exception:
            pass
    finally:
        if transport:
            await transport.close()
        if state:
            try:
                await close_runtime(state["token"])
            except Exception:
                pass
        try:
            await browser.close()
        except Exception:
            pass
