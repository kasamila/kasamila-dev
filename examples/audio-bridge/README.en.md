# Kasamila PCM / RTC audio bridge

This is a provider-neutral integration foundation, **not** a complete Gemini, OpenAI, LiveKit or Pipecat adapter.
Its contract tests target Web SDK 2.1.0 `setPcmStream`, `setMediaStreamTrack`, `stop` and `destroy`.

[Bridge source](https://github.com/kasamila/kasamila-dev/blob/main/examples/audio-bridge/bridge.mjs) · [Runtime guide](https://github.com/kasamila/kasamila-dev/blob/main/docs/api_v1_runtime_integration_guide.en.md)

## Preconditions

Your backend holds the permanent Key, authorizes the end user/template and creates an Origin-bound short-lived Runtime Token. The browser initializes an SDK player.
Authorize `pcm_stream` or `rtc` as appropriate. Keep permanent and provider Keys out of the frontend. Supply the Agent's returned voice, not your user's microphone.

```javascript
import { drivePcm, connectRemoteAudio, endRuntime } from "./bridge.mjs";
// Mono PCM16. Use the provider's ACTUAL rate; do not always assume 16 kHz.
const audio = drivePcm(player, { sampleRate: 24000, maxQueuedMs: 2000 });
audio.push(new Int16Array([0, 100, -100]));
audio.close();
await audio.finished;
// Alternatively, supply an existing remote RTC audio MediaStreamTrack.
const disconnect = await connectRemoteAudio(player, remoteTrack);
disconnect(); // Stops audio only; the Runtime still runs and is billed.
await endRuntime(player); // End on exit or deliberate idle suspension.
```

## Buffering and interruption

The PCM source copies inputs to avoid shared-buffer mutation. Queue overflow is an explicit error: pause the upstream producer or abort/reconnect, never silently discard speech frames.
The source buffer limit is not the SDK playback-queue limit. Send live chunks at real-time pace; do not inject a whole long recording at once.

Opus, MP3, AAC and base64 strings are not PCM. Decode them first; convert byte PCM16 with the actual byte order. On interruption call `abort()`, handle the rejected `finished` result and create a new source. Do not reuse a closed stream.
Do not separately play the same remote RTC track, or audio will be duplicated.

## Platform acceptance

- For realtime Gemini/GPT output, verify actual transport, decoding, sample rate and interruption events before selecting PCM or RTC.
- For LiveKit/Pipecat, verify the browser remote track, framework events and pinned dependencies.
- Record API/SDK versions, startup steps, evidence, validation date and license.
- Do not label a provider adapter production-verified without a credentialed end-to-end test.

## Local test

Node.js 18+:

```bash
node --test examples/audio-bridge/bridge.test.mjs
```

Run from the repository root. These tests do not call production or create billed Sessions.
`stop()` and `disconnect()` do not end billing. `destroy()` ends Runtime; authorize a fresh Session and recreate the player when the user returns.
