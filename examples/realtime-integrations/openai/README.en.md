[简体中文](README.md) | [English](README.en.md)

# OpenAI Realtime API + Kasamila SDK 2.1.0

Integration path: PCM. [Shared setup and lifecycle](../README.en.md).

Set `PROVIDER=openai`, `OPENAI_API_KEY` and the model available to your account in `OPENAI_REALTIME_MODEL`. Run the [local starter](../README.en.md). Permanent OpenAI credentials stay in the Node relay; the browser never receives them.

The server uses the GA `session.update` schema, raw mono PCM at 24 kHz and `response.output_audio.delta`. Server VAD speech-start events clear the avatar's queued output. This is not the older beta `response.audio.delta` protocol. The adapter is [openai.mjs](../providers/openai.mjs).

For an existing OpenAI WebRTC app instead, take the remote audio track from `RTCPeerConnection.ontrack` and call `player.setMediaStreamTrack(event.track)` with a Kasamila session permitting `rtc`. Remove the app's duplicate speaker element. Provision OpenAI ephemeral credentials only on your authenticated backend; they are distinct from Kasamila Tokens.

Protocol reference: [Official OpenAI Realtime API documentation](https://developers.openai.com/api/docs/guides/realtime-conversations). Checked 2026-09-27; account/model availability must be verified by you. Synthetic contract tests are not paid provider acceptance.
