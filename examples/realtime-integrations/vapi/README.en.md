[English](README.en.md) | [简体中文](README.md)

# Vapi existing assistant + Kasamila SDK 2.1.0

Select backend PROVIDER=vapi, configure VAPI_API_KEY, VAPI_ASSISTANT_ID and the shared Kasamila template/media settings.

Keep your existing Assistant ID. Binary PCM websocket call; GPT-Live needs VAPI_SAMPLE_RATE=24000.

In the parent directory run npm ci, copy .env.example to .env and npm start. Read the [platform guide](../voice-platforms/README.en.md) for wire formats, timing, interruption, termination/billing, security and acceptance. Reuse the [livestream host](../obs-streamlabs/README.en.md).

Entry points: [server adapter](../providers/voice-platforms.mjs), [browser client](../public/voice-app.mjs). npm test makes no paid calls and is not credentialed vendor certification. License: [Apache-2.0](../../../LICENSE). Offline review: 2026-10-02.
