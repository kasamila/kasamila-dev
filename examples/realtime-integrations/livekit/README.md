[简体中文](README.md) | [English](README.en.md)

# LiveKit Agents + Kasamila SDK 2.1.0

方式：RTC。[公共初始化与计费生命周期](../README.md)。

复用已有 LiveKit Agents 房间和服务端签发的房间 Token；它不是 Kasamila Runtime Token。Kasamila 会话允许 `rtc`；传入明确 Agent identity，不能把第一个用户音轨当作机器人。

下列英文代码展示完整挂接/断开步骤，可直接复制进现有浏览器工程。沿用 AgentSession、STT/LLM/TTS 和房间授权服务，不需要改 Agent 算法。不要另调用 `track.attach()` 或安装第二个声音播放器。取消订阅只停声音，离开房间还应 `player.destroy()`。

## 代码与详细步骤

Use your existing LiveKit Agents room and backend-issued **room Token**. It is separate from the Kasamila Runtime Token. Allow `rtc` when creating the Kasamila session. The exact `agentIdentity` must match the agent participant; never choose the first human audio track.

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

Keep your existing AgentSession / STT / LLM / TTS graph and room-token service. The adapter supports both tracks already subscribed and later subscriptions. Do not call `track.attach()` or mount another room audio renderer: Kasamila owns audio playout. Track unsubscribe stops audio, but your app must destroy the session on disconnect. Rebind after reconnect and verify participant identity.

协议来源：[LiveKit Agents 官方资料](https://docs.livekit.io/transport/media/subscribe/)。核对日期：2026-09-27；实际模型/账号权限需开发者确认。协议测试不等于付费云端验收。
