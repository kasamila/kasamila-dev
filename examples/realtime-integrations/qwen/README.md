[简体中文](README.md) | [English](README.en.md)

# Qwen-Omni-Realtime + Kasamila SDK 2.1.0

方式：PCM。[公共初始化与计费生命周期](../README.md)。

使用 `PROVIDER=qwen`、服务端 DashScope Key、与 Key 区域一致的 WebSocket 地址和 `qwen3-omni-flash-realtime` 模型，运行公共示例。这里明确针对 Qwen3-Omni Flash 旧会话格式，上行16kHz、下行24kHz，事件是 `response.audio.delta`，与 OpenAI GA 不同。

不能只更改模型名就换成 Qwen3.5；它的嵌套 audio/session 格式需相应改写并核对实际采样率。区域/工作空间/模型权限错误应在平台侧处理，不应更换 Kasamila Token 试图解决。

## 代码与详细步骤

Set `PROVIDER=qwen`, `DASHSCOPE_API_KEY`, `QWEN_REALTIME_MODEL=qwen3-omni-flash-realtime` and the endpoint matching the Key's region in `QWEN_WS_URL`. Run the [local starter](../README.en.md). This example explicitly targets the Qwen3-Omni Flash legacy session schema.

Input is 16 kHz mono PCM16. The Qwen adapter uses `response.audio.delta` and 24 kHz output, not OpenAI GA's event name. Speech-start clears queued replies. See [qwen.mjs](../providers/qwen.mjs).

Do not change the model to Qwen3.5-Omni without implementing its newer nested audio/session schema and checking negotiated output format. Region/Workspace IDs and access rights must match the configured URL; authentication failures are not fixed by changing Kasamila Tokens.

协议来源：[Qwen-Omni-Realtime 官方资料](https://www.alibabacloud.com/help/en/model-studio/realtime)。核对日期：2026-09-27；实际模型/账号权限需开发者确认。协议测试不等于付费云端验收。
