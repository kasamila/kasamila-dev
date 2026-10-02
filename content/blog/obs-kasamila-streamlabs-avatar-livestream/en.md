---
title: "OBS + Kasamila + Streamlabs: one embeddable avatar host for livestreaming"
summary: "Transparent Browser Sources, audio input, queues, interruption, scene layouts and explicit session termination share one host component."
lang: en
slug: obs-kasamila-streamlabs-avatar-livestream
---

# OBS + Kasamila + Streamlabs: one embeddable avatar host for livestreaming

Transparent Browser Sources, audio input, queues, interruption, scene layouts and explicit session termination share one host component.

## Implementation

1. Start the shared relay with one voice agent or the authenticated PCM bridge. Set KASAMILA_OUTPUT_MODE=transparent and provide the packed-matte HLS descriptor of a transparent-capable template. CSS opacity cannot remove an ordinary video background.

2. Open /public/studio.html in a normal browser, create a room and copy its temporary display URL. Add an OBS Browser Source, or the same URL to Streamlabs Desktop Browser Source. They are alternative hosts, not a requirement to run both applications.

3. Use source Interact to click Enable audio before Start in studio. Capture microphone input in studio; only agent replies drive the avatar. Route browser audio through OBS and avoid also capturing the same desktop audio.

4. Complete files use FIFO order: four items, <=3 MiB and <=30 seconds each. Interrupt discards stale playback. Entertainment, chat, commerce and game are layouts of one host. Optional server-side OBS WebSocket v5 switches the real Program Scene; this does not imply a matching Streamlabs Desktop RPC.

5. Optional Streamlabs Socket API events become operator-reviewed summaries, never automatic donor-message prompts or speech. Hiding, deactivating, disconnecting or End releases the session; showing the source does not automatically restart billing. Check the end acknowledgement; machine failure still relies on lease expiry.

```bash
cd examples/realtime-integrations
npm ci
cp .env.example .env
# Backend-only configuration: see linked guide
npm start
```

## Boundaries and acceptance

This is one embeddable host, not four finished business products. A public gateway needs login, origin checks, quotas, moderation and HTTPS/WSS. Verify transparency, queues, transitions and explicit termination in your actual broadcast setup.

## Code and protocols

- [kasamila-dev / SDK 2.1.0](https://github.com/kasamila/kasamila-dev/tree/main/examples/realtime-integrations)
- [Code and protocols](https://github.com/kasamila/kasamila-dev/tree/main/examples/realtime-integrations/obs-streamlabs/README.en.md)
- [OBS Browser](https://github.com/obsproject/obs-browser)
- [Streamlabs Socket API](https://dev.streamlabs.com/docs/socket-api)

## Markdown / AI reading

- [Markdown](https://www.kasamila.com/portal/content/blog/obs-kasamila-streamlabs-avatar-livestream.md?lang=en)
- [HTML](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=en)
- [JSON](https://www.kasamila.com/api/v1/portal/content/blog/obs-kasamila-streamlabs-avatar-livestream?locale=en)

[zh](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=zh) | [en](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=en) | [fr](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=fr) | [de](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=de) | [ru](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ru) | [es](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=es) | [it](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=it) | [ar](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ar) | [ja](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ja) | [ko](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ko) | [th](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=th) | [ms](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ms) | [vi](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=vi) | [hi](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=hi) | [id](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=id)
