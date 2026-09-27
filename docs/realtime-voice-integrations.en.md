[English](realtime-voice-integrations.en.md) | [简体中文](realtime-voice-integrations.md)

# Realtime voice systems + Kasamila SDK 2.1.0

[Shared setup and lifecycle](../examples/realtime-integrations/README.en.md).

- [LiveKit Agents](../examples/realtime-integrations/livekit/README.en.md)
- [Pipecat](../examples/realtime-integrations/pipecat/README.en.md)
- [TEN Framework](../examples/realtime-integrations/ten/README.en.md)
- [OpenAI Realtime](../examples/realtime-integrations/openai/README.en.md)
- [Gemini Live](../examples/realtime-integrations/gemini/README.en.md)
- [Qwen-Omni-Realtime](../examples/realtime-integrations/qwen/README.en.md)
- [Doubao realtime voice](../examples/realtime-integrations/doubao/README.en.md)

Uses existing API/SDK 2.1.0 and caller-hosted media. It does not copy the rendering core or change geometry models. Route only assistant output into mouth inference; microphones go to the speech system. Destroy the Runtime when ending the application to stop billing.

Examples include event adaptation, PCM rates, interruption, failure cleanup and backend authorization. The Doubao callback bridge delegates binary decoding to the official demo. Offline tests do not certify seven-provider production acceptance.
