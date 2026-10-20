# Kasamila Discord Activity — embedded validation 0.1

An actual Discord Activity with a voice receive bot. No OBS, browser extension,
virtual camera/audio driver or voice LLM. This is a validation build, not a claim
that native Discord audio and inferred lip motion are already synchronized.

## Components

- `server.mjs`: Node 22.12+ / discord.js / @discordjs/voice, including DAVE.
  It binds **127.0.0.1:8791** only. An existing Portal service authenticates every
  request with an independent local credential. Discord credentials remain in
  Portal's encrypted Admin settings, not environment files or the sample.
- `protocol.mjs`: bounded, signed session claims; instance membership checks;
  48 kHz stereo Opus decoding -> mono PCM16 at 16 kHz; sequence/timestamp headers.
- Portal integration: `kasamila_api/modules/portal/discord_activity.py` and
  `web/portal/discord-activity/`. Runtime admission uses the existing published
  Kasamila session contract; API, SDK and geometry implementation are unchanged.

## Configure the hosted validation

Open `https://kasamila.com/api/v1/admin/portal/discord/manage` as a superadmin.
Enter Application ID, Client Secret, Bot Token, test server ID, **ordinary voice
channel** ID, allowed avatars and a viewer limit. Credentials left blank retain
their saved values; the clear checkboxes explicitly remove them. Use a dedicated
test channel. Enable avatars and the dedicated Runtime Key in Voice Companion
settings first. One active presenter and one Activity instance are supported.

In the Discord Developer Portal:

1. Enable Activities. Register the official tutorial's placeholder OAuth redirect
   `https://127.0.0.1` for embedded RPC authorization. This is not a web OAuth callback.
2. Add URL mappings below. Targets are directories without `https://`. Put `/`
   last. SDK and resource paths retain their existing `/sdk`, `/api`, `/portal`
   and `/web` layout; do not modify SDK content or integrity hashes.

| Prefix | Target |
| --- | --- |
| `/kasamila-www` | `www.kasamila.com` |
| `/kasamila` | `kasamila.com` |
| `/sdk` | `kasamila.com/sdk` |
| `/api` | `kasamila.com/api` |
| `/portal` | `kasamila.com/portal` |
| `/web` | `kasamila.com/web` |
| `/` | `kasamila.com/portal/apps/discord/activity` |

3. Install the app in the test server with `bot applications.commands`, View
   Channel and Connect permissions (integer `1049600`). No Administrator,
   Message Content or privileged member intent. No public interaction callback
   is needed for the default Activity launch command.
4. Add `https://APPLICATION_ID.discordsays.com` to the dedicated Runtime Key's
   origin allowlist. Do not add a blanket wildcard or disable origin validation.
5. Join the configured voice channel and launch the Activity from the App Launcher.
   Authorize identity, choose an avatar, accept processing and connect the stage.
   Click “Drive with my MIC”. A second test account joins the same Activity,
   accepts processing and connects to watch. The server independently verifies
   the OAuth user, live Activity instance, instance user membership, configured
   guild, and independently configured voice-channel presence. An Activity can be
   launched from a text channel in the same server; its launch channel need not
   equal the audio source channel. Client-provided user IDs are never
   accepted as identity.

## Audio, privacy and lifecycle

Only an explicitly active presenter's receive stream is subscribed/decoded and
forwarded to the viewers in that Activity. This does not isolate the bot from
other channel packets at the Discord transport level: a receive-enabled bot is
a voice-channel participant. Use the dedicated channel and inform participants.
There is no audio file storage or transcript. Voice payloads exist transiently
in memory. Muting pauses receive processing; leaving the channel/Activity,
stopping, expiry or socket disconnect ends processing. Viewer Runtime sessions
are cleaned up server-side on disconnect, as well as client-side on cancellation.
The bot disconnects when no viewers remain. A viewer Runtime is billed separately;
both the demo's existing Runtime concurrency cap and this app's viewer cap apply.

The Activity keeps Discord's original channel audio and sets Runtime PCM playback
to **false**. The relay timestamp measures bot-to-browser transport time only,
not Discord's native-audio latency or actual lip-render delay. Default channel
audio cannot currently be automatically delayed by this app. An Activity does
not replace a user's Discord camera tile; viewers must join it.

## Run / test

```sh
npm ci
npm test
npm run build
npm start
```

The hosted Portal integration must already be present. Put a random **service**
credential of at least 40 characters in the owner-readable file
`../../.portal-discord-bridge-secret`, or provide
`KASAMILA_DISCORD_BRIDGE_SECRET`. Never put the Discord Bot Token in that file.
The Portal and bridge must share the same local service credential.
`KASAMILA_DISCORD_PORTAL` defaults to `http://127.0.0.1:8000` and accepts loopback
only. This sample intentionally has no anonymous/mock login fallback.

The public example repository contains the complete companion `portal/` files
needed for integration; adapt their existing Admin, settings and Runtime helpers
to your own host rather than exposing the bridge on a public port.

Automated tests cover credentials, request admission, signed claims and PCM
conversion. They **do not** establish real Discord microphone/Activity/DAVE/
mobile interoperability. Test with two real Discord accounts, mute/unmute,
leave/rejoin, 10-minute expiry and a restrictive mobile network before promotion.

## Platform references

- https://docs.discord.com/developers/activities/building-an-activity
- https://docs.discord.com/developers/activities/development-guides/networking
- https://docs.discord.com/developers/activities/development-guides/multiplayer-experience
- https://discord.js.org/docs/packages/voice/0.19.2

Discord does not formally document audio receive. Library support is provided
without a stable Discord receive contract; DAVE compatibility is required.

## Integrating the supplied Portal sources

Copy the `portal/` tree into your Kasamila-Mobile checkout and mount `discord_activity.router` from the existing Portal demo router. The host must already provide the encrypted Admin settings, identity/CSRF, Voice Companion Runtime admission, static `/web`, immutable `/sdk`, and published Runtime endpoints used by the module. Install the exact Node bridge dependencies separately; the existing API/SDK dependencies do not change. Configure the exact WebSocket proxy path `/portal/apps/discord/socket` and block public access to `/portal/apps/discord/internal-config`. The bridge obtains configuration directly from loopback. Do not expose port 8791.
