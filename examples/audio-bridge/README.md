# Kasamila 音频桥接底座

这是无供应商依赖的接入底座，不是 Gemini / OpenAI / LiveKit / Pipecat 的完整适配器。
验证对象为 Web SDK 2.1.0 的 setPcmStream、setMediaStreamTrack、stop、destroy 契约。

[查看桥接代码](https://github.com/kasamila/kasamila-dev/blob/main/examples/audio-bridge/bridge.mjs)。源代码、说明和测试在此公开仓库一起维护。

## 使用条件

由应用后端使用永久 API Key 换取对应 Origin 的短期 Runtime Token，浏览器创建 SDK player。
授权模式必须包含 pcm_stream 或 rtc。永久 Key 和供应商 Key 不能出现在前端。
不要把自己的麦克风送给数字人；应送入 Agent 返回的声音。

```js
import { drivePcm, connectRemoteAudio, endRuntime } from "./bridge.mjs";
// 单声道 PCM16；必须填写供应商实际采样率，不能固定假定16k。
const audio = drivePcm(player, { sampleRate: 24000, maxQueuedMs: 2000 });
audio.push(new Int16Array([0, 100, -100]));
audio.close();
await audio.finished;
// 或接入应用已有的远端 RTC audio MediaStreamTrack。
const disconnect = await connectRemoteAudio(player, remoteTrack);
disconnect(); // 只停音频，不结束收费的Runtime。
// 离开或长时Idle休眠时结束Runtime，返回后重新授权并创建player。
await endRuntime(player);
```

PCM 源复制输入以避免共享缓冲区被改写；队列超限明确报错，接入方须暂停上游生产或中断重连，
不能悄悄丢弃声音帧。源缓冲上限不等于 SDK 播放队列上限：上游必须实时节奏发送，不能一次灌入整段长音频。
Opus、MP3、AAC 和 base64 字符串不是 PCM，需先解码；字节 PCM16 要按实际字节序转换。
中断时 abort()，等待 finished 的失败结果，重新创建输入源；不要复用关闭的流。
不要再额外播放同一个远端轨道，否则会双重发声。

## 完整示例验收

- Gemini 与 GPT 实时服务：确认实际输出类型、采样率及中断信号后接 PCM 或 RTC。
- LiveKit 与 Pipecat：确认浏览器端远端音轨后交给 SDK；框架事件和依赖版本须另行验证。
- 每个样例记录 API版本、依赖锁文件、启动步骤、录屏证据、验证日期和License。
- 未具备供应商凭据、测试环境和公开仓库时，不将四类适配器标记为生产已验证。

## 本地测试

Node 18+：node --test bridge.test.mjs。测试不请求生产、不生成收费会话。
本站免费预览与第三方 API/SDK 计费会话不要混用；destroy 才会结束 Runtime 生命周期。
