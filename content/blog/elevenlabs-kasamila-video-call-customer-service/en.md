---
title: "ElevenLabs + Kasamila: video-call customer service with one voice and visual path"
summary: "Keep your existing ElevenLabs Agent and give its customer-service replies a visible avatar, using one audio path for sound and mouth motion."
lang: en
slug: elevenlabs-kasamila-video-call-customer-service
---

# ElevenLabs + Kasamila: video-call customer service with one voice and visual path

Keep your existing ElevenLabs Agent and give its customer-service replies a visible avatar, using one audio path for sound and mouth motion.

## Implementation

1. Configure your existing ElevenLabs Agent with its knowledge base, service instructions, authorized tools and human escalation. The avatar does not replace your business logic.

2. Run npm ci in the sample directory and copy .env.example to .env. Set backend-only PROVIDER=elevenlabs, ELEVENLABS_API_KEY, ELEVENLABS_AGENT_ID and the Kasamila key, accessible template ID and matching canonical media descriptor. Select PCM input and output.

3. Run npm start and open /public/video-call.html. Click Start to unlock audio and permit the microphone. Your backend obtains the signed ElevenLabs conversation URL; neither it nor permanent provider keys go to the browser.

4. The microphone reaches the voice agent only. Its actual reply PCM reaches Kasamila for BOTH playback and mouth inference; do not add a second provider audio player. Optional caller-camera preview stays local. This UI is not a completed human WebRTC call or PSTN service.

5. Barge-in invalidates old playback. Manual queue clearing does not guarantee upstream generation has stopped. End closes the provider transport, destroys the avatar and requests authorized Runtime termination. Silence is not a billing stop; investigate an unconfirmed end request.

```bash
cd examples/realtime-integrations
npm ci
cp .env.example .env
# Backend-only configuration: see linked guide
npm start
```

## Boundaries and acceptance

This is a runnable AI video-call-style starter, not vendor production certification or a phoneme-accuracy guarantee. Add login, template authorization, HTTPS/WSS, consent and CRM/tool controls; test real accounts, multi-turn speech and interruption.

## Code and protocols

- [kasamila-dev / SDK 2.1.0](https://github.com/kasamila/kasamila-dev/tree/main/examples/realtime-integrations)
- [Code and protocols](https://github.com/kasamila/kasamila-dev/tree/main/examples/realtime-integrations/voice-platforms/README.en.md)
- [ElevenLabs WebSocket](https://elevenlabs.io/docs/eleven-agents/api-reference/eleven-agents/websocket)

## Markdown / AI reading

- [Markdown](https://www.kasamila.com/portal/content/blog/elevenlabs-kasamila-video-call-customer-service.md?lang=en)
- [HTML](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=en)
- [JSON](https://www.kasamila.com/api/v1/portal/content/blog/elevenlabs-kasamila-video-call-customer-service?locale=en)

[zh](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=zh) | [en](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=en) | [fr](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=fr) | [de](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=de) | [ru](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ru) | [es](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=es) | [it](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=it) | [ar](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ar) | [ja](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ja) | [ko](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ko) | [th](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=th) | [ms](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ms) | [vi](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=vi) | [hi](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=hi) | [id](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=id)
