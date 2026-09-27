[简体中文](README.md) | [English](README.en.md)

# OpenAI Realtime API + Kasamila SDK 2.1.0

方式：PCM。[公共初始化与计费生命周期](../README.md)。

配置 `PROVIDER=openai`、后端 `OPENAI_API_KEY` 和账户可用的 `OPENAI_REALTIME_MODEL`，运行本地示例。示例使用 GA 会话格式、24kHz PCM 和 `response.output_audio.delta`，不是旧 beta 的音频事件。

如果已有 OpenAI WebRTC 应用，可直接将 ontrack 音轨给 `player.setMediaStreamTrack(event.track)`，会话允许 `rtc`，删除原来重复播放的 audio 元素。OpenAI 临时凭据与 Kasamila Token 分开，都由认证后端签发。

`providers/openai.mjs` 是 GA 事件映射，后端自动发送 session.update。抢话由服务端 VAD speech_started 触发；只消费助手音频，不把麦克风 echo 返回给数字人。

## 验收

请验证多轮对话、用户抢话、平台断开、Token 到期和关闭时 Runtime 释放。密钥仅存服务端；样例协议测试不等于真实付费平台验收。

协议来源：[OpenAI Realtime API 官方资料](https://developers.openai.com/api/docs/guides/realtime-conversations)。核对日期：2026-09-27；实际模型/账号权限需开发者确认。
