[简体中文](README.md) | [English](README.en.md)

# Google Gemini Live API + Kasamila SDK 2.1.0

Integration path: PCM. [Shared setup and lifecycle](../README.en.md).

Set `PROVIDER=gemini`, server-only `GEMINI_API_KEY` and **explicit** `GEMINI_LIVE_MODEL` from your account's model catalogue. Run the [local starter](../README.en.md). The relay uses `@google/genai`; input is 16 kHz mono PCM16, output typically 24 kHz with the actual rate parsed from MIME metadata.

The adapter iterates every `serverContent.modelTurn.parts` entry; it does not read only the first part or confuse text/images with audio. `serverContent.interrupted` invalidates the previous reply. See [gemini.mjs](../providers/gemini.mjs).

If your Live session ends or emits go-away, end the Kasamila player and reacquire both sessions through your backend. Automatic Gemini session resumption is not implemented by this starter. Never use a permanent Google Key in a public browser.

Protocol reference: [Official Google Gemini Live API documentation](https://ai.google.dev/gemini-api/docs/live-api/capabilities). Checked 2026-09-27; account/model availability must be verified by you. Synthetic contract tests are not paid provider acceptance.
