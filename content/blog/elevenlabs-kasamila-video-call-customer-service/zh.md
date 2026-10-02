---
title: "ElevenLabs + Kasamila：视觉与声音统一的视频电话客服"
summary: "保留现有 ElevenLabs Agent，给客服回答加上可见数字人；让回复音频播放与口型使用同一条链路。"
lang: zh
slug: elevenlabs-kasamila-video-call-customer-service
---

# ElevenLabs + Kasamila：视觉与声音统一的视频电话客服

保留现有 ElevenLabs Agent，给客服回答加上可见数字人；让回复音频播放与口型使用同一条链路。

## 实施步骤

1. 先配置现有 ElevenLabs Agent：知识库、客服指令、工具权限和人工升级流程仍在原 Agent 中。数字人不替换业务逻辑。

2. 在样例目录 npm ci，复制 .env.example 为 .env。服务端设置 PROVIDER=elevenlabs、ELEVENLABS_API_KEY、ELEVENLABS_AGENT_ID，以及 Kasamila Key、模板 ID、严格匹配的媒体描述符；输入输出选择 PCM。

3. 运行 npm start，打开 /public/video-call.html。点击 Start 解锁声音并授权麦克风。服务端获取 ElevenLabs 签名会话地址，永久 Key 和该签名地址都不交给浏览器。

4. 麦克风只进入语音 Agent；Agent 回复的实际 PCM 样本交给 Kasamila 同时播放并驱动口型，不另开平台播放器。可选来电摄像头只做本地预览，不上传；本页面不是已实现的真人 WebRTC 或 PSTN 电话。

5. 用户抢话时废弃旧回复队列；手动清队列不保证上游生成已停止。通话结束点击 End，关闭平台链路、destroy 数字人并请求授权 Runtime 结束。静音或关闭声音不是停止计费；结束失败应检查授权控制界面。

```bash
cd examples/realtime-integrations
npm ci
cp .env.example .env
# Backend-only configuration: see linked guide
npm start
```

## 边界与验收

这是可运行的 AI 视频电话式样例，不是平台生产认证，也不保证精确音素。正式服务还需登录、用户/模板授权、HTTPS/WSS、隐私同意、CRM 工具权限和带真实账户的多轮抢话验收。

## 代码与协议

- [kasamila-dev / SDK 2.1.0](https://github.com/kasamila/kasamila-dev/tree/main/examples/realtime-integrations)
- [代码与协议](https://github.com/kasamila/kasamila-dev/tree/main/examples/realtime-integrations/voice-platforms/README.en.md)
- [ElevenLabs WebSocket](https://elevenlabs.io/docs/eleven-agents/api-reference/eleven-agents/websocket)

## Markdown / AI 阅读

- [Markdown](https://www.kasamila.com/portal/content/blog/elevenlabs-kasamila-video-call-customer-service.md?lang=zh)
- [HTML](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=zh)
- [JSON](https://www.kasamila.com/api/v1/portal/content/blog/elevenlabs-kasamila-video-call-customer-service?locale=zh)

[zh](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=zh) | [en](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=en) | [fr](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=fr) | [de](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=de) | [ru](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ru) | [es](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=es) | [it](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=it) | [ar](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ar) | [ja](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ja) | [ko](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ko) | [th](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=th) | [ms](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ms) | [vi](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=vi) | [hi](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=hi) | [id](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=id)
