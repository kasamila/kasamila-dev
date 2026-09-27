> SDK 2.1: encrypted GLSL/ONNX with temporary Runtime licensing; no caller-side key setup. See [AILIVE upgrade and protection notes](sdk_2_1_protected_runtime.en.md). Pinned 2.0.0 remains supported.

[English](api_v1_geometry_runtime_guide.en.md) | [简体中文](api_v1_geometry_runtime_guide.md)

# Geometry models: API / Web SDK integration

> SDK 2.1.0 released: read the [new Runtime release contract](sdk_2_runtime_release_contract.en.md) before integration. SDK 1 and mutable entry URLs are retired. This guide's fixed version checks apply only to explicitly pinned examples, not to a server-global latest version. Forward the Session response's sdk object from your backend and load it with the bootstrap. HLS is bundled. Production supports this release; use the one-time migration checklist.


For Kasamila API v1 and Web SDK **2.1.0**. Geometry training is the supported template-processing mode. It computes face tracking, per-frame MediaPipe 468-point geometry, V7 oral assets, materials and calibration; it does not train person-specific neural-network weights.

The V7 chain reconstructs lips, oral surfaces, occlusion and procedural teeth. SDK 2.1.0 retains the existing dynamic closed-lip contact layer using stable template materials, intended to reduce source-teeth/highlight artifacts in idle and closed-mouth frames. It does not guarantee removal of every artifact; assess each template's actual visual result.

See the [Runtime/Agent guide](api_v1_runtime_integration_guide.en.md), [upgrade checklist](sdk_1_11_0_third_party_migration.en.md), and [runnable browser example](../examples/geometry-runtime-web/README.en.md).

## 1. Architecture and ownership

```text
Owner uploads source video
    -> Kasamila geometry training: V7 + 468-point tracking + rig + tracks
        -> Kasamila: geometry chunks, rig, materials, calibration and Manifest
        -> Canonical media delivery: original MP4 or packed-matte MP4
    -> Integrator: package canonical media as 2-second HLS and host on its CDN
Backend: permanent API Key -> short-lived Runtime Token
Browser: integrator HLS + Kasamila geometry + audio -> WebGL avatar
```

Kasamila provides model data and authorized Runtime assets. The integrator owns production media storage, CDN delivery, bandwidth, signing and HLS hosting. Short and long templates use **the same HLS interface**; duration does not select a separate progressive-download protocol.

## 2. Production contract and template creation

| Item | Contract |
| --- | --- |
| Build mode | `build_mode=geometry`; may be omitted |
| Creation credits | `geometry_templates`; one credit for each successful ready template |
| Person-specific neural model | Not trained |
| Preprocessing | V7 oral processing, 468 points, dynamic ROI, quality gates |
| Browser renderer | Complete V7 geometry/material/occlusion/teeth chain |
| Default mouth profile | C |
| Explicit candidates | G/H/I; I remains opt-in |
| Media and data | HLS + aligned geometry chunks for every duration |

MouthUNet fine-tuning and the V7+v29 hybrid mode are retired. Their historical records cannot be used for new builds, retries or Runtime sessions.

Template management/build submission uses an authenticated Portal login with CSRF protection, **not a Runtime API Key**. Integrators that only consume ready templates can skip build submission.

```http
POST /api/v1/avatars/{avatar_id}/templates/{template_code}/train
Content-Type: application/json
X-CSRF-Token: <Portal CSRF token>
Idempotency-Key: geometry-example-001-v1

{
  "upload_id": "00000000-0000-4000-8000-000000000000",
  "background_mode_confirmation": "original",
  "build_mode": "geometry",
  "epochs": 1,
  "priority": 0,
  "max_retries": 2
}
```

Use the actual upload ID. `epochs` is retained for compatibility and treated as 1 in geometry mode.
Inspect template-creation entitlement with authenticated `GET /api/v1/training/entitlement`.

## 3. Select a template and authorize Runtime

On your backend, query `GET /api/v1/runtime/catalog?visibility=all&orientation=all` using the permanent Key.

```json
{
  "template_id": "999000000001-001",
  "build_mode": "geometry",
  "media_delivery": "hls",
  "available_output_modes": ["original", "transparent"],
  "transparent_behavior": "alpha_composite",
  "mouth_profile": "C",
  "mouth_parameters": {
    "teeth_scale": 1, "mask_offset": 0,
    "openness_scale": 1, "width_scale": 1,
    "left_openness_scale": 1, "left_width_scale": 1
  }
}
```

The example ID is fictional. Use the catalog's authorized IDs. Catalog responses are not long-lived video URLs; geometry URLs are issued through the short-lived Runtime Manifest.

Your authenticated backend then creates `POST /api/v1/runtime/sessions`:

```json
{
  "avatar_id": "999000000001",
  "template_code": "001",
  "origin": "https://app.example.com",
  "input_modes": ["file", "audio_url", "pcm_stream", "tts_stream"],
  "output_mode": "original",
  "max_duration_seconds": 600
}
```

Use permanent-Key Bearer authorization. Return only the short-lived client Token and a trusted descriptor matching the response's **actual** `output_mode`.
Key response fields include `session_id`, `client_token`, `expires_at`, `sdk_version`, `build_mode`, `media_delivery`, `output_mode`, `output_behavior`, `mouth_profile` and `mouth_parameters`.

Protect your token-exchange endpoint with end-user authentication, template authorization and rate limits. Do not log Keys, Tokens, complete Manifests or signed URLs. Ordinary Runtime sessions are billed from creation, including idle; see [billing and termination](api_v1_runtime_integration_guide.en.md).

## 4. Canonical media and HLS packaging

Obtain the authorized canonical `preview_video` and `media_contract` through Portal/delivery. For transparent output obtain `preview_video_matte`. Do not substitute an unprocessed source video.

Requires Python 3 and FFmpeg/ffprobe. Run from the public repository root. The variables below must be filled from the delivered contract, not estimated manually.

### Original background

```bash
python scripts/package_template_hls.py canonical.mp4 ./hls-original \
  --public-url https://media.example.com/avatars/999000000001/001/original \
  --timeline-id "$TIMELINE_ID" \
  --frame-count "$FRAME_COUNT" --fps "$FPS" \
  --width "$WIDTH" --height "$HEIGHT" \
  --layout original --source-sha256 "$CANONICAL_VIDEO_SHA256"
```

### Transparent background

Use the canonical packed-matte input, not ordinary color HLS:

```bash
python scripts/package_template_hls.py canonical-matte.mp4 ./hls-transparent \
  --public-url https://media.example.com/avatars/999000000001/001/transparent \
  --timeline-id "$TIMELINE_ID" \
  --frame-count "$FRAME_COUNT" --fps "$FPS" \
  --width "$WIDTH" --height "$HEIGHT" \
  --layout packed_matte \
  --matte-layout-json "$MATTE_LAYOUT_JSON" \
  --source-sha256 "$PACKED_MATTE_SHA256"
```

Use the exact `matte_layout` from the contract. One supported layout example is:

```json
{"color_region":[0,0,0.6666666666666666,1],"matte_region":[0.6666666666666666,0,0.3333333333333333,0.5]}
```

The tool checks source SHA-256, frame rate, frame count where reported, duration, dimensions and layout. It produces independent two-second fMP4 HLS segments and `kasamila-media.json` in a new/empty output directory. Upload the complete directory: `index.m3u8`, `init.mp4`, all `.m4s` segments and the descriptor. Do not transcode them again.

### Descriptor fields

| Field | Requirement |
| --- | --- |
| `delivery` | `hls` for geometry |
| `url` | Your HTTPS HLS VOD playlist |
| `timelineId` | Exact Manifest `media_contract.timeline_id` |
| `frameCount` / `fps` | Canonical constant-frame-rate timeline |
| `width` / `height` | Logical avatar dimensions; packed physical dimensions derive from layout |
| `layout` | `original` or `packed_matte` |
| `segmentDuration` | Same as `geometry_track.chunk_seconds`; currently 2 |
| `canonicalVideoSha256` | Digest of the packaging input; original and matte use different contract digests |
| `matteLayout` | Required for packed matte and must exactly match its contract |

Store original and transparent descriptors separately. Select based on the actual Session output mode, not merely the requested mode.

## 5. Browser initialization and buffering

```html
<div id="avatar" style="width:540px;height:960px"></div>
<script type="module">
  import { loadKasamila } from "https://www.kasamila.com/sdk/bootstrap/1/loader.mjs";
  const response = await fetch("/api/runtime-token", {
    method: "POST", credentials: "same-origin"
  });
  const bootstrap = await response.json();
  if (!response.ok) throw new Error("Runtime bootstrap failed");
  const Kasamila = await loadKasamila(bootstrap.sdk, "https://www.kasamila.com");
  const player = await Kasamila.create({
    element: document.querySelector("#avatar"),
    sessionToken: bootstrap.sessionToken,
    templateMedia: bootstrap.templateMedia
  });
  window.addEventListener("pagehide", () => player.destroy(), { once: true });
</script>
```

Safari can use native HLS. Other supported browsers use the matching hls.js bundled inside the immutable SDK package.

The SDK waits for the first geometry chunk, textures and mouth runtime before starting at frame 0. HLS forward buffering targets 12 seconds with a 30-second maximum; backward buffering is limited to 15 seconds. Geometry retains six chunks, prefetches up to three, and prefetches chunk 0 near loop completion.

Geometry gzip/JSON decoding runs in a Blob Worker rather than the rendering main thread. Decoded video-frame PTS is the template clock and playback rate stays `1.0`. If geometry is unavailable, the media clock can pause to preserve alignment; normal prefetching should prevent periodic stalls. Do not change the SDK's internal `video.currentTime` or `playbackRate` to "catch up."

The SDK rejects missing descriptors, mismatched timeline/frame count/fps/dimensions, inconsistent segment duration, incorrect output layout or mismatched canonical-media digest. Do not bypass validation.

### Audio and profiles

```javascript
await player.setAudioFile(file);
await player.setAudioUrl(corsEnabledTemporaryUrl);
await player.setPcmStream(readable, { sampleRate: 16000 });
await player.setPcmStream(ttsReadable, { mode: 'tts_stream', sampleRate: 16000 });
await player.setMicrophone();
await player.setMediaStreamTrack(remoteRtcAudioTrack);
await player.connectAudioNode(node, audioContext, { mode: 'tts_stream' });
await player.setProfile('C');
const mouth = player.getMouthConfiguration();
player.stop();
await player.destroy();
```

Authorize the corresponding `input_modes` and unlock audio via a user gesture. Use real decodable audio or mono Int16/Float32 PCM with its actual sample rate. Browser speechSynthesis is an approximation, not production quality evidence.

C is the production default; G/H are explicit comparisons and I is an explicit geometry-only candidate. Player changes do not save template defaults; use authorized Portal/template PATCH management to persist them.

### Idle and timeline

Initialization starts the template at frame 0. Idle plays the entire template and loops. Speech continues from the current idle position, not frame 0. After speech, the template continues. `stop()` stops audio/mouth input, not video playback or billing. `destroy()` ends the lifecycle.

## 6. CDN, CORS and CSP

Apply CORS to playlists, initialization segments and every media segment, not only the top-level m3u8:

```http
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Methods: GET, HEAD, OPTIONS
Access-Control-Expose-Headers: Content-Length, Content-Range, Accept-Ranges, ETag
```

MIME types: `.m3u8` → `application/vnd.apple.mpegurl`; `.m4s` / `init.mp4` → `video/mp4`; descriptor → `application/json`.

Starting CSP (adapt domains to your application):

```text
script-src 'self' https://www.kasamila.com;
connect-src 'self' https://www.kasamila.com https://media.example.com;
media-src 'self' https://www.kasamila.com https://media.example.com blob:;
worker-src 'self' blob:;
img-src 'self' https://www.kasamila.com data: blob:;
```

The SDK reads mouth/geometry Worker code, textures and rendering assets from its Kasamila Origin and creates same-page Blob Workers. Both `connect-src` access and `worker-src blob:` are required.

Load the official `/sdk/releases/2.1.0/kasamila.js` and call `Kasamila.create()`. Do not directly instantiate internal renderer files or mirror only the entry JS. Any approved offline mirror must preserve the complete matching resource tree and paths.

## 7. Check actual transparency

```javascript
const output = player.getOutput();
// requestedMode, mode, behavior, strategy, availableModes, transparentCanvas
```

Only `mode === 'transparent'` with `transparentCanvas === true` confirms a transparent Canvas. Ordinary-background templates may return `original_passthrough`. Transparency is not inferred from a green-looking source, a filename or the requested mode alone.

## 8. Errors and deployment acceptance

| Error / symptom | Action |
| --- | --- |
| `origin_not_allowed` | Add the exact Session Origin to the Key allowlist |
| `runtime_origin_mismatch` | Match the browser Origin to the Token |
| `runtime_session_expired` | Authorize a new Session through your backend |
| `runtime_media_contract_invalid` | Repair/publish template assets; do not bypass client checks |
| `Template media timeline does not match…` | Replace a stale or manually modified descriptor |
| `Geometry templates require HLS…` | Progressive delivery is not supported for geometry |
| `HLS segment duration…` | Repackage using the contract's two-second chunks |
| HLS 403 / expired signature | Refresh media signing; validity must cover the Session |
| HLS CORS failure | Check every playlist/init/segment response |
| Worker blocked | Fix Blob Worker and Kasamila connect CSP |
| Periodic stalls / speed variation | SDK version, Range `206`, prefetch, no manual clock corrections |
| No teeth | Texture HTTP 200, `teeth_scale > 0`, no old mouth overlay |
| I unavailable | Geometry-only candidate, not an automatic default |
| Local audio does not drive lips | Authorized `file` mode, audio gesture, decodable format |

Before production, verify:

- Permanent Keys stay on the backend; token exchange authenticates users and template access.
- Both original and packed-matte descriptors match digest, timeline, fps, frame count and logical size.
- HLS is independent two-second fMP4 VOD; seek, loop, segment crossings, network loss and expiry work.
- Playback remains `1.0` without fixed two-second pauses or boundary fast-forward.
- CDN cache keys retain required signing parameters; CORS/MIME and expiry are correct.
- Full V7 assets render teeth and inner-lip occlusion; no direct legacy renderer fallback.
- C remains default unless a profile is explicitly selected; permissions are minimal.
- Actual Windows/macOS/iOS/Android devices pass audio unlock, background restore and long-run memory tests.
- SPA teardown/page exit ends Runtime with `destroy()`.
