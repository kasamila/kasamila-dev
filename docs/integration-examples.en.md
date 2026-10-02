[English](integration-examples.en.md) | [简体中文](integration-examples.md)

# Kasamila integration examples

[kasamila/kasamila-dev](https://github.com/kasamila/kasamila-dev) is the public home for API/SDK documentation, upgrade notes, examples and platform integrations. System core remains private.

Current browser examples target Web SDK **2.1.0**.

## Available now

- [Runnable geometry browser example](geometry-runtime-web-example.en.md): backend authorization, short-lived Token, SDK initialization, HLS media and audio input.
- [PCM / RTC audio bridge](https://github.com/kasamila/kasamila-dev/blob/main/examples/audio-bridge/README.en.md): remote audio, bounded PCM input and explicit Runtime shutdown.
- [Runtime and MCP/Agent API](api_v1_runtime_integration_guide.en.md)
- [Geometry models and HLS](api_v1_geometry_runtime_guide.en.md)
- [Key allocation and concurrency](runtime_concurrency_api_sdk_upgrade_20260923.en.md)
- [SDK migration](sdk_1_11_0_third_party_migration.en.md)
- [Release notes](https://github.com/kasamila/kasamila-dev/blob/main/CHANGELOG.md)

## Realtime voice platform examples

[Thirteen-platform integration suite](../examples/realtime-integrations/README.en.md): OpenAI Realtime, Gemini Live, Qwen, TEN, LiveKit Agents, Pipecat, Doubao, Grok, ElevenLabs, Vapi, Deepgram, Hume EVI and Dify.

[New voice-platform guide](../examples/realtime-integrations/voice-platforms/README.en.md) covers existing Vapi Assistant IDs, Dify knowledge bases and the ElevenLabs video-call UI. [OBS / Streamlabs](../examples/realtime-integrations/obs-streamlabs/README.en.md) shares one transparent host with input, queues, interruptions, scene layouts and explicit termination. [Two multilingual tutorials](../content/blog/README.md) contain fifteen actual language bodies and machine-readable Markdown/JSON URLs.
Includes a local browser microphone starter, server-only provider credentials, RTC adapters and an official-demo Doubao hook. Models/regions require your provider entitlement. Local contract tests pass; paid provider E2E remains an application acceptance task.

Each future adapter should ship a README, pinned dependencies/lockfile, environment-variable template, startup steps, audio-format/sample-rate and timing rules, interruption/termination handling, billing notes, errors, license and last validation date.
Never publish real Keys, provider credentials, private template IDs, customer media or signed URLs.

## Update policy

The public repository holds runnable examples and versioned documentation. Blog articles explain application practices. Release notes identify compatibility and upgrade steps.
Portal's Developer Center links to the same public repository rather than a separate private documentation surface.

Portal previews are free; third-party Runtime Sessions are billed while running. End unneeded Sessions explicitly rather than merely stopping sound or hiding the avatar.
