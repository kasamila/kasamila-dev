[简体中文](README.md) | [English](README.en.md)

# Pipecat + Kasamila SDK 2.1.0

Integration path: RTC. [Shared setup and lifecycle](../README.en.md).

Reuse an existing Pipecat bot endpoint and a matching WebRTC transport (Daily or SmallWebRTC). This package does not instantiate your STT/LLM/TTS pipeline. The Kasamila session must permit `rtc`.

```js
import {PipecatClient, RTVIEvent} from "@pipecat-ai/client-js";
import {SmallWebRTCTransport} from "@pipecat-ai/small-webrtc-transport";
import {bindPipecat} from "../providers/pipecat.mjs";
const client = new PipecatClient({
  transport: new SmallWebRTCTransport(), enableMic: true, enableCam: false,
});
const detach = bindPipecat({
  client, RTVIEvent, player, onError: error => console.error(error.message),
});
await client.startBotAndConnect({endpoint: "/api/start"});
// End button:
await detach();
await client.disconnect();
await player.destroy();
```

Your `/api/start` must authenticate the user and return the transport's expected connection parameters. The adapter reads `tracks().bot.audio`, never `local.audio`. Do not mount PipecatClientAudio or another speaker component. Bot-ready and track-replacement events reattach the correct track. Verify framework-native barge-in and remove listeners on unmount.

Protocol reference: [Official Pipecat documentation](https://docs.pipecat.ai/api-reference/client/js/client-methods). Checked 2026-09-27; account/model availability must be verified by you. Synthetic contract tests are not paid provider acceptance.
