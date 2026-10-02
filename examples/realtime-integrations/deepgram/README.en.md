[English](README.en.md) | [简体中文](README.md)

# Deepgram Voice Agent + Kasamila SDK 2.1.0

Select backend PROVIDER=deepgram, configure DEEPGRAM_API_KEY and the shared Kasamila template/media settings.

16k input / 24k reply, SettingsApplied and UserStartedSpeaking.

In the parent directory run npm ci, copy .env.example to .env and npm start. Read the [platform guide](../voice-platforms/README.en.md) for wire formats, timing, interruption, termination/billing, security and acceptance. Reuse the [livestream host](../obs-streamlabs/README.en.md).

Entry points: [server adapter](../providers/voice-platforms.mjs), [browser client](../public/voice-app.mjs). npm test makes no paid calls and is not credentialed vendor certification. License: [Apache-2.0](../../../LICENSE). Offline review: 2026-10-02.
