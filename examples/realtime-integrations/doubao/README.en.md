[简体中文](README.md) | [English](README.en.md)

# Doubao realtime voice + Kasamila SDK 2.1.0

Integration path: PCM hook. [Shared setup and lifecycle](../README.en.md).

Download and run the **official** end-to-end realtime voice demo linked by Volcengine's documentation. Keep its authentication, connection/session lifecycle and binary framing; this suite does not invent or duplicate those internals.

1. Configure that demo's TTS output to mono **pcm_s16le / 24000 Hz**. Default pcm/float32 output is NOT interchangeable.
2. Set this starter's `PROVIDER=bridge` and a private random `BRIDGE_SECRET` of at least 24 characters. Run it locally, click Start and copy its channel into the official demo process's `BRIDGE_CHANNEL`.
3. Supply the same `BRIDGE_SECRET` and `BRIDGE_URL=http://127.0.0.1:8790/api/bridge` to that process.
4. Add [doubao-hook.py](../providers/doubao-hook.py) to your demo's module path:
```python
# Rename doubao-hook.py to kasamila_bridge.py in your local demo integration.
from kasamila_bridge import KasamilaBridge
bridge = KasamilaBridge()
# In the official decoder's TTS callback:
bridge.audio(decoded_pcm16_bytes, sample_rate=24000)
# In its ASR/barge-in callback:
bridge.interrupt()
# In a dedicated input thread, feed browser microphone into official transport:
bridge.microphone(lambda pcm, rate: official_send_audio(pcm))
# official_send_audio is YOUR demo's existing audio-input function, not a new API.
```

Disable the official demo's local speaker output to avoid duplicate voices. The HTTP hook routes a specific browser channel; it cannot broadcast one user's audio to all sessions. Run the official input-reader in a dedicated thread; do not block its output callback loop. For production, replace loopback with your authenticated per-user relay.

**Boundary:** official credentials and binary session negotiation are delegated to the vendor demo, not included here. The mapping helper is covered by local bridge tests; paid provider E2E is pending.

If the official decoder declares mono little-endian float32 output, call
```python
bridge.audio_float32(decoded_float32_bytes, sample_rate=24000)
```
instead of labeling those bytes PCM16. The explicit converter rejects NaN and malformed data. Use the actual decoder metadata; never guess the format from byte length.

Protocol reference: [Official Doubao realtime voice documentation](https://www.volcengine.com/docs/6561/1594356). Checked 2026-09-27; account/model availability must be verified by you. Synthetic contract tests are not paid provider acceptance.
