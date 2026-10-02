# Kasamila developer resources

新增 [Grok / ElevenLabs / 现有 Vapi 助手 / Deepgram / Hume EVI / Dify](examples/realtime-integrations/voice-platforms/README.md) 和 [OBS 浏览器源 / Streamlabs 共用主持组件](examples/realtime-integrations/obs-streamlabs/README.md)。透明画面、音频输入、队列、打断、场景与结束共用底层；[两篇博客正文](content/blog/README.md) 提供十五种语言和 Markdown 阅读入口。

[English](README.md) | [简体中文](README.zh.md)

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
- [七大实时语音平台接入](examples/realtime-integrations/README.md)
- [Changelog](CHANGELOG.md)

Current examples target Web SDK **2.1.0**, loaded from the official Kasamila site.
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

OpenAI、Gemini、Qwen、TEN、LiveKit Agents、Pipecat 和豆包的接入代码与中英文步骤已提供，见[实时语音样例](examples/realtime-integrations/README.md)（Node.js 22+）。
包含云平台中继、框架 RTC 适配器和豆包官方 Demo 回调桥；离线协议测试不等于带凭据的七平台端到端认证。

## Publication policy

Only reviewed documentation and consumer-side examples are published here.
Never commit permanent/session tokens, provider keys, signed asset URLs, private template IDs, media or internal release audits.
API/SDK changes must update the guide, changelog, compatibility notes and affected examples together.
Production version notes: [releases](https://www.kasamila.com/portal/releases).
Tutorials: [blog](https://www.kasamila.com/portal/blog).

所有开发指南已提供中英文版本；每篇指南有语言切换入口。不宣称技术正文已有 15 种语言完整翻译。
License: existing [Apache-2.0](LICENSE); external dependencies retain their own licenses.

## SDK 2 一次迁移

[不可变 Runtime 版本契约与升级清单](docs/sdk_2_runtime_release_contract.md)
默认 pinned。服务器新版本不会热替换活动会话或强迫固定版本客户升级。

- [SDK 2.1 加密 Runtime / AILIVE 升级](docs/sdk_2_1_protected_runtime.md)
