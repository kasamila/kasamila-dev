# Runnable geometry Runtime browser example

Targets Web SDK **2.0.0**.
[Source repository](https://github.com/kasamila/kasamila-dev/tree/main/examples/geometry-runtime-web) · [Geometry contract](../../docs/api_v1_geometry_runtime_guide.en.md) · [Upgrade guide](../../docs/sdk_1_11_0_third_party_migration.en.md)

The demo exchanges a server-only API Key for a short-lived Token, loads the official SDK and drives caller-hosted HLS template media with uploaded audio.
It is a localhost demo, **not a production authentication gateway**.

## 1. Requirements

- Node.js 20+ and npm.
- A Key authorized for your selected ready geometry template and exact application Origin.
- Canonical template media and its delivered `media_contract`.
- Python 3 and FFmpeg/ffprobe if you need to package the canonical media.

Clone/download the public repository. From its root:

```bash
cd examples/geometry-runtime-web
npm ci
cd ../..
```

The example pins HLS 1.7.3 and loads SDK 2.0.0 from the official site. Do not copy only the WebGL renderer or change the production geometry chain.

## 2. Prepare media

Use the authorized canonical original MP4 or packed-matte MP4. Obtain timeline ID, frame count, fps, logical dimensions, media digest and matte layout from the contract.
See the [HLS packaging commands](../../docs/api_v1_geometry_runtime_guide.en.md).

Run `scripts/package_template_hls.py` from the repository root. It produces a new HLS directory with `index.m3u8`, `init.mp4`, `.m4s` segments and `kasamila-media.json`. Upload the entire output without transcoding it again.

The example descriptor templates under `examples/geometry-runtime-web/config` contain placeholders. Do not guess timeline values or reuse an original descriptor for transparent output.

## 3. Configure and launch

PowerShell, from the public repository root:

```powershell
$env:KASAMILA_API_KEY='ks_test_REDACTED'
$env:KASAMILA_AVATAR_ID='999000000001'
$env:KASAMILA_TEMPLATE_CODE='001'
$env:KASAMILA_OUTPUT_MODE='original'
$env:KASAMILA_MEDIA_DESCRIPTOR='D:\path\to\hls\kasamila-media.json'
$env:APP_ORIGIN='http://127.0.0.1:8788'
node examples/geometry-runtime-web/server.mjs
```

Bash:

```bash
export KASAMILA_API_KEY='ks_test_REDACTED'
export KASAMILA_AVATAR_ID='999000000001'
export KASAMILA_TEMPLATE_CODE='001'
export KASAMILA_OUTPUT_MODE='original'
export KASAMILA_MEDIA_DESCRIPTOR='/path/to/hls/kasamila-media.json'
export APP_ORIGIN='http://127.0.0.1:8788'
node examples/geometry-runtime-web/server.mjs
```

Replace the redacted Key and fictional Avatar ID with your authorized configuration. Do not commit real credentials or descriptors with signed URLs.
Open `http://127.0.0.1:8788`. The Key allowlist must contain that exact Origin; `localhost` and `127.0.0.1` are different Origins.
Uploading/playing audio may need a user gesture. Creating this ordinary Runtime Session incurs API/SDK usage; it is not Portal's free preview.

## 4. Production hardening

- Authenticate your users and authorize templates before minting Tokens; enforce rate limits.
- Use HTTPS for pages, HLS and audio, except supported localhost development.
- Allow page-Origin CORS for all HLS playlists/init/segments.
- Use `application/vnd.apple.mpegurl` for m3u8 and `video/mp4` for fMP4.
- CSP must allow the official SDK, Kasamila API/assets, your media domain, Blob Workers and official texture images.
- Verify SDK version and intended `teeth_scale > 0` after initialization.
- Never log permanent Keys, Runtime Tokens or signed asset URLs.
- End a failed bootstrap lease; call `destroy()` on teardown. `stop()` alone does not end billing.
- Choose media descriptors using the Session's actual output mode.

The demo server binds to loopback. Deploying it publicly without business authentication would let visitors consume your Key's billable quota.
Full errors, transparent-media requirements and acceptance tests are in the [geometry guide](../../docs/api_v1_geometry_runtime_guide.en.md).

SDK 2.0.0 release candidate. Configure backend KASAMILA_SDK_VERSION=2.0.0 and KASAMILA_UPDATE_POLICY=pinned. The backend forwards sdk, and the browser loads the immutable bootstrap. HLS is bundled; no external HLS decoder is required. Follow the [release contract](../../docs/sdk_2_runtime_release_contract.en.md). Wait for the production rollout notice before cutover.
