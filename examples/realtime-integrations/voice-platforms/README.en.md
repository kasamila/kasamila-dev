[English](README.en.md) | [简体中文](README.md)

# Six more voice platforms, one avatar audio path

These runnable adapters extend the existing seven integrations. They relay agent reply audio to the official Kasamila SDK 2.1.0; they do not copy the rendering core, replace your agent or send user microphone audio to mouth inference.

## Quick start

```bash
cd examples/realtime-integrations
npm ci
cp .env.example .env
# Configure backend-only credentials and your real canonical media descriptor.
npm start
```

Open `http://127.0.0.1:8790`. Click Start to unlock audio and permit the microphone. Select ONE provider per server process. The SDK is the only speaker: do not also play provider audio through another SDK/audio element.

| PROVIDER | Backend configuration | Wire audio / turn handling |
| --- | --- | --- |
| grok | XAI_API_KEY; optional XAI_VOICE | 24 kHz mono PCM16; xAI session schema, server VAD, response.cancel |
| elevenlabs | ELEVENLABS_API_KEY, ELEVENLABS_AGENT_ID | Server obtains signed conversation URL; negotiated pcm_* input/output; ping/pong and interruption |
| vapi | VAPI_API_KEY, VAPI_ASSISTANT_ID | Existing assistantId in POST /call; raw binary duplex PCM16; default 16 kHz, GPT-Live requires VAPI_SAMPLE_RATE=24000 |
| deepgram | DEEPGRAM_API_KEY | SettingsApplied before input; 16 kHz input / 24 kHz output; KeepAlive, UserStartedSpeaking |
| hume | HUME_API_KEY, HUME_SECRET_KEY, HUME_CONFIG_ID | Backend temporary OAuth token; 16 kHz raw input; complete WAV replies decoded and queued |
| dify | DIFY_API_KEY; optional DIFY_API_BASE | Existing Chat/Chatflow knowledge base → STT → streamed answer → TTS → avatar; 16 kHz push-to-talk |

### Grok Voice Agent

Set `PROVIDER=grok`. The adapter uses xAI's own `session.update` schema, not OpenAI GA's shape. Actual `response.output_audio.delta` / `response.audio.delta` replies are PCM; cancelled response IDs are dropped. Model, voice and account availability remain provider-controlled.

### ElevenLabs: a visual customer-service call

Set `PROVIDER=elevenlabs` and use an existing Agent ID with your service instructions, tools and knowledge base. Configure PCM input/output; MP3/ulaw negotiation fails closed. The server exchanges your key for a signed URL and keeps BOTH server-side. The browser only sees agent reply audio, a short Kasamila session capability and required SDK/media descriptors.

Open `http://127.0.0.1:8790/public/video-call.html`. Start the call, speak, interrupt, and End. The optional caller camera is local-only; this is an AI video-call-style service UI, not a human-to-human WebRTC call or a telephone/PSTN integration. Tool authorization, human escalation, consent and CRM integration belong to your ElevenLabs agent/application.

### Vapi: keep your existing assistant

Set `PROVIDER=vapi` and the existing `VAPI_ASSISTANT_ID`. No replacement assistant is created. The backend requests a websocket transport call, forwards raw binary PCM and uses the returned, validated monitor control URL to end the call. For GPT-Live set `VAPI_SAMPLE_RATE=24000`; never relabel 16 kHz samples as 24 kHz. Test your configured assistant's transport and turn behaviour before release.

### Deepgram Voice Agent

Set `PROVIDER=deepgram`. Configure optional `DEEPGRAM_STT_MODEL`, `DEEPGRAM_LLM_MODEL`, `DEEPGRAM_TTS_MODEL`, `AGENT_LANGUAGE`, `AGENT_INSTRUCTIONS` for models actually enabled in your account. Settings acceptance gates microphone delivery. UserStartedSpeaking clears local playback; a timer sends KeepAlive and is removed on close.

### Hume EVI

Set `PROVIDER=hume` and an existing EVI Config ID. The input is headerless PCM16 described by session_settings; replies are COMPLETE WAV files, not raw PCM. The browser decodes bounded complete files before sending samples to the same avatar sink. Neither RIFF headers nor arbitrary compressed fragments are fed into PCM inference. Replies are limited to 30 seconds and the four-file queue; interruptions invalidate queued turns.

### Dify: retain your knowledge base

Set `PROVIDER=dify`, `DIFY_API_KEY` for the existing Chat/Chatflow app, and enable that app's speech-to-text and text-to-speech. Required app inputs must be added to the adapter's server-owned `inputs` object if your flow defines them. This starter uses empty inputs; Workflow-only `/workflows/run` apps are not Chat apps.

Click Record, speak (at most 15 seconds), then Send recording. Or send typed text. A WAV multipart upload reaches `/audio-to-text`; `/chat-messages` retains conversation_id and a unique per-session user; `/text-to-audio` returns a complete encoded file decoded by the browser. This is push-to-talk, NOT claimed full-duplex real-time speech. Each operation has a 60-second bound; interruption aborts pending HTTP work and drops stale speech. Configure short spoken answers (<=30 seconds) in your app.

## Interrupt is not universally an upstream cancellation command

The manual button always flushes the local avatar queue. Grok sends its supported response.cancel; Dify aborts local requests. ElevenLabs, Hume, Deepgram and Vapi automatic barge-in follows their actual user-speech events. The starter does NOT invent a generic cancel command or promise manual mute stopped provider generation/billing. End closes the provider transport, ends a Vapi call where its control URL is available, destroys the avatar and calls authorized Runtime termination. A failed end request is reported, not labelled confirmed success. Abrupt process/machine failure still depends on lease expiry and provider policies.

## Acceptance and security

This loopback starter is not a public multi-tenant gateway. Add login, user/template authorization, HTTPS/WSS, quotas, CSP, redacted logs and provider-specific retry policy before publishing it. Never expose permanent keys or signed provider URLs. Do not grant caller audio automatic tool privileges.

Run `npm test` for mocked contracts, queues, interrupts and lifecycle. Paid credentialed cloud calls, actual OBS/Streamlabs installation, devices and language behaviour require your own end-to-end acceptance. Support here means implemented sample adapters, not vendor certification or guaranteed phoneme accuracy.

## Official protocol references (reviewed 2026-10-02)

- [xAI Voice Agent](https://docs.x.ai/developers/model-capabilities/audio/voice-agent)
- [ElevenLabs WebSocket](https://elevenlabs.io/docs/eleven-agents/api-reference/eleven-agents/websocket), [signed URL](https://elevenlabs.io/docs/api-reference/conversations/get-signed-url)
- [Vapi websocket transport](https://docs.vapi.ai/calls/websocket-transport), [GPT-Live configuration](https://docs.vapi.ai/gpt-live/configuration)
- [Deepgram settings](https://developers.deepgram.com/docs/voice-agent-settings), [barge-in](https://developers.deepgram.com/docs/voice-agent-user-started-speaking)
- [Hume audio](https://dev.hume.ai/docs/speech-to-speech-evi/guides/audio), [authentication](https://dev.hume.ai/docs/introduction/api-key)
- [Dify API](https://docs.dify.ai/en/api-reference/guides/get-started), [official audio endpoint implementation](https://github.com/langgenius/dify/blob/main/api/controllers/service_api/app/audio.py)

[Reusable OBS / Streamlabs host](../obs-streamlabs/README.en.md)
