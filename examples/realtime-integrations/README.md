[简体中文](README.md) | [English](README.en.md)

# 七大实时语音平台接入 · Kasamila SDK 2.1.0

本目录提供 OpenAI、Gemini、Qwen、TEN 的本地麦克风 → 语音平台 → 实时数字人运行示例；LiveKit/Pipecat 为接入已有 Agent 的浏览器 RTC 适配器；豆包为官方 Demo 解包回调桥。不会替用户托管语音模型或 Agent 框架。

## 运行 PCM 示例

需要 Node.js 22+、支持 AudioWorklet 的浏览器、Kasamila 几何模板及严格匹配的自托管 HLS 描述符、Kasamila Key 和所选平台凭据。

```bash
cd examples/realtime-integrations
npm ci
cp .env.example .env
# 将服务端环境变量填入 .env，指定真实的模板媒体描述符。
npm start
# 打开 http://127.0.0.1:8790，点击 Start，允许麦克风。
```

通过 `PROVIDER=openai|gemini|qwen|ten|bridge` 选择。Gemini 必须显式填写账户可用的模型；Qwen 示例明确使用 Qwen3-Omni Flash 协议，不能直接改为 Qwen3.5。TEN 先启动官方 websocket-example 图。

用户麦克风只送语音系统，**仅 Agent 回复音频驱动数字人**。同一 SDK 音频时钟负责播放与口型，不能额外再放一遍声音。PCM 是单声道、小端、有符号 PCM16，不是 MP3、Opus、float32，也不带 WAV 文件头。

## 分平台说明

- [LiveKit Agents](livekit/README.md)
- [Pipecat](pipecat/README.md)
- [TEN Framework](ten/README.md)
- [OpenAI Realtime API](openai/README.md)
- [Google Gemini Live API](gemini/README.md)
- [阿里云 Qwen-Omni-Realtime](qwen/README.md)
- [火山引擎豆包实时语音](doubao/README.md)

## Kasamila 接口与生命周期

服务端签发 `POST /api/v1/runtime/sessions`，固定 SDK 2.1.0，申请 `pcm_stream`、`rtc`，绑定浏览器 Origin；原样转发 `sdk` 和 `client_token`。浏览器通过 Bootstrap 加载正式 SDK，传入 `templateMedia`；临时授权和解密自动完成，第三方不保存 Kasamila 加密密钥。

已有几何模型、自托管媒体和透明 packed-matte HLS 不变。透明输出用匹配的描述符及 `KASAMILA_OUTPUT_MODE=transparent`。

`stop()` 只停音频，**不停止 Runtime 计费**。结束必须调用 `destroy()` 或授权的结束会话接口。示例在失败、断连、离页时释放，单次最多十分钟；整进程崩溃仍依赖租约超时，不能承诺没有确认结束请求也立刻停止计费。

## 上线前要求

本服务仅绑定回环地址，不是生产公共网关。发布前增加登录认证、模板授权、用户级速率与并发限制、HTTPS/WSS、用户隔离和平台重连策略。永久 Key、平台密钥、桥接密钥不得发到浏览器，也不得记录 Token 或签名媒体地址。

示例节奏控制 PCM；浏览器待处理回复超过五秒会停止，避免积压。打断会废弃旧回复并终止旧 PCM reader，不能每块音频都新建 reader。上游大块音频需拆分。CSP 需要允许 SDK/API/HLS、WSS、WASM、blob Worker 和 AudioWorklet；麦克风/自动播放需要用户手势。

## 验证边界

已提供不调用付费云服务的协议、PCM、打断、队列溢出和 RTC 筛选测试。**不等于七个平台已完成带凭据的生产端到端认证**。实际接入请验收中英文、多轮对话、抢话、断网、麦克风拒绝、Token 到期、IDLE、seek/loop、透明背景及移动端长时运行。

```bash
npm test
```

代码使用仓库 [Apache-2.0 许可证](../../LICENSE)，平台 SDK/服务遵循各自许可和条款。最近本地核验：2026-09-27。
