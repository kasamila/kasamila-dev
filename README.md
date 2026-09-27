# Kasamila developer resources

Public documentation, API/SDK upgrade notes and integration examples for [Kasamila](https://www.kasamila.com/portal).
系统核心在私有仓库维护；本仓库不包含训练 Worker、后端业务代码、客户视频、几何模型或任何凭据。

## Start here / 从这里开始

- [API / SDK quick start](docs/api_v1_runtime_integration_guide.md)
- [Geometry models & HLS media](docs/api_v1_geometry_runtime_guide.md)
- [Complete integration guide](docs/kasamila_api_and_sdk_guide.md)
- [Third-party SDK upgrade guide](docs/sdk_1_11_0_third_party_migration.md)
- [Workspace and Key concurrency](docs/runtime_concurrency_api_sdk_upgrade_20260923.md)
- [Runnable browser example](examples/geometry-runtime-web/README.md)
- [PCM / RTC audio bridge](examples/audio-bridge/README.md)
- [Changelog](CHANGELOG.md)

Current examples target Web SDK **1.11.6**, loaded from the official Kasamila site.
本仓库发布 SDK 接入说明与升级样例，不复制 SDK 渲染核心或声称提供独立离线 SDK。
示例中的 `999000000001` 为虚构编号，必须替换为账户可访问的数字人编号。

## Run the browser example

Requires Node.js 20+; Python 3 and FFmpeg/ffprobe are needed only for packaging your canonical template media.

```bash
cd examples/geometry-runtime-web
npm install
# Set your server-only KASAMILA_API_KEY, KASAMILA_AVATAR_ID,
# APP_ORIGIN and KASAMILA_MEDIA_DESCRIPTOR; see the example README.
npm start
```

The demo binds to localhost and is not a production authorization gateway.
Permanent Keys must stay on your backend. Protect token issuance with your own authentication, authorization and rate limits.
SDK/API Runtime sessions are metered while running, including silent/idle time.
Stopping audio or hiding the canvas does not stop billing: destroy the player/session when finished.

## Test without creating a billed session

```bash
node --test examples/audio-bridge/bridge.test.mjs
python scripts/package_template_hls.py --help
```

Tests cover the audio-bridge contract. Complete live provider integrations require separate credentialed end-to-end tests.

## Platform integrations

Gemini Realtime, GPT Realtime, LiveKit and Pipecat complete adapters are **planned, not yet published or verified**.
The supplied vendor-neutral bridge can accept decoded PCM16 or a remote RTC audio track.
Do not confuse microphone input with an Agent's generated audio.

## Publication policy

Only reviewed documentation and consumer-side examples are published here.
Never commit permanent/session tokens, provider keys, signed asset URLs, private template IDs, media or internal release audits.
API/SDK changes must update the guide, changelog, compatibility notes and affected examples together.
Production version notes: [releases](https://www.kasamila.com/portal/releases).
Tutorials: [blog](https://www.kasamila.com/portal/blog).

Content is primarily Chinese, with English navigation. Untranslated guides are not claimed to have 15 language versions.
License: existing [Apache-2.0](LICENSE); external dependencies retain their own licenses.
