[简体中文](README.md) | [English](README.en.md)

# TEN Framework + Kasamila SDK 2.1.0

方式：PCM。[公共初始化与计费生命周期](../README.md)。

先按官方 websocket-example 说明启动 TEN 图和语音供应商。此示例设置 `PROVIDER=ten`、`TEN_WS_URL` 后运行公共本地界面。上行是 16kHz 单声道 PCM16；下行按照 metadata 采样率读取，不猜测。

抢话必须从图的 VAD/main_control 发送下列**自定义应用命令**，不是宣称 TEN 自动具备的内置事件；将它路由到 websocket_server，浏览器才能清除旧音频。平台密钥仍放 TEN 服务端。

## 代码与详细步骤

Start the official TEN websocket-example using its own README and provider environment configuration. In this suite set `PROVIDER=ten` and `TEN_WS_URL` to that graph's WebSocket server, then run the [local starter](../README.en.md).

Microphone input is mono PCM16 at 16 kHz. Output messages must be `{type:"audio",audio:"base64",metadata:{sample_rate:16000,channels:1,bytes_per_sample:2}}`; other rates are read from metadata, not assumed. Configure the TTS extension accordingly.

For barge-in, wire your graph's VAD/main_control to send this **custom application command** to websocket_server:
```json
{"type":"cmd","name":"kasamila_interrupt"}
```
This command is not claimed to be a built-in TEN event. It must be added to your graph's output route. It clears the browser PCM reader and stale audio. Keep provider credentials in the TEN backend.

协议来源：[TEN Framework 官方资料](https://github.com/TEN-framework/ten-framework/tree/main/ai_agents/agents/examples/websocket-example)。核对日期：2026-09-27；实际模型/账号权限需开发者确认。协议测试不等于付费云端验收。
