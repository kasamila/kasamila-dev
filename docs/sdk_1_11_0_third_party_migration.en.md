[English](sdk_1_11_0_third_party_migration.en.md) | [简体中文](sdk_1_11_0_third_party_migration.md)

# Third-party upgrade guide: Web SDK 1.11.6

For existing integrations upgrading from older SDK/template workflows. Share this guide with application development, QA and operations teams.
The filename retains its original release-series name; the **documented SDK version is 1.11.6**.

[Full geometry/HLS reference](api_v1_geometry_runtime_guide.en.md) · [Concurrency update](runtime_concurrency_api_sdk_upgrade_20260923.en.md) · [Browser example](../examples/geometry-runtime-web/README.en.md)

SDK 1.11.6 retains Runtime API, `templateMedia` and mouth-calibration fields. Manual Agent command handling must explicitly call `ackAgentCommand()`; automatic playback behavior is unchanged.

The V7 closed-contact layer follows the 468-point inner-lip curves and fades with audio-driven opening. Stable model lip materials aim to reduce source-teeth, highlights and temporal pale-pixel artifacts. This is not a promise that every template artifact is eliminated; visually accept your actual templates.
Procedural upper/lower teeth remain part of the complete V7 rendering chain. I remains opt-in. Portal's internal preview channel does not change the third-party HLS contract.

## 1. Required changes

### Geometry templates only

- Accept runnable `ready` templates with `build_mode === 'geometry'` from the authorized Catalog.
- Remove fine-tuning, MouthUNet, legacy_train and V7+v29 branches.
- Do not call retired `/auth/api/train/*` endpoints or construct legacy `/assets/...` resource URLs.
- Do not reuse an old template ID merely because its display name matches.

### Pin the official SDK

```html
<script src="https://www.kasamila.com/web/sdk/kasamila.js?v=1.11.6"
        crossorigin="anonymous"></script>
```

```javascript
if (globalThis.Kasamila?.version !== '1.11.6') {
  throw new Error('Unexpected Kasamila SDK version');
}
```

Do not directly load internal geometry renderers, template-media modules, Audio2Viseme Worker/model files or teeth textures. `Kasamila.create()` loads its matching assets from the SDK Origin.
For an approved offline mirror, mirror the complete versioned resource tree and preserve paths, not only the entry JS. Prefer the official production URL.

### HLS for every template length

Supply the short-lived Runtime Token, a matching full `templateMedia` object and a trusted pinned hls.js URL where native HLS is unavailable.

```json
{
  "delivery": "hls",
  "url": "https://media.example.com/avatars/999000000001/001/original/index.m3u8",
  "timelineId": "REPLACE_WITH_MEDIA_CONTRACT_TIMELINE_ID",
  "frameCount": 9000,
  "fps": 30,
  "width": 1080,
  "height": 1920,
  "layout": "original",
  "segmentDuration": 2,
  "canonicalVideoSha256": "REPLACE_WITH_CONTRACT_SHA256"
}
```

All values above are illustrative. Generate real values from the canonical media and contract. Transparent output requires its own `packed_matte` descriptor, matte digest and exact `matteLayout`. A bare m3u8 URL is insufficient.

## 2. Backend token exchange

Your `/api/runtime-token` endpoint must authenticate the user, authorize the selected template and apply rate limits before calling Kasamila. The following helpers are application-specific:

```javascript
export async function createAvatarRuntime(req, res) {
  const { avatarId, templateCode, outputMode = 'original' } =
    authorizeAvatarRequest(req.user, req.body);
  const upstream = await fetch('https://www.kasamila.com/api/v1/runtime/sessions', {
    method: 'POST', signal: AbortSignal.timeout(15000),
    headers: {
      Authorization: `Bearer ${process.env.KASAMILA_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      avatar_id: avatarId, template_code: templateCode,
      origin: 'https://app.example.com',
      input_modes: ['file', 'audio_url', 'pcm_stream', 'tts_stream'],
      output_mode: outputMode, max_duration_seconds: 600
    })
  });
  const payload = await upstream.json();
  if (!upstream.ok) return res.status(upstream.status).json({
    error: payload.error?.code || 'kasamila_runtime_failed'
  });
  const runtime = payload.data;
  if (runtime.build_mode !== 'geometry' || runtime.media_delivery !== 'hls') {
    // End the newly created Session using your authorized cleanup path.
    throw new Error('Unsupported template contract');
  }
  const templateMedia = await mediaDescriptorStore.get(
    `${avatarId}-${templateCode}`, runtime.output_mode);
  res.setHeader('Cache-Control', 'no-store');
  return res.json({
    sessionToken: runtime.client_token, expiresAt: runtime.expires_at,
    sdkVersion: runtime.sdk_version, buildMode: runtime.build_mode,
    mediaDelivery: runtime.media_delivery, outputMode: runtime.output_mode,
    templateMedia
  });
}
```

Use the **actual** output mode for descriptor lookup. If initialization/lookup fails after Session creation, terminate the lease; do not leak a billed Session.
Keep Keys out of the browser, URLs, installed packages, model context and logs. Do not accept arbitrary media/script URLs from the frontend. Origin must exactly equal the page's `location.origin`. Renew both Runtime authorization and media signing when required.

## 3. Browser initialization

```javascript
const response = await fetch('/api/runtime-token', {
  method: 'POST', credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    avatarId: '999000000001', templateCode: '001', outputMode: 'original'
  })
});
const bootstrap = await response.json();
if (!response.ok) throw new Error(bootstrap.error || 'Runtime bootstrap failed');
if (bootstrap.sdkVersion !== '1.11.6') throw new Error('Unexpected Runtime SDK');
const player = await Kasamila.create({
  element, sessionToken: bootstrap.sessionToken,
  templateMedia: bootstrap.templateMedia, hlsScriptUrl: '/vendor/hls.min.js'
});
```

Replace the fictional ID with an authorized template. Use the saved Manifest mouth profile/calibration. Do not force I or overwrite calibration on every initialization. C is the default; G/H/I are explicit comparisons.

## 4. Teeth and oral completeness

Teeth are generated by the V7 renderer, independent of media hosting. They do not need to be baked into HLS or uploaded through a separate "teeth API."

Required chain: Manifest V7 mesh/config/geometry/inner-lip materials → official renderer → official teeth texture → saved `teeth_scale` → SDK Canvas compositing.

| Check | Expected | Fix |
| --- | --- | --- |
| `Kasamila.version` | `1.11.6` | Clear obsolete JS, Service Worker and CDN caches |
| Teeth texture | `https://www.kasamila.com/web/common/teeth_cavity_texture.png` HTTP 200 | Correct CSP/CORS/proxy configuration |
| `player.getMouthConfiguration().parameters.teeth_scale` | Greater than zero if teeth are intended | Remove old parameter overrides |
| Console | No `Geometry v7 oral material is incomplete` | Repair template assets; no old-renderer fallback |
| Canvas/DOM | One SDK oral rendering chain | Remove legacy masks, clips, teeth layers and overlays |

Log only non-sensitive diagnostics such as SDK version, output mode and calibration values. Never log Tokens or signed asset/descriptor URLs.

## 5. CORS and CSP

```text
script-src 'self' https://www.kasamila.com;
connect-src 'self' https://www.kasamila.com https://media.example.com;
media-src 'self' https://www.kasamila.com https://media.example.com blob:;
worker-src 'self' blob:;
img-src 'self' https://www.kasamila.com data: blob:;
```

Allow official textures with `img-src`, Blob mouth/geometry Workers with `worker-src` and API/model/geometry/media fetching with `connect-src`.
All HLS playlists, `init.mp4` and `.m4s` segments need CORS for the page Origin. Use HTTPS except supported localhost development.

## 6. Audio, idle and cleanup

The template starts at frame 0 after geometry/textures/runtime are ready and loops during idle. Speech continues from the current idle position. Video-frame PTS is the only template clock, with fixed `1.0` rate. Never correct internal video time/rate manually.

Geometry gzip/JSON parsing runs in a Blob Worker. If motion stalls, verify CSP, Range `206` responses and HLS buffering before blaming audio inference.

Use real TTS files or mono Int16/Float32 PCM with the actual sample rate. Browser speechSynthesis is only a timing approximation.
`stop()` stops audio/mouth input; `destroy()` releases video/HLS/audio/Workers/WebGL/heartbeats and ends the Runtime lifecycle. Silence or a hidden canvas still incurs ordinary Runtime billing.

## 7. Error handling and acceptance

| Error | Action |
| --- | --- |
| `origin_not_allowed` / `runtime_origin_mismatch` | Correct exact Key/page Origin |
| `runtime_session_expired` | Create a fresh Session and appropriate descriptor |
| `runtime_media_contract_invalid` | Repair template data |
| `Template media timeline does not match…` | Deliver the correct template revision |
| `Geometry templates require HLS…` | Supply the full descriptor |
| HLS 403/fatal network error | Renew signing or show recoverable error; do not let clocks drift |
| Periodic stalls/speed variation | Worker CSP, Range `206`, HLS prefetch, no manual clock adjustment |
| Incomplete oral material | Stop initialization; no legacy fallback |

Do not leave a half-initialized Canvas running after catching an error.

Before release, verify geometry-only discovery, backend-only Keys, least-privilege modes, correct original/transparent descriptors, full V7 teeth and occlusion, C default, actual file/TTS/PCM input, short and five-minute-plus seek/loop/network recovery, and real desktop/mobile device memory. End Sessions on teardown or intentional idle suspension; do not confuse `stop()` with ending billing.

Concurrency changes do not require a new SDK binary or template rebuild. Key-management consumers should follow the [separate concurrency guide](runtime_concurrency_api_sdk_upgrade_20260923.en.md).
