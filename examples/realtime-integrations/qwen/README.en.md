[简体中文](README.md) | [English](README.en.md)

# Qwen-Omni-Realtime + Kasamila SDK 2.1.0

Integration path: PCM. [Shared setup and lifecycle](../README.en.md).

Set `PROVIDER=qwen`, `DASHSCOPE_API_KEY`, `QWEN_REALTIME_MODEL=qwen3-omni-flash-realtime` and the endpoint matching the Key's region in `QWEN_WS_URL`. Run the [local starter](../README.en.md). This example explicitly targets the Qwen3-Omni Flash legacy session schema.

Input is 16 kHz mono PCM16. The Qwen adapter uses `response.audio.delta` and 24 kHz output, not OpenAI GA's event name. Speech-start clears queued replies. See [qwen.mjs](../providers/qwen.mjs).

Do not change the model to Qwen3.5-Omni without implementing its newer nested audio/session schema and checking negotiated output format. Region/Workspace IDs and access rights must match the configured URL; authentication failures are not fixed by changing Kasamila Tokens.

Protocol reference: [Official Qwen-Omni-Realtime documentation](https://www.alibabacloud.com/help/en/model-studio/realtime). Checked 2026-09-27; account/model availability must be verified by you. Synthetic contract tests are not paid provider acceptance.
