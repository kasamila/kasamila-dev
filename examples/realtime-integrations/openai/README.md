[简体中文](README.md) | [English](README.en.md)

# OpenAI Realtime API + Kasamila SDK 2.1.0

方式：PCM。[公共初始化与计费生命周期](../README.md)。

配置 `PROVIDER=openai`、后端 `OPENAI_API_KEY` 和账户可用的 `OPENAI_REALTIME_MODEL`，运行本地示例。示例使用 GA 会话格式、24kHz PCM 和 `response.output_audio.delta`，不是旧 beta 的音频事件。

如果已有 OpenAI WebRTC 应用，可直接将 ontrack 音轨给 `player.setMediaStreamTrack(event.track)`，会话允许 `rtc`，删除原来重复播放的 audio 元素。OpenAI 临时凭据与 Kasamila Token 分开，都由认证后端签发。

## 代码与详细步骤

Set `PROVIDER=openai`, `OPENAI_API_KEY` and the model available to your account in `OPENAI_REALTIME_MODEL`. Run the [local starter](../README.en.md). Permanent OpenAI credentials stay in the Node relay; the browser never receives them.

The server uses the GA `session.update` schema, raw mono PCM at 24 kHz and `response.output_audio.delta`. Server VAD speech-start events clear the avatar's queued output. This is not the older beta `response.audio.delta` protocol. The adapter is [openai.mjs](../providers/openai.mjs).

For an existing OpenAI WebRTC app instead, take the remote audio track from `RTCPeerConnection.ontrack` and call `player.setMediaStreamTrack(event.track)` with a Kasamila session permitting `rtc`. Remove the app's duplicate speaker element. Provision OpenAI ephemeral credentials only on your authenticated backend; they are distinct from Kasamila Tokens.

协议来源：[OpenAI Realtime API 官方资料](https://developers.openai.com/api/docs/guides/realtime-conversations)。核对日期：2026-09-27；实际模型/账号权限需开发者确认。协议测试不等于付费云端验收。
