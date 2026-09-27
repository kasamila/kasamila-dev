[简体中文](README.md) | [English](README.en.md)

# LiveKit Agents + Kasamila SDK 2.1.0

Integration path: RTC. [Shared setup and lifecycle](../README.en.md).

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

Protocol reference: [Official LiveKit Agents documentation](https://docs.livekit.io/transport/media/subscribe/). Checked 2026-09-27; account/model availability must be verified by you. Synthetic contract tests are not paid provider acceptance.
