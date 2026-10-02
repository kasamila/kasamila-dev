[简体中文](README.md) | [English](README.en.md)

# Vapi existing assistant + Kasamila SDK 2.1.0

服务端选择 PROVIDER=vapi，配置 VAPI_API_KEY, VAPI_ASSISTANT_ID 和共享 Kasamila 模板/媒体参数。

Keep your existing Assistant ID. Binary PCM websocket call; GPT-Live needs VAPI_SAMPLE_RATE=24000.

在上级目录运行 npm ci、复制 .env.example 为 .env 后 npm start。完整配置、音频与时钟、打断、结束计费、权限和验证边界见 [中文平台指南](../voice-platforms/README.md)。共用 [直播主持组件](../obs-streamlabs/README.md)。

代码入口：[服务端适配器](../providers/voice-platforms.mjs)、[浏览器调用](../public/voice-app.mjs)。npm test 不调用付费平台，不等于真实账户端到端认证。许可证 [Apache-2.0](../../../LICENSE)。最近离线核验 2026-10-02。
