[简体中文](README.md) | [English](README.en.md)

# Qwen-Omni-Realtime + Kasamila SDK 2.1.0

方式：PCM。[公共初始化与计费生命周期](../README.md)。

使用 `PROVIDER=qwen`、服务端 DashScope Key、与 Key 区域一致的 WebSocket 地址和 `qwen3-omni-flash-realtime` 模型，运行公共示例。这里明确针对 Qwen3-Omni Flash 旧会话格式，上行16kHz、下行24kHz，事件是 `response.audio.delta`，与 OpenAI GA 不同。

不能只更改模型名就换成 Qwen3.5；它的嵌套 audio/session 格式需相应改写并核对实际采样率。区域/工作空间/模型权限错误应在平台侧处理，不应更换 Kasamila Token 试图解决。

国内/国际地址、Workspace 与 Key 必须属于同一区域。适配器为 `providers/qwen.mjs`；鉴权失败请核对服务端 Key 和模型开通情况。不要将 OpenAI 的 GA session.update 原样发给 Qwen。

## 验收

请验证多轮对话、用户抢话、平台断开、Token 到期和关闭时 Runtime 释放。密钥仅存服务端；样例协议测试不等于真实付费平台验收。

协议来源：[Qwen-Omni-Realtime 官方资料](https://www.alibabacloud.com/help/en/model-studio/realtime)。核对日期：2026-09-27；实际模型/账号权限需开发者确认。
