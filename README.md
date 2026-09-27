# Kasamila developer resources

[English](README.md) | [简体中文](README.zh.md)

Public API/SDK documentation, upgrade notes and runnable examples for [Kasamila](https://www.kasamila.com/portal).
The system core remains private. This repository contains no training Worker, backend business code, customer media, geometry models or credentials.

## Documentation and releases

- [API / SDK and MCP/Agent quick start](docs/api_v1_runtime_integration_guide.en.md)
- [Geometry models and HLS media](docs/api_v1_geometry_runtime_guide.en.md)
- [Developer handbook](docs/kasamila_api_and_sdk_guide.en.md)
- [Third-party SDK upgrade guide](docs/sdk_1_11_0_third_party_migration.en.md)
- [Workspace / Key concurrency](docs/runtime_concurrency_api_sdk_upgrade_20260923.en.md)
- [Integration examples and roadmap](docs/integration-examples.en.md)
- [Release notes](CHANGELOG.md)

Every guide has an English/Chinese language switch. Guide filenames preserve earlier compatibility; the current documented Web SDK is **2.1.0**.
SDK 2.1.0 adds encrypted resources and automatic temporary licensing; pinned 2.0.0 remains supported.
Verify availability through the production release registry and complete application acceptance before cutover.
Examples load the official SDK from Kasamila, not a copied rendering core.
Example Avatar ID `999000000001` is fictional; replace it with a template accessible to your Key.

## Runnable examples

- [Geometry browser demo](examples/geometry-runtime-web/README.en.md)
- [PCM / RTC audio bridge](examples/audio-bridge/README.en.md)
- [Seven realtime voice integrations](examples/realtime-integrations/README.en.md)

Requires Node.js 20+. Python 3 and FFmpeg/ffprobe are needed only to package your canonical media.

```bash
cd examples/geometry-runtime-web
npm ci
# Configure backend-only KASAMILA_API_KEY, KASAMILA_AVATAR_ID,
# APP_ORIGIN and KASAMILA_MEDIA_DESCRIPTOR as documented.
npm start
```

The server binds to localhost and is not a production authentication gateway.
Protect token issuance with your own login, template authorization and rate limits.
Ordinary Runtime Sessions are billed while running, even when silent/hidden. End them with `destroy()` or authorized Session termination; stopping audio is not enough.
Portal's login-bound previews are free and cannot be reused by third-party applications.

## Local checks without billed Sessions

From the repository root:

```bash
node --test examples/audio-bridge/bridge.test.mjs
python scripts/package_template_hls.py --help
```

Repository CI tests the bridge contract and example syntax/dependencies. It does not claim credentialed production playback or provider end-to-end validation.

## Platform adapters

OpenAI Realtime, Gemini Live, Qwen, TEN, LiveKit Agents, Pipecat and Doubao examples are now available in the [realtime integration suite](examples/realtime-integrations/README.en.md) (Node.js 22+).
Cloud relays, RTC adapters and the official-demo Doubao hook have different setup requirements. Local contract tests do not claim credentialed provider end-to-end certification.

## Publication policy

Publish reviewed consumer-facing documents, examples and upgrade notes only.
Never commit permanent/session Keys, provider credentials, signed asset URLs, private template IDs, customer media or internal audits.
API/SDK updates must update the guide, changelog, compatibility notes and affected examples together.

Portal's Developer Center points here for documentation and releases; [blog tutorials](https://www.kasamila.com/portal/blog) remain on the site. Existing site-guide URLs remain compatible.
Documentation is available in English and Chinese; this does not claim full translations into all Portal UI languages.
License: [Apache-2.0](LICENSE); external dependencies retain their own licenses.

## SDK 2 migration

[Immutable Runtime release contract and upgrade checklist](docs/sdk_2_runtime_release_contract.en.md)
Pinned is the default. New stable releases do not hot-swap active sessions or force pinned integrations to upgrade.

- [SDK 2.1 encrypted Runtime / AILIVE upgrade](docs/sdk_2_1_protected_runtime.en.md)
