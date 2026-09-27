[English](integration-examples.en.md) | [简体中文](integration-examples.md)

# Kasamila integration examples

[kasamila/kasamila-dev](https://github.com/kasamila/kasamila-dev) is the public home for API/SDK documentation, upgrade notes, examples and platform integrations. System core remains private.

Current browser examples target Web SDK **1.11.6**.

## Available now

- [Runnable geometry browser example](geometry-runtime-web-example.en.md): backend authorization, short-lived Token, SDK initialization, HLS media and audio input.
- [PCM / RTC audio bridge](https://github.com/kasamila/kasamila-dev/blob/main/examples/audio-bridge/README.en.md): remote audio, bounded PCM input and explicit Runtime shutdown.
- [Runtime and MCP/Agent API](api_v1_runtime_integration_guide.en.md)
- [Geometry models and HLS](api_v1_geometry_runtime_guide.en.md)
- [Key allocation and concurrency](runtime_concurrency_api_sdk_upgrade_20260923.en.md)
- [SDK migration](sdk_1_11_0_third_party_migration.en.md)
- [Release notes](https://github.com/kasamila/kasamila-dev/blob/main/CHANGELOG.md)

## Planned platform adapters

Complete Gemini Realtime, GPT Realtime, LiveKit and Pipecat adapters are **not yet delivered or verified**.
The existing vendor-neutral bridge accepts decoded PCM16 or an already obtained remote RTC audio track. Provider event handling, credentials, dependency versions and end-to-end validation are separate work.

Each future adapter should ship a README, pinned dependencies/lockfile, environment-variable template, startup steps, audio-format/sample-rate and timing rules, interruption/termination handling, billing notes, errors, license and last validation date.
Never publish real Keys, provider credentials, private template IDs, customer media or signed URLs.

## Update policy

The public repository holds runnable examples and versioned documentation. Blog articles explain application practices. Release notes identify compatibility and upgrade steps.
Portal's Developer Center links to the same public repository rather than a separate private documentation surface.

Portal previews are free; third-party Runtime Sessions are billed while running. End unneeded Sessions explicitly rather than merely stopping sound or hiding the avatar.
