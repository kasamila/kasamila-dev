[简体中文](README.md) | [English](README.en.md)

# LiveKit Agents + Kasamila SDK 2.1.0

方式：RTC。[公共初始化与计费生命周期](../README.md)。

复用已有 LiveKit Agents 房间和服务端签发的房间 Token；它不是 Kasamila Runtime Token。Kasamila 会话允许 `rtc`；传入明确 Agent identity，不能把第一个用户音轨当作机器人。

下列英文代码展示完整挂接/断开步骤，可直接复制进现有浏览器工程。沿用 AgentSession、STT/LLM/TTS 和房间授权服务，不需要改 Agent 算法。不要另调用 `track.attach()` 或安装第二个声音播放器。取消订阅只停声音，离开房间还应 `player.destroy()`。

在现有项目中安装 `livekit-client`，先初始化 SDK 2.1.0 的 player，再注册 room 的监听，最后连接房间。已经订阅的音轨也会补挂接；重连后核对 Agent 身份。错误回调应销毁 Runtime，而不只是打印日志。

## 挂接代码

```js
import {Room, RoomEvent} from "livekit-client";
import {bindLiveKit} from "../providers/livekit.mjs";
// player is the initialized SDK 2.1.0 instance from your own Runtime backend.
const room = new Room();
const detach = bindLiveKit({
  room, RoomEvent, player, agentIdentity: "your-agent-identity",
  onError: error => console.error(error.message),
});
await room.connect(roomUrl, roomToken);
await room.localParticipant.setMicrophoneEnabled(true);
// End button:
await detach();
await room.disconnect();
await player.destroy();
```

## 验收

请验证多轮对话、用户抢话、平台断开、Token 到期和关闭时 Runtime 释放。密钥仅存服务端；样例协议测试不等于真实付费平台验收。

协议来源：[LiveKit Agents 官方资料](https://docs.livekit.io/transport/media/subscribe/)。核对日期：2026-09-27；实际模型/账号权限需开发者确认。
