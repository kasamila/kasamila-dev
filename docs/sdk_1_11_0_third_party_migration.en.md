English | [简体中文](sdk_1_11_0_third_party_migration.md)

# Third-party migration: SDK 2.0.0

SDK 2 is a breaking, one-time migration. Do not use SDK 1 or the old /web/sdk entry.
Follow the [complete Runtime release contract and migration checklist](sdk_2_runtime_release_contract.en.md).

Your backend declares client.sdk_version/update_policy/protocol/capabilities and forwards the selected sdk descriptor.
Your browser loads the immutable bootstrap, then loadKasamila(sdk), then Kasamila.create().
The complete package includes V7, Audio2Viseme, Worklet, ONNX/WASM, HLS and teeth textures.
Pinned production clients are not forced to switch merely because a new release exists.
No Worker update or retraining is required for eligible geometry models.

Before cutover test audio, teeth, profiles, transparency, HLS, expiry, billing settlement and Agent receipts.
This is a release candidate; wait for confirmed server deployment before production migration.

Examples: [browser demo](../examples/geometry-runtime-web/README.en.md).
