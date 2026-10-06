# Realtime avatar chat

[English](README.en.md) | [简体中文](README.md)

The anonymous [Kasamila application demo](https://www.kasamila.com/portal/apps) uses the existing SDK 2.1 and the PCM bridge from `audio-bridge`. This example adds text input/transcripts, microphone PCM, provider adapters and interruption. It changes no SDK code, geometry inference or mouth rendering. YouTube/Twitch and commerce cards on the website are upcoming scenarios.

## Run locally

Use Python 3.11+, a browser supporting AudioWorklet, HTTPS or localhost, and a supported Kasamila template. In this folder:

```sh
python -m venv .venv
# Activate your virtual environment, then:
python -m pip install -r requirements.txt
# Set the environment variables listed in .env.example securely in your shell.
python -m uvicorn server:app --host 127.0.0.1 --port 8792
```

Open `http://127.0.0.1:8792/portal/apps/chat`. Add this Origin to your dedicated Kasamila Runtime Key. Configure `KASAMILA_MEDIA_DESCRIPTOR` with your customer-hosted HLS descriptor, following `../geometry-runtime-web`. Runtime time and concurrency are charged to your account. This example does not read `.env` automatically; use your deployment's secure environment loader. Never commit credentials.

Choose `VOICE_PROVIDER`: `openai`, `gemini`, `qwen`, `grok` or `doubao`. Set `VOICE_API_KEY`; optionally set `VOICE_MODEL`, `VOICE_NAME`, `VOICE_ENDPOINT` and `AGENT_INSTRUCTIONS`. Doubao also needs `DOUBAO_APP_ID` and `DOUBAO_APP_KEY`; request mono `pcm_s16le` output, not default float32/Opus. Account permissions, supported model names and voices depend on each provider. These adapters have protocol tests; live provider validation requires your own enabled account.

## Data flow and controls

Browser microphone audio goes to the application server and the selected AI service. Returned mono PCM16 at 24 kHz drives `setPcmStream` through the existing PCM bridge. Microphone input is 24 kHz for OpenAI/Grok and 16 kHz for Gemini/Qwen/Doubao. Only AI output drives the avatar. Responses also appear as text; mute the voice for a text conversation. Server VAD supports automatic interruption. The interrupt button stops playback and cancels the provider response. Gemini receives a stop-speaking instruction; Doubao restarts the session with the same dialog ID. These provider-specific behaviors need live acceptance tests.

Permanent provider and Runtime keys stay on the server. Browser tickets are single-use; they are sent in the first WebSocket frame, not a URL. The local example closes sessions after three minutes and calls Runtime `sessions/end`. Page unload destroys the SDK player. The example does not persist conversations; each AI provider has its own retention policy. Avoid sensitive data.

This loopback starter does not include public-hosting abuse controls or a credential-management UI. The website implementation provides Admin-only encrypted settings, published-public-avatar allowlists, per-IP request limits and dedicated Runtime Key concurrency limits. Add equivalent controls before exposing this starter to the Internet. Review model prompts and guardrails for your scenario; prompts do not guarantee content filtering.

## Official protocol references

- [OpenAI Realtime events](https://developers.openai.com/api/reference/resources/realtime/client-events)
- [Gemini Live WebSocket](https://ai.google.dev/gemini-api/docs/live-api/get-started-websocket)
- [Qwen Realtime events](https://www.alibabacloud.com/help/en/model-studio/client-events)
- [Grok voice](https://docs.x.ai/developers/model-capabilities/audio/speech-to-speech)
- [Doubao realtime protocol](https://www.volcengine.com/docs/6561/1594356)
