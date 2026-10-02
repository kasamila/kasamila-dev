[简体中文](README.md) | [English](README.en.md)

# Thirteen voice integrations and a livestream host · Kasamila SDK 2.1.0

New [Grok / ElevenLabs / Vapi / Deepgram / Hume / Dify adapters](voice-platforms/README.en.md), plus a reusable [OBS / Streamlabs host](obs-streamlabs/README.en.md). Video-call UI: `/public/video-call.html`; host controller: `/public/studio.html`. Additional PROVIDER values: `grok|elevenlabs|vapi|deepgram|hume|dify`; backend setup is in `.env.example`.

This suite contains a local microphone-to-provider-to-avatar starter for OpenAI, Gemini, Qwen and TEN, browser RTC adapters for existing LiveKit/Pipecat agents, and a callback bridge for the official Doubao realtime demo. It does **not** host an LLM, speech service or agent framework for you.

## Start the local PCM demo

Requires Node.js 22+, Chrome/Edge or a browser with AudioWorklet, a Kasamila geometry template, its **matching** caller-hosted HLS descriptor, a Kasamila API Key and the selected provider credentials.

```bash
cd examples/realtime-integrations
npm ci
cp .env.example .env
# Fill server-only values in .env. Use your template's actual timeline and media.
npm start
# Open http://127.0.0.1:8790, then click Start and allow the microphone.
```

Pick `PROVIDER=openai|gemini|qwen|ten|bridge`. Model and region availability depend on your provider account. Gemini requires an explicit model ID; the example never silently substitutes a model. Qwen targets the Qwen3-Omni Flash realtime schema, not the different Qwen3.5 schema. For TEN, start your existing official websocket-example graph first.

The user microphone goes only to the speech provider. Only the **assistant's output** drives Kasamila. The SDK plays the output and derives mouth motion from the same audio clock. Do not play the same output through another audio element. PCM means raw mono signed little-endian PCM16, not WAV headers, MP3, Opus or float32.

## Integrations

- [LiveKit Agents](livekit/README.en.md): subscribe to the exact agent's audio track.
- [Pipecat](pipecat/README.en.md): select `client.tracks().bot.audio`.
- [TEN Framework](ten/README.en.md): normalize WebSocket audio metadata.
- [OpenAI Realtime](openai/README.en.md): GA output-audio events and 24 kHz PCM.
- [Gemini Live](gemini/README.en.md): consume all audio parts; clear interrupted turns.
- [Qwen-Omni-Realtime](qwen/README.en.md): Qwen-specific events and regional credentials.
- [Doubao realtime voice](doubao/README.en.md): decoded official-demo audio plus microphone callback.

## Kasamila contract and lifecycle

The example backend creates `POST /api/v1/runtime/sessions` with SDK 2.1.0 pinned, `pcm_stream` and `rtc` input modes, the real browser Origin and protection capabilities. It forwards the returned `sdk` and `client_token` without rewriting them. The browser loads the official Bootstrap and supplies `templateMedia`; authorization/decryption is automatic. No customer backend needs Kasamila's encryption key.

Existing geometry models, original/packed-matte HLS and media hosting remain unchanged. Use `KASAMILA_OUTPUT_MODE=transparent` with the matching packed-matte descriptor for transparent avatars.

`stop()` stops sound but does not stop Runtime billing. End/disconnect must call `destroy()` or the authorized session-end API. The sample releases on errors/disconnect/pagehide and limits each local session to ten minutes. If an entire browser/server process crashes, the normal lease expiry still applies; never promise immediate zero billing without a confirmed end request.

## Production hardening

The starter binds **only to loopback**. It is not a public gateway. Add your own login, avatar authorization, rate/concurrency limits, HTTPS/WSS, provider session expiry/reconnect policy and per-user isolation before publishing. Never expose permanent Kasamila/provider keys or the local bridge secret to a browser. Do not log Tokens, signed media URLs or provider authentication headers.

The audio sink paces PCM bursts; the browser limits pending provider audio to five seconds and terminates on overflow rather than retaining minutes of queued speech. Interruptions invalidate queued turns and abort the old PCM reader before stopping the audio worklet. Do not open a new PCM reader per chunk. A model that generates very large audio chunks may require upstream chunk splitting.

CSP must allow Kasamila's SDK/API and your HLS host, WebSocket relay, blob Workers/WASM and microphone AudioWorklet. Autoplay/microphone still require user permission/gesture. Framework audio track playout should have exactly one owner.

## Validation status

Automated tests cover event mapping, little-endian decoding, PCM reader cancellation, queue overflow and correct RTC speaker filtering, without cloud calls. They are **not** a claim of credentialed seven-provider end-to-end certification. Run your own acceptance: two languages, ten conversational turns, barge-in, provider disconnect, denied microphone, expired Token, idle, seek/loop, transparent media and 20-minute mobile soak.

```bash
npm test
```

The example source is covered by the repository's [Apache-2.0 license](../../LICENSE). Provider SDKs/services retain their own licenses and terms. Last local validation: 2026-09-27.
