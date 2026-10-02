[English](README.en.md) | [简体中文](README.md)

# OBS Browser Source + Streamlabs: an embeddable avatar host

For livestream tool vendors, plugin developers and interactive broadcast providers. One `AvatarHost` supplies transparent display, microphone input, bounded FIFO playback, interruption, four scene layouts and explicit session termination. Entertainment, chat, commerce and game modes are layouts, not four independent products.

## Setup

1. Run the shared relay as described in [voice platforms](../voice-platforms/README.en.md), choosing one voice provider or the existing authenticated PCM bridge.
2. Set `KASAMILA_OUTPUT_MODE=transparent`. Supply the canonical **packed-matte HLS** descriptor for a template that actually supports transparent output. A normal video plus CSS opacity/chroma key is not equivalent; `player.getOutput().transparentCanvas` must be true.
3. Open `http://127.0.0.1:8790/public/studio.html` in your normal browser. Create a room: this does not start a billed Runtime. Copy its ten-minute display-capability URL.
4. In OBS **Sources → Browser**, paste that URL, set a canvas size (for example 1920×1080), keep the default transparent background, and enable **Control audio via OBS**. In Streamlabs Desktop use its **Browser Source** with the same URL. These are alternative hosts of the same component, not a requirement to run both applications simultaneously.
5. Use source **Interact** to click the overlay's Enable audio button; CEF autoplay must be unlocked before Start. Keep studio open. Choose Start only after the overlay is connected and audio unlocked.
6. Allow the studio microphone when requested. Input goes through the authenticated room to your selected voice agent; ONLY the agent's reply drives and speaks through the avatar. The OBS embedded browser does not need microphone permission. Use headphones and avoid capturing this output both as browser audio and desktop audio.

## Queue, interruption and scenes

- Queue up to four complete files, each <=3 MiB and <=30 seconds at 8–48 kHz. `decodeAudioData` handles complete files; it is not a decoder for arbitrary network MP3/WebM fragments. Samples become mono PCM16 and enter the same sink. Keep agent input off while running prerecorded queues; concurrent agent replies and file input otherwise share/interleave that sink.
- The sink has a five-second PCM backlog limit and fails closed on overflow. Queue arrival order is preserved even when file decoding takes different times. Interrupt immediately invalidates queued old files and PCM; it is not queued behind speech.
- Entertainment/chat/commerce/game buttons change the component's layout without starting another Runtime. They do not implement separate shopping carts, game logic or moderation products.
- Optional actual **OBS Program Scene** switching uses OBS WebSocket v5. Enable its server in OBS Tools, set backend-only `OBS_WS_URL=ws://127.0.0.1:4455` and `OBS_WS_PASSWORD`, then enter the exact scene name in studio. The relay allows loopback only. This RPC is OBS-specific; it does not claim a corresponding Streamlabs Desktop scene-control API.
- Hidden/deactivated Browser Sources, source disconnection, studio disconnection and page exit trigger End. No automatic billed restart when a scene becomes visible. If you want continuity across scenes, keep one source instance visible and switch host layout. Fail-safe ending may interrupt a broadcast transition; test your source lifecycle settings deliberately.

## Streamlabs events / OBS plugin

The Browser Source works without a Streamlabs API token. To receive alerts, configure optional backend-only `STREAMLABS_SOCKET_TOKEN` with the user's authorized `socket.token` scope. The adapter connects to the official Socket API and shows allowlisted event summaries in studio. A synthetic donation button works offline.

Events are suggestions for operator review, never automatically spoken or inserted as agent/system instructions. Donor messages, amounts and private IDs are not forwarded. The operator can edit and submit text to Dify; other providers need their own supported text-input adapter before using this button. This prevents a donation message becoming an automatic prompt-injection path. Do not claim complete abuse protection; add your own moderation.

OBS users may separately install the official Streamlabs Plugin for OBS for their alerts/widgets. The plugin and Streamlabs Desktop are distinct products; this demo does not bundle either or request account authorization automatically. The Socket API uses its legacy Socket.IO v2 / Engine.IO v3 protocol. A minimal fixed-endpoint WebSocket receiver handles root-namespace JSON alerts, handshake, heartbeat and disconnect; it is not a general Socket.IO replacement. It avoids retaining the obsolete general-purpose client dependency. Reassess actual server compatibility before release.

## Embed and session contract

Use the generated overlay URL in a Browser Source or iframe of an authorized host. Controller and display use separate, unguessable capabilities; neither is a permanent API key. Local capabilities are memory-only and expire after ten minutes. Treat both as secrets, especially the control key. Production issuance must be replaced with logged-in, per-user authorization, origin enforcement, HTTPS/WSS and quotas; do not expose this loopback demo through an unauthenticated public tunnel.

The server accepts only `start`, `mic`, `input_end`, `file`, `interrupt`, `scene`, `announcement`, `end`; the display can only return status, not control another room. A source is reserved during startup to prevent double billing. Explicit End closes the provider, flushes audio, calls SDK destroy and authorized Runtime termination. `stop()`, silence, hiding pixels or stopping the livestream do NOT inherently end billing. Check the end confirmation; on a failed end request terminate through your authorized Runtime control. An abrupt machine failure still relies on lease expiry.

## Acceptance checklist

Run mocked `npm test`, then test actual OBS/Streamlabs CEF with your accounts: true transparency over two backgrounds; one output audio path; queue order and tail; repeated interruptions; microphone refusal; scene hide/show without automatic restart; disconnect during initialization; explicit end confirmation; reconnect requiring a new capability; signed media expiry; long broadcast/mobile controller layout. This repository has not performed paid vendor calls or certified your broadcast setup.

References: [OBS browser](https://github.com/obsproject/obs-browser), [OBS WebSocket](https://github.com/obsproject/obs-websocket), [Streamlabs Socket API](https://dev.streamlabs.com/docs/socket-api), [scopes](https://dev.streamlabs.com/docs/scopes), [official OBS plugin](https://streamlabs.com/plugin-for-obs). Reviewed 2026-10-02.
