"""Vendor transports for the realtime chat example. No Kasamila SDK internals."""
import base64
import asyncio
import gzip
import json
import struct
import uuid
from urllib.parse import urlencode

class ProviderSetupError(Exception):
    def __init__(self, code):
        self.code = code
        super().__init__(code)

def doubao_frame(event, payload, session_id="", audio=False):
    body = gzip.compress(payload if audio else json.dumps(payload).encode())
    header = bytes([0x11, 0x24 if audio else 0x14, 0x01 if audio else 0x11, 0])
    packet = header + struct.pack(">i", event)
    if session_id:
        encoded = session_id.encode()
        packet += struct.pack(">I", len(encoded)) + encoded
    return packet + struct.pack(">I", len(body)) + body

def doubao_parse(packet):
    if len(packet) < 8:
        raise ValueError("Invalid provider frame")
    kind, flags = packet[1] >> 4, packet[1] & 15
    offset = (packet[0] & 15) * 4
    if kind == 15:
        raise ValueError("Provider rejected session")
    if flags & 1:
        offset += 4
    event = 0
    if flags & 4:
        event = struct.unpack_from(">i", packet, offset)[0]
        offset += 4
        # All server events include connection ID or session ID.
        size = struct.unpack_from(">I", packet, offset)[0]
        offset += 4 + size
    size = struct.unpack_from(">I", packet, offset)[0]
    data = packet[offset + 4:offset + 4 + size]
    if packet[2] & 15 == 1:
        data = gzip.decompress(data)
    return event, data if kind == 11 else json.loads(data or b"{}")

class VoiceTransport:
    def __init__(self, channel, instructions, voice, defaults):
        self.channel, self.instructions = channel, instructions
        self.provider = channel["provider"]
        self.voice = voice or channel.get("voice") or defaults["voice"]
        self.model = channel.get("model") or defaults["model"]
        self.endpoint = channel.get("endpoint") or defaults["endpoint"]
        self.input_rate = defaults["input_rate"]
        self.session_id = str(uuid.uuid4())
        self.dialog_id = ""
        self.ws = None
        self.responding = False
        self.item_id = None
        self.active_response = None
        self.blocked_response = None
        self.doubao_restarting = False
        self.doubao_duplex = self.provider == "doubao" and (self.model == "1.2.6.1" or "/duplex/" in self.endpoint)
        self.doubao_muted = False
        self.doubao_session_created = False
        self.doubao_reading = False
        self.doubao_closed = asyncio.Event()
        self.doubao_next_audio_at = 0

    async def connect(self):
        # Imported lazily; the existing Portal can run without the demo dependency.
        from websockets.asyncio.client import connect
        key = self.channel["api_key"]
        headers = {"Authorization": "Bearer " + key}
        url = self.endpoint
        if self.provider == "qwen":
            if not self.model.startswith("qwen"):
                raise ProviderSetupError("demo_model_invalid")
            if self.model.startswith("qwen3.8-") and not url.endswith(".maas.aliyuncs.com/api-ws/v1/realtime"):
                raise ProviderSetupError("demo_qwen_workspace_required")
        if self.provider == "gemini":
            url += "?" + urlencode({"key": key})
            headers = {}
        elif self.provider in ("openai", "qwen", "grok"):
            url += "?" + urlencode({"model": self.model})
        elif self.provider == "doubao":
            if self.doubao_duplex and self.model != "1.2.6.1":
                raise ProviderSetupError("demo_model_invalid")
            auth = self.channel.get("doubao_auth", "auto")
            if auth == "api_key" or auth == "auto" and self.doubao_duplex:
                headers = {"X-Api-Key": key, "X-Api-Connect-Id": self.session_id}
            else:
                headers = {"X-Api-App-ID": self.channel["app_id"], "X-Api-Access-Key": key,
                       "X-Api-App-Key": "PlgvMymc7f3tQnJ6" if self.doubao_duplex else self.channel["app_key"],
                       "X-Api-Resource-Id": self.channel["resource_id"],
                       "X-Api-Connect-Id": str(uuid.uuid4())}
                if self.doubao_duplex:
                    headers["X-Api-Request-Id"] = str(uuid.uuid4())
        try:
            self.ws = await connect(url, additional_headers=headers, open_timeout=15, max_size=2**21,
                                    ping_interval=20, close_timeout=3, proxy=None)
        except Exception as error:
            status = getattr(getattr(error, "response", None), "status_code", None)
            code = {401: "demo_provider_auth", 403: "demo_provider_access", 404: "demo_model_invalid", 429: "demo_provider_quota"}.get(status, "demo_connection_failed")
            raise ProviderSetupError(code) from None
        if self.provider == "gemini":
            await self.send({"setup": {"model": "models/" + self.model.removeprefix("models/"),
                "generationConfig": {"responseModalities": ["AUDIO"], "speechConfig": {
                    "voiceConfig": {"prebuiltVoiceConfig": {"voiceName": self.voice}}}},
                "systemInstruction": {"parts": [{"text": self.instructions}]},
                "inputAudioTranscription": {}, "outputAudioTranscription": {}}})
        elif self.provider == "openai":
            await self.send({"type": "session.update", "session": {"type": "realtime", "instructions": self.instructions,
                "output_modalities": ["audio"], "audio": {
                    "input": {"format": {"type": "audio/pcm", "rate": 24000},
                              "transcription": {"model": "gpt-4o-mini-transcribe"},
                              "turn_detection": {"type": "server_vad", "interrupt_response": True}},
                    "output": {"voice": self.voice, "format": {"type": "audio/pcm", "rate": 24000}}}}})
        elif self.provider == "grok":
            await self.send({"type": "session.update", "session": {"instructions": self.instructions, "voice": self.voice,
                "turn_detection": {"type": "server_vad"},
                "audio": {"input": {"format": {"type": "audio/pcm", "rate": 24000}},
                          "output": {"format": {"type": "audio/pcm", "rate": 24000}}}}})
        elif self.provider == "qwen":
            await self.send({"type": "session.update", "session": {"instructions": self.instructions,
                "modalities": ["text", "audio"], "voice": self.voice, "input_audio_format": "pcm",
                "output_audio_format": "pcm", "turn_detection": {"type": "server_vad"},
                "input_audio_transcription": {"model": "qwen3-asr-flash-realtime"}}})
        elif self.doubao_duplex:
            await self.send({"type": "session.create", "session": {"model": self.model, "instructions": self.instructions,
                "audio": {"input": {"format": {"type": "pcm", "rate": 16000}},
                          "output": {"format": {"type": "pcm_s16le", "rate": 24000}, "voice": self.voice}}},
                "extension": {"dialog": {"extra": {"strict_audit": True}}, "extra": {"enable_proactive_speak": False}}})
        else:
            await self.ws.send(doubao_frame(1, {}))

    async def send(self, value):
        if self.doubao_duplex:
            value = {"event_id": str(uuid.uuid4()), **value}
        await self.ws.send(json.dumps(value))

    async def input(self, value):
        kind = value["type"]
        if kind == "interrupt":
            if self.provider == "gemini":
                # A new activity interrupts current generation in the Live API.
                await self.send({"realtimeInput": {"text": "Stop speaking. Wait for my next message."}})
            elif self.doubao_duplex:
                self.blocked_response = self.active_response
                await self.send({"type": "response.cancel"})
            elif self.provider == "doubao":
                # Finish/restart the provider session with its existing dialog ID.
                self.doubao_restarting = True
                await self.ws.send(doubao_frame(102, {}, self.session_id))
            elif self.responding:
                self.blocked_response = self.active_response
                await self.send({"type": "response.cancel"})
            if self.item_id and self.provider == "openai":
                await self.send({"type": "conversation.item.truncate", "item_id": self.item_id,
                                 "content_index": 0, "audio_end_ms": value.get("audio_end_ms", 0)})
            self.responding = False
            return
        if kind == "audio":
            if self.provider == "gemini":
                await self.send({"realtimeInput": {"audio": {"data": value["data"], "mimeType": "audio/pcm;rate=16000"}}})
            elif self.doubao_duplex:
                if self.doubao_muted:
                    await self.send({"type": "input_audio_unmute.commit"})
                    self.doubao_muted = False
                # Also pace older clients' 100 ms chunks as recommended 20 ms PCM16 frames.
                pcm = base64.b64decode(value["data"], validate=True)
                loop = asyncio.get_running_loop()
                for offset in range(0, len(pcm), 640):
                    delay = self.doubao_next_audio_at - loop.time()
                    if delay > 0:
                        await asyncio.sleep(delay)
                    chunk = pcm[offset:offset + 640]
                    await self.send({"type": "input_audio_buffer.append", "audio": base64.b64encode(chunk).decode()})
                    self.doubao_next_audio_at = loop.time() + len(chunk) / 32000
            elif self.provider == "doubao":
                await self.ws.send(doubao_frame(200, base64.b64decode(value["data"]), self.session_id, True))
            else:
                await self.send({"type": "input_audio_buffer.append", "audio": value["data"]})
        elif kind == "audio_end":
            if self.doubao_duplex and not self.doubao_muted:
                await self.send({"type": "input_audio_buffer.commit"})
                await self.send({"type": "input_audio_mute.commit"})
                self.doubao_muted = True
            elif self.provider == "gemini":
                await self.send({"realtimeInput": {"audioStreamEnd": True}})
            # Other providers run server VAD; no artificial empty commit.
        elif kind == "text":
            if self.doubao_duplex:
                # speech_text_buffer.commit is specified-text synthesis, not a user query.
                raise ValueError("Doubao full duplex accepts voice queries, not text chat")
            if self.provider == "gemini":
                await self.send({"realtimeInput": {"text": value["text"]}})
            elif self.provider == "doubao":
                await self.ws.send(doubao_frame(501, {"content": value["text"]}, self.session_id))
            else:
                await self.send({"type": "conversation.item.create", "item": {"type": "message", "role": "user",
                                "content": [{"type": "input_text", "text": value["text"]}]}})
                await self.send({"type": "response.create"})

    async def events(self):
        async for event in self._events():
            yield event

    async def _events(self):
        iterator = self.ws.__aiter__()
        while True:
            try:
                self.doubao_reading = True
                raw = await anext(iterator)
            except StopAsyncIteration:
                return
            finally:
                self.doubao_reading = False
            if self.provider == "doubao" and not self.doubao_duplex:
                event, payload = doubao_parse(raw)
                if event in (50, 152):
                    await self.ws.send(doubao_frame(100, {
                        "asr": {"audio_info": {"format": "pcm", "sample_rate": 16000, "channel": 1}},
                        "tts": {"speaker": self.voice, "audio_config": {"format": "pcm_s16le", "sample_rate": 24000, "channel": 1}},
                        "dialog": {"bot_name": "Kasamila", "system_role": self.instructions,
                                   "dialog_id": self.dialog_id, "extra": {"model": self.model}}}, self.session_id))
                elif event == 150:
                    self.doubao_restarting = False
                    self.dialog_id = payload.get("dialog_id", self.dialog_id)
                    yield {"type": "ready", "input_rate": self.input_rate}
                elif isinstance(payload, bytes):
                    if not self.doubao_restarting:
                        yield {"type": "audio", "data": base64.b64encode(payload).decode(), "sample_rate": 24000}
                elif event == 450:
                    yield {"type": "interrupted"}
                elif event == 451:
                    for result in payload.get("results", []):
                        if result.get("is_interim") is False:
                            yield {"type": "user_text", "text": result.get("text", "")}
                elif event == 550:
                    if not self.doubao_restarting:
                        yield {"type": "text", "delta": payload.get("content", "")}
                elif event == 359:
                    yield {"type": "done"}
                elif event in (51, 153, 599):
                    yield {"type": "error", "code": "provider_error"}
                continue
            message = json.loads(raw)
            if self.doubao_duplex:
                kind = message.get("type", "")
                if kind == "session.created":
                    self.dialog_id = message.get("session", {}).get("id", "")
                    self.doubao_session_created = True
                    await self.send({"type": "input_audio_mute.commit"})
                    self.doubao_muted = True
                    yield {"type": "ready", "input_rate": self.input_rate}
                    continue
                if kind == "session.closed":
                    self.doubao_closed.set()
                    return
                if kind in ("conversation.item.input_audio_transcription.started", "response.canceled"):
                    canceled = self.active_response
                    if kind == "response.canceled":
                        canceled = message.get("response_id") or self.blocked_response or self.active_response
                    self.blocked_response = canceled
                    if kind == "response.canceled" and canceled != self.active_response:
                        continue
                    self.responding = False
                    yield {"type": "interrupted"}
                    continue
                if kind == "response.output_audio.started":
                    response_id = message.get("response_id")
                    if response_id != self.blocked_response:
                        self.active_response = response_id
                        self.responding = True
                    continue
            if self.provider == "gemini":
                if "setupComplete" in message:
                    yield {"type": "ready", "input_rate": self.input_rate}
                body = message.get("serverContent", {})
                if body.get("interrupted"):
                    yield {"type": "interrupted"}
                for part in body.get("modelTurn", {}).get("parts", []):
                    audio = part.get("inlineData", {})
                    if audio.get("data"):
                        yield {"type": "audio", "data": audio["data"], "sample_rate": 24000}
                if body.get("outputTranscription", {}).get("text"):
                    yield {"type": "text", "delta": body["outputTranscription"]["text"]}
                if body.get("inputTranscription", {}).get("text"):
                    yield {"type": "user_text", "text": body["inputTranscription"]["text"]}
                if body.get("turnComplete"):
                    yield {"type": "done"}
                if "error" in message:
                    yield {"type": "error", "code": "provider_error"}
                continue
            kind = message.get("type", "")
            response_id = message.get("response_id") or message.get("response", {}).get("id")
            if self.blocked_response and response_id == self.blocked_response and kind.startswith("response."):
                continue
            if kind == "session.updated":
                if not self.doubao_duplex:
                    yield {"type": "ready", "input_rate": self.input_rate}
            elif kind in ("response.audio.delta", "response.output_audio.delta"):
                self.item_id = message.get("item_id", self.item_id)
                yield {"type": "audio", "data": message["delta"], "sample_rate": 24000}
            elif kind in ("response.audio_transcript.delta", "response.output_audio_transcript.delta", "response.text.delta", "response.output_text.delta"):
                if self.doubao_duplex:
                    self.active_response = response_id
                    self.responding = True
                yield {"type": "text", "delta": message.get("delta", "")}
            elif kind == "conversation.item.input_audio_transcription.completed":
                yield {"type": "user_text", "text": message.get("transcript") or message.get("text", "")}
            elif kind == "input_audio_buffer.speech_started":
                self.blocked_response = self.active_response
                self.responding = False
                yield {"type": "interrupted"}
            elif kind == "response.created":
                self.active_response = message.get("response", {}).get("id")
                self.item_id = None
                self.responding = True
            elif kind == "response.done":
                self.responding = False
                if message.get("response", {}).get("status") == "failed":
                    yield {"type": "error", "code": "provider_error"}
                else:
                    yield {"type": "done"}
            elif kind == "error":
                yield {"type": "error", "code": "provider_error"}

    async def close(self):
        if self.ws:
            if self.doubao_duplex and self.doubao_session_created and not self.doubao_closed.is_set():
                try:
                    await self.send({"type": "session.close"})
                    async with asyncio.timeout(3):
                        if self.doubao_reading:
                            await self.doubao_closed.wait()
                        else:
                            while not self.doubao_closed.is_set():
                                message = json.loads(await self.ws.recv())
                                if message.get("type") == "session.closed":
                                    self.doubao_closed.set()
                except Exception:
                    pass
            await self.ws.close()
