[简体中文](README.md) | [English](README.en.md)

# TEN Framework + Kasamila SDK 2.1.0

Integration path: PCM. [Shared setup and lifecycle](../README.en.md).

Start the official TEN websocket-example using its own README and provider environment configuration. In this suite set `PROVIDER=ten` and `TEN_WS_URL` to that graph's WebSocket server, then run the [local starter](../README.en.md).

Microphone input is mono PCM16 at 16 kHz. Output messages must be `{type:"audio",audio:"base64",metadata:{sample_rate:16000,channels:1,bytes_per_sample:2}}`; other rates are read from metadata, not assumed. Configure the TTS extension accordingly.

For barge-in, wire your graph's VAD/main_control to send this **custom application command** to websocket_server:
```json
{"type":"cmd","name":"kasamila_interrupt"}
```
This command is not claimed to be a built-in TEN event. It must be added to your graph's output route. It clears the browser PCM reader and stale audio. Keep provider credentials in the TEN backend.

Protocol reference: [Official TEN Framework documentation](https://github.com/TEN-framework/ten-framework/tree/main/ai_agents/agents/examples/websocket-example). Checked 2026-09-27; account/model availability must be verified by you. Synthetic contract tests are not paid provider acceptance.
