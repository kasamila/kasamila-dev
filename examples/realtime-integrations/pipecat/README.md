[简体中文](README.md) | [English](README.en.md)

# Pipecat + Kasamila SDK 2.1.0

方式：RTC。[公共初始化与计费生命周期](../README.md)。

复用已有 Pipecat Bot 后端，客户端与服务端必须使用匹配的 Daily 或 SmallWebRTC 传输。示例不是完整 STT/LLM/TTS 托管服务。会话申请 `rtc`；仅取 `tracks().bot.audio`，不取用户麦克风。现有工程安装下列代码中的 Pipecat 包即可挂接。

`/api/start` 仍由自己的后端认证并返回传输参数；不要同时挂载 PipecatClientAudio，否则重复播放。框架原生抢话继续生效；卸载时移除监听、断开框架并销毁 Runtime。

现有项目安装 `@pipecat-ai/client-js` 与所用 transport 包，再初始化 player。绑定要先于 startBotAndConnect，避免错过首个音轨；BotReady 和音轨更换都会重选 bot.audio。错误回调应结束 Runtime。

## 挂接代码

```js
import {PipecatClient, RTVIEvent} from "@pipecat-ai/client-js";
import {SmallWebRTCTransport} from "@pipecat-ai/small-webrtc-transport";
import {bindPipecat} from "../providers/pipecat.mjs";
const client = new PipecatClient({
  transport: new SmallWebRTCTransport(), enableMic: true, enableCam: false,
});
const detach = bindPipecat({
  client, RTVIEvent, player, onError: error => console.error(error.message),
});
await client.startBotAndConnect({endpoint: "/api/start"});
// End button:
await detach();
await client.disconnect();
await player.destroy();
```

## 验收

请验证多轮对话、用户抢话、平台断开、Token 到期和关闭时 Runtime 释放。密钥仅存服务端；样例协议测试不等于真实付费平台验收。

协议来源：[Pipecat 官方资料](https://docs.pipecat.ai/api-reference/client/js/client-methods)。核对日期：2026-09-27；实际模型/账号权限需开发者确认。
