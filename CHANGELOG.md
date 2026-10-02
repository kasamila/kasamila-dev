# Public developer resources

## Realtime voice examples · 2026-09-27

- SDK 2.1.0 examples for LiveKit Agents, Pipecat, TEN, OpenAI Realtime, Gemini Live, Qwen-Omni-Realtime and the official Doubao demo callback bridge.
- Shared backend Token issuance, caller-hosted HLS, mono PCM16/RTC inputs, interruption and explicit Runtime shutdown.
- Bilingual setup guides and offline adapter/relay tests. Provider credentials and paid-cloud E2E acceptance are not included.
- Portal preview adds localized, milestone-based template loading progress. No SDK version or Worker change.

## SDK 2.1.0 · 2026-09-27

- Encrypted V7 GLSL and ONNX packages, WASM envelope validation and automatic temporary Runtime licensing.
- Authorization/decryption failure stops playback and releases the lease; no plaintext fallback or watermark mode.
- Backend examples pin 2.1.0 and request protection capabilities. Media descriptors and public player calls remain unchanged.
- Bilingual [AILIVE upgrade checklist](docs/sdk_2_1_protected_runtime.en.md) / [中文升级清单](docs/sdk_2_1_protected_runtime.md).
- Pinned 2.0.0 remains supported. No Worker update or geometry retraining.
- Verify actual rollout through the production release registry; validate your application before cutover.

## SDK 2.0.0 released · 2026-09-27

- Breaking one-time client migration; SDK 1 is not supported by the new workflow.
- Immutable full packages, session-selected releases, pinned/stable/preview policies and capability negotiation.
- Session-pinned geometry generations/calibration, SRI bootstrap and bundled HLS/teeth assets.
- Bilingual migration documentation and updated runnable examples; Worker unchanged.
- Production deployment verified: 209 API/migration tests and 84 browser unit tests passed; cross-Origin Bootstrap/SRI and resource digests verified. Customer audio/device acceptance remains an integration rollout gate.


## 2026-09-27 · Bilingual guides and unified Developer Center

- English editions of all seven developer guides and both example READMEs.
- Default English repository home with a Chinese home and per-guide language links.
- Portal documentation and version navigation merged into a public GitHub Developer Center.
- Existing site guide/Markdown URLs remain compatible; English guide routes serve English bodies.
- Portal Chinese information-page and six-column avatar-grid fixes use a separate core CI/CD deployment.

Documentation/site changes only: **Web SDK stays 1.11.6; Runtime API contracts and Worker code are unchanged**.

## 2026-09-27 · Initial documentation and examples

- API/SDK, geometry/HLS, concurrency and third-party upgrade guides.
- Browser integration example targeting official Web SDK 1.11.6.
- PCM16 / RTC audio bridge and local contract tests.
- Independent canonical-video HLS packaging tool; no geometry training implementation.
- Historical example template IDs replaced with a fictional placeholder.

This is a documentation/example publication, **not a new SDK binary or API release**.
Provider-specific Gemini/GPT/LiveKit/Pipecat adapters are not yet delivered.
Release-specific notes should identify the actual production commit and verification state; this documentation publication is not a new SDK binary.
# 2026-10-02 — Voice agents and embeddable livestream host (examples only)

- Added Grok Voice Agent, ElevenLabs Agent, existing Vapi assistant transport, Deepgram Voice Agent, Hume EVI and Dify knowledge-base speech adapters.
- Added AI video-call customer-service UI and one OBS / Streamlabs avatar host with actual transparent-output validation, audio input, bounded FIFO, interruption, layouts, optional OBS scene RPC and explicit Runtime termination.
- Added operator-reviewed Streamlabs events and two fifteen-locale blog tutorials with Markdown / JSON reading links.
- SDK remains 2.1.0; no core Runtime, API or rendering release. Mocked contract tests are not credentialed vendor or OBS/Streamlabs certification.
