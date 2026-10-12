# Kasamila Voice Companion — extension preview

Desktop Chrome / Edge 116+, Manifest V3. Animate a Kasamila avatar using audio from a user-selected HTTP(S) tab. It is not limited to ChatGPT: web speech, AI replies and other capturable audio work through the same bridge. Music and alerts are captured too. Protected content, internal browser pages and mobile browsers are outside the initial support target.

## Install

Unzip the package. Open `chrome://extensions` or `edge://extensions`, enable Developer mode, choose **Load unpacked**, and select `extension`. Pin the toolbar icon. On the source page, click the icon (or `Alt+Shift+K`), select an avatar in the side panel, accept the audio disclosure, and enable it. Continue using the source site's microphone and conversation controls.

The arrow button opens a separate resizable browser window; enable the avatar again there. It is not an always-on-top system overlay. Stop, closing the last companion view, source navigation or source closure ends capture. Session expiry requires manual reconnection. This is an unpacked preview, not a reviewed Chrome Web Store / Edge Add-ons listing.

## Boundaries

Only `activeTab`, `tabCapture`, `offscreen` and `sidePanel` permissions are requested. No content scripts, microphone access, broad host permissions or audio persistence. A packaged AudioWorklet downmixes/resamples to 16 kHz PCM16 in 40 ms packets. Eight outstanding packets bound transport backlog; stalled consumers stop rather than replay delayed speech. Original audio is restored once; the avatar uses `playback:false`.

The hosted avatar runs in an isolated web iframe with a same-origin inner wrapper for the published SDK. The extension accepts only limited messages from the fixed Kasamila origin and its frame. Remote code cannot invoke arbitrary extension APIs. No permanent key or Runtime Token crosses the extension bridge. Audio-only capture provides no official turn/interruption events from the source website. Lip movement has capture/inference latency; actual-site interruption and echo behavior still need testing.

The included extension connects to the hosted Kasamila Portal demo. Admin controls the dedicated Runtime Key, public avatars, companion switch, duration and concurrency. Voice-provider configuration is unnecessary: the source site determines speech, voice, persona and content. The service uses short-lived Origin-bound Runtime Tokens and releases sessions on disconnect, expiry or missing heartbeats. Existing API and SDK code are unchanged.

For self-hosting, implement the same consent, authentication, quota, Origin, heartbeat and cleanup boundaries, and update the extension's fixed URL and iframe CSP to your trusted host. Never embed a permanent API key in the extension. Main-project references: `kasamila_api/modules/portal/companion.py` and `web/portal/companion*`.

Before store publication, complete platform review and privacy disclosures, and verify real target websites, long-running sessions, interruptions and speaker/microphone echo. Automated checks do not establish compatibility with every website.
