# Kasamila Voice Companion 0.4.0 — extension preview

Desktop Chrome / Edge 116+, Manifest V3. Click the extension on a selected HTTPS page (or localhost) to animate an avatar with that tab’s audio. Works with capturable web audio, including AI replies, web speech, music and alerts. Protected media, internal browser pages and mobile browsers are unsupported.

## Use

1. Unzip, enable Developer mode at `chrome://extensions` or `edge://extensions`, load the `extension` folder and pin Kasamila.
2. Click the toolbar icon (or `Alt+Shift+K`) on the source page. A single always-on-top window opens at approximately 280 × 330; drag or resize it as needed.
3. First use: choose an avatar, read and accept the audio disclosure, then enable it. The avatar and consent stay in local browser storage; subsequent toolbar clicks connect automatically.
4. Use ⚙ in the corner to configure the avatar. Settings release the old Runtime while tab capture continues. Enable again to apply. Unchecking consent cancels future automatic connection. ■ stops capture and inference. The bottom indicator lights when web audio is captured.
5. There is no controller window, bitmap mirror, window handoff or return connection. Silence, reply completion and same-document routing keep the session alive. Closing PiP or the source tab, and full reload/navigation destroying the source document, stop it. Click the toolbar to reconnect using saved settings. Admin duration, concurrency and rate limits still apply.
6. Continue speaking through the original website. Source audio plays once; avatar playback is disabled to prevent echo. The companion follows speech and does not generate replies.

**Upgrade to 0.4.0:** close previous companion windows, replace unpacked files, reload the extension and accept any browser prompt for added permissions. Click the toolbar icon on the source page. Refreshing the website alone does not upgrade the extension.

## Permissions and data

`Selected tab → tabCapture → offscreen AudioWorklet → extension iframe inside PiP → same-origin Portal frames → existing SDK`

- `activeTab`, `tabCapture`: capture only the tab selected by a user action.
- `offscreen`: process audio and restore source playback.
- `scripting`: inject an isolated function only after that action, solely to create PiP. It does not read page text, accounts or application internals.
- `storage`: locally store avatar ID, consent and configuration version. No audio, transcript, key or Runtime Token is stored.

No global host permissions, microphone permission, automatic content scripts or remote extension scripts. Only `panel.html` is exposed for embedding, and its background connection requires the current user-initiated launch identifier. The Portal bridge checks its extension parent and fixed Kasamila origin. Tokens never cross the extension bridge.

Audio is 16 kHz PCM16 in 40 ms packets. At most eight packets await acknowledgement; expired acknowledgements are reclaimed so a lost message cannot permanently stall speech. An independent offscreen heartbeat maintains the connection through silence.

## Hosted service

Admin controls the dedicated Runtime Key, public avatars, companion switch, duration, concurrency and rate limits. No voice-model configuration is needed. This hosted demo is not unlimited free inference.

Only mini-mode embed responses add the validated source-page Origin to their CSP ancestor list. Inference still uses short-lived tokens for the Portal origin; no inference-key domain whitelist is widened. Self-hosted implementations must preserve consent, quotas, Origin, heartbeat and cleanup boundaries. Reference implementation: `kasamila_api/modules/portal/companion.py` and `web/portal/companion*`. Existing API/SDK code is unchanged.

## Validation

Isolated browser tests use real toolbar permissions and WebRTC audio, covering initial consent, stored automatic connection, 36 seconds of silence, lost acknowledgements, minimized source windows, settings and Stop. Background throttling stays enabled. Separate hosted-Runtime tests measure actual mouth motion, audio-clock progress and rendered frames. These checks do not establish compatibility with every website or network.

This is an unpacked preview, not a reviewed Chrome Web Store / Edge Add-ons listing. Lip motion has capture and inference latency.
