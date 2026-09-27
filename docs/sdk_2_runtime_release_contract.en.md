> SDK 2.1: encrypted GLSL/ONNX with temporary Runtime licensing; no caller-side key setup. See [AILIVE upgrade and protection notes](sdk_2_1_protected_runtime.en.md). Pinned 2.0.0 remains supported.

English | [简体中文](sdk_2_runtime_release_contract.md)

# SDK 2.1.0: one migration, independently versioned Runtime releases

Release: SDK 2.1.0. Verify actual production availability through /api/v1/runtime/releases.
Migration from SDK 1 is breaking: SDK 1, mutable entry points and fine-tuned templates have no compatibility layer.
The public SDK 2.0 interface remains compatible and pinned 2.0.0 sessions remain supported.
Routes remain under /api/v1. The protocol is kasamila-runtime-v1 and the geometry contract is
kasamila-geometry-track-v2. V7, default profile C and explicit candidate I remain unchanged.
Existing eligible geometry models do not need retraining. This release does not update the Worker.

## 1. Declare version and capabilities on your backend

Permanent Keys belong on your backend, never in browser code, logs or model context.
Call POST /api/v1/runtime/sessions using your Key:

```json
{
  "avatar_id": "999000000001",
  "template_code": "001",
  "origin": "https://app.example.com",
  "input_modes": ["file", "audio_url", "pcm_stream", "tts_stream", "rtc"],
  "output_mode": "original",
  "max_duration_seconds": 600,
  "client": {
    "sdk_version": "2.1.0",
    "protocol": "kasamila-runtime-v1",
    "geometry_contract": "kasamila-geometry-track-v2",
    "update_policy": "pinned",
    "required_capabilities": ["geometry-v7", "hls"]
  }
}
```

The example ID is fictional. Origin must match an Origin authorized on your Key.
The response data contains an sdk descriptor: version, protocol, geometry_contract,
capabilities, update_policy, loader_url, esm_url, package_url, package_sha256 and entry_sha256.
Return client_token and the unchanged sdk object to your browser.
Do not construct SDK URLs from a global "latest" version. sdk_version summarizes the selected session version.

- pinned (default): exact requested version, recommended for production.
- stable: explicitly select the stable channel within the requested major version, protocol and required capabilities.
  This affects newly created sessions only.
- preview: explicit testing channel; returns 409 when no preview release is configured.

GET /api/v1/runtime/releases lists releases/channels; it is not a forced upgrade instruction.
Unsupported versions/protocols/capabilities return 409 runtime_contract_unsupported before session creation or quota reservation.
An omitted client uses the fixed SDK 2.1.0 baseline; integrations should still declare it explicitly.

## 2. Load the session-selected full package

```html
<div id="avatar" style="width:540px;height:960px"></div>
<script type="module">
  import { loadKasamila } from "https://www.kasamila.com/sdk/bootstrap/1/loader.mjs";
  // Authenticate/authorize/rate-limit this endpoint on YOUR backend.
  const { sessionToken, sdk, templateMedia } = await fetch("/api/runtime-token", {
    method: "POST", credentials: "same-origin"
  }).then(r => r.json());
  const Kasamila = await loadKasamila(sdk, "https://www.kasamila.com");
  const player = await Kasamila.create({
    element: document.querySelector("#avatar"), sessionToken, templateMedia
  });
  // In a user gesture: await player.setAudioFile(file);
  // When finished: await player.destroy();
</script>
```

The bootstrap verifies trusted API Origin, exact version path and entry SRI.
The SDK verifies the selected session version, protocol and release.json digest before loading dependencies.
The complete immutable /sdk/releases/2.1.0/ tree includes the renderer, hls.js, Audio2Viseme,
ONNX/WASM, Worklet and teeth texture. Published bytes must never be overwritten.
Packages have one-year immutable caching. Do not mix mutable /web/js, /web/weights or /web/common resources.
The HLS decoder is bundled; external hlsScriptUrl is unnecessary.

Only one SDK version can be loaded in a document. Reload or use a separate iframe when switching versions.
Do not hot-swap an active session or reject an older selected release merely because a newer server release exists.
File/MIC/PCM/RTC, calibration and Agent acknowledgement interfaces retain their behavior.
You still host template media. The descriptor timelineId, digest, fps, dimensions and timing must match the geometry contract.
After regenerating a template, new sessions need the matching media generation; existing sessions keep their pinned generation.

## 3. Session snapshots and lifecycle

Creation freezes the SDK descriptor, artifact UUIDs/generation, dimensions, fps and mouth defaults.
Manifest returns protocol and artifact_generation and reads that snapshot rather than new channel settings, calibration or retraining output.
Keep old SDK packages and retain template artifacts until dependent sessions end/expire.
Archival, deletion, Key revocation and access withdrawal may still revoke access.
SDK 1 sessions return runtime_session_migration_required; create new sessions after migration.

Ordinary API/SDK sessions are metered from creation using server elapsed time, including silence, idle and hidden pages.
stop() only stops audio; destroy() or authorized session termination settles and returns unused reserved seconds.
The runnable example validates media configuration before creating a billable session.
Agent session creation accepts the same client object. Delivery and receipts remain Token/Origin-bound.
Without explicit termination, the lease can consume its full duration; client heartbeat timing cannot reduce billed duration.

## 4. One-time AILIVE and third-party checklist

1. Declare client with pinned 2.1.0 on your backend and return the sdk descriptor unchanged.
2. Remove /web/sdk/kasamila.js?v=..., direct renderer scripts, old overlays and Service Worker caches for mutable SDK paths.
3. Load through the bootstrap above. Do not preload another release's dependencies.
4. Allow the trusted Kasamila Origin in script-src/connect-src, wasm-unsafe-eval where required,
   and worker-src blob:. Allow your media Origin in media-src/connect-src as appropriate.
   Do not disable CSP globally.
5. Preserve self-hosted HLS CORS/Range, media signature refresh and timeline/digest validation.
6. Test local audio, PCM/RTC, teeth, C/G/H/I, transparency, seek/loop, expiry, destruction settlement and Agent receipts.
7. Canary internally after the server supports SDK 2.1.0. On failure stop the canary;
   do not fall back to unsupported SDK 1.

Future additions use capability negotiation and explicit channels.
Breaking changes require a new protocol/major version, not overwriting old package bytes.
Support deadlines and security revocations need separate announcements; support is not promised indefinitely.

## 5. Browser security boundary

Immutable packages and SRI protect against accidental mixing and unauthorized supply-chain changes, not cracking or DRM.
Browser SDK code, generic audio models and authorized geometry/materials can be extracted.
Origin/CORS cannot prevent forged requests from non-browser clients.
Backend Key secrecy, short tokens, quota/billing and authorization protect online APIs,
but cannot guarantee that already downloaded models cannot be reused offline.
If absolute post-payment execution control is required, choose a separately designed server-rendered/inferred product.
Obfuscation, WASM and client-side encryption cannot provide that guarantee.
