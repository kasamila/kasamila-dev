# Kasamila Voice Companion — extension preview

Desktop Chrome / Edge 116+, Manifest V3. Animate a Kasamila avatar using audio from a user-selected HTTP(S) tab. It is not limited to ChatGPT: web speech, AI replies and other capturable audio work through the same bridge. Music and alerts are captured too. Protected content, internal browser pages and mobile browsers are outside the initial support target.

## Install

Unzip the package. Open `chrome://extensions` or `edge://extensions`, enable Developer mode, choose **Load unpacked**, and select `extension`. Pin the toolbar icon. On the source page, click the icon (or `Alt+Shift+K`), select an avatar in the companion window, accept the audio disclosure, and enable it. Continue using the source site's microphone and conversation controls.

Click **Always-on-top window** for a circular avatar in Document Picture-in-Picture (the browser retains its rectangular outer frame). The avatar renders directly inside PiP; once connected, the controller minimizes automatically. Closing PiP restores the controller and reconnects automatically. Each switch releases the old Runtime and connects once, preserving the avatar, consent and remaining duration while tab capture continues. PiP no longer depends on background canvas copies. Keep the controller alive: the browser closes PiP if its opener closes. Silence, reply completion and same-origin navigation/reloads do not stop capture. Stop, closing the companion window/source, or cross-origin navigation ends capture. Admin session expiry still requires manual reconnection.

Upgrade to 0.3.0: replace unpacked files, click **Reload** in extension management, then click the toolbar icon on the source page. Refreshing the page alone does not upgrade the extension. Failures identify safe categories and recovery actions, without credentials, stream IDs or private URL paths. This is an unpacked preview, not a reviewed Chrome Web Store / Edge Add-ons listing.

## Boundaries

Only `activeTab`, `tabCapture`, `offscreen` permissions are requested. No content scripts, microphone access, broad host permissions or audio persistence. A packaged AudioWorklet downmixes/resamples to 16 kHz PCM16 in 40 ms packets. Eight outstanding packets bound transport backlog; excess and stale PCM is dropped without destroying the avatar. An independent offscreen heartbeat keeps the control connection alive through silence. Original audio is restored once; the avatar uses `playback:false`.

The hosted avatar runs in an isolated web iframe with a same-origin inner wrapper for the published SDK. The extension accepts only limited messages from the fixed Kasamila origin and its frame. Remote code cannot invoke arbitrary extension APIs. No permanent key or Runtime Token crosses the extension bridge. Audio-only capture provides no official turn/interruption events from the source website. Lip movement has capture/inference latency; actual-site interruption and echo behavior still need testing.

The included extension connects to the hosted Kasamila Portal demo. Admin controls the dedicated Runtime Key, public avatars, companion switch, duration and concurrency. Voice-provider configuration is unnecessary: the source site determines speech, voice, persona and content. The service uses short-lived Origin-bound Runtime Tokens and releases sessions on disconnect, expiry or missing heartbeats. Existing API and SDK code are unchanged.

For self-hosting, implement the same consent, authentication, quota, Origin, heartbeat and cleanup boundaries, and update the extension's fixed URL and iframe CSP to your trusted host. Never embed a permanent API key in the extension. Main-project references: `kasamila_api/modules/portal/companion.py` and `web/portal/companion*`.

Before store publication, complete platform review and privacy disclosures, and verify real target websites, long-running sessions, interruptions and speaker/microphone echo. Automated checks do not establish compatibility with every website.

## Regression coverage

The isolated browser test uses a real toolbar action/activeTab grant (no capture allowlist), WebRTC remote audio, 36 seconds of silence and a subsequent reply, consumer backpressure, same-origin navigation/reload, direct PiP rendering with the owner minimized, native/button close and automatic return, and remaining-duration handoff. Background throttling stays enabled. Switches remain subject to Admin concurrency and IP rate limits. Actual hosted Runtime and immutable SDK tests are separate. These checks do not claim compatibility with every third-party voice product.
