[English](realtime-voice-integrations.en.md) | [简体中文](realtime-voice-integrations.md)

# 实时语音系统 + Kasamila SDK 2.1.0

[统一启动和生命周期说明](../examples/realtime-integrations/README.md)。

- [LiveKit Agents](../examples/realtime-integrations/livekit/README.md)
- [Pipecat](../examples/realtime-integrations/pipecat/README.md)
- [TEN Framework](../examples/realtime-integrations/ten/README.md)
- [OpenAI Realtime](../examples/realtime-integrations/openai/README.md)
- [Gemini Live](../examples/realtime-integrations/gemini/README.md)
- [Qwen-Omni-Realtime](../examples/realtime-integrations/qwen/README.md)
- [豆包实时语音](../examples/realtime-integrations/doubao/README.md)

复用现有 API/SDK 2.1.0，媒体仍由接入方托管；不复制渲染核心，不改变几何训练模型。只将 Agent 输出交给口型推理；麦克风由语音系统处理。关闭应用必须销毁 Runtime 以停止计费。

代码包含事件适配、PCM 采样率、打断、错误清理与服务端授权。豆包回调桥依赖其官方 Demo 的二进制解包。离线测试不等于七个平台的生产验收。
