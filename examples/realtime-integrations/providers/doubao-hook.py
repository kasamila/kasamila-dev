"""Hook the DECODED output of the official Doubao realtime WebSocket demo.

Do not pass binary protocol packets, gzip data, MP3/Opus or float32 to PCM16.
Configure official session TTS output as mono, pcm_s16le, 24000 Hz.
Call audio() for decoded TTS payload and interrupt() for the ASR/barge-in event.
This bridge intentionally delegates provider authentication/framing to the
official demo rather than claiming its binary protocol is OpenAI compatible.
"""
import base64
import json
import os
import math
import struct
from urllib.request import Request, urlopen


class KasamilaBridge:
    def __init__(self):
        self.url = os.environ.get("BRIDGE_URL", "http://127.0.0.1:8790/api/bridge")
        self.secret = os.environ["BRIDGE_SECRET"]
        # Obtain the channel shown on the browser page after it connects.
        self.channel = os.environ["BRIDGE_CHANNEL"]

    def _send(self, event):
        request = Request(self.url, data=json.dumps({
            "channel": self.channel, **event,
        }).encode(), headers={
            "Content-Type": "application/json",
            "Authorization": "Bearer " + self.secret,
        }, method="POST")
        with urlopen(request, timeout=5) as response:
            if response.status != 204:
                raise RuntimeError("Browser audio bridge unavailable")

    def audio(self, decoded_pcm16, sample_rate=24000):
        if len(decoded_pcm16) % 2:
            raise ValueError("PCM16 byte count must be even")
        self._send({"type": "audio", "audio": base64.b64encode(decoded_pcm16).decode(),
                    "sampleRate": sample_rate})

    def interrupt(self):
        self._send({"type": "interrupt"})

    def audio_float32(self, decoded_float32_le, sample_rate=24000):
        """Explicit conversion only when official decoder declares mono f32le."""
        if len(decoded_float32_le) % 4:
            raise ValueError("Float32 byte count must be divisible by four")
        values = []
        for (value,) in struct.iter_unpack("<f", decoded_float32_le):
            if not math.isfinite(value):
                raise ValueError("Invalid float32 audio sample")
            value = max(-1.0, min(1.0, value))
            values.append(round(value * (32768 if value < 0 else 32767)))
        self.audio(struct.pack("<" + "h" * len(values), *values), sample_rate)

    def microphone(self, pcm16):
        # SDK microphone worklet sends 16kHz PCM to the local bridge input.
        # Pull on a dedicated thread/async task, then send using official demo.
        request = Request(self.url + "/input?channel=" + self.channel,
                          headers={"Authorization": "Bearer " + self.secret})
        with urlopen(request, timeout=25) as response:
            for line in response:
                event = json.loads(line)
                pcm16(base64.b64decode(event["audio"]), event["sampleRate"])
