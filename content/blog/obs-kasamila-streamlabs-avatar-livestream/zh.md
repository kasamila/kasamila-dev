---
title: "OBS + Kasamila + Streamlabs：一套组件实现数字人直播"
summary: "透明浏览器源、音频输入、队列、打断、场景切换与明确结束，让四类直播共用数字人主持底层。"
lang: zh
slug: obs-kasamila-streamlabs-avatar-livestream
---

# OBS + Kasamila + Streamlabs：一套组件实现数字人直播

透明浏览器源、音频输入、队列、打断、场景切换与明确结束，让四类直播共用数字人主持底层。

## 实施步骤

1. 先启动共享 relay，选择一个语音 Agent 或认证 PCM bridge。设置 KASAMILA_OUTPUT_MODE=transparent，使用支持透明模板的 packed-matte HLS；普通视频加 CSS 透明度不能替代真正透明输出。

2. 普通浏览器打开 /public/studio.html，创建房间并复制临时显示 URL。OBS 添加 Browser Source；Streamlabs Desktop 用自己的 Browser Source 加同一 URL。二者是替代宿主，不必同时运行。

3. 使用来源 Interact 点击 Enable audio，再从控制台 Start。麦克风在控制台采集；Agent 回复才驱动数字人。OBS 开启控制浏览器音频，避免同时捕获桌面声音造成双重播放。

4. 完整音频文件按 FIFO 排队，最多四个、每个 3 MiB / 30 秒；打断废弃旧队列。娱乐、聊天、电商、游戏只是同一组件的四种布局。可选 OBS WebSocket v5 通过服务端密码切换真实 Program Scene，不冒称 Streamlabs Desktop 同样支持该 RPC。

5. 可选 Streamlabs Socket API 把事件摘要送到控制台审核，不能把打赏正文自动变成提示词或播报。来源隐藏、停用、断连或点击 End 都触发结束，重新显示不自动开计费。保留结束确认；机器崩溃仍依赖租约到期。

```bash
cd examples/realtime-integrations
npm ci
cp .env.example .env
# Backend-only configuration: see linked guide
npm start
```

## 边界与验收

这是一套可嵌入的主持底层，不包含四套业务产品。公开网关需登录、Origin 校验、配额、审核和 HTTPS/WSS；透明背景、队列、转场及明确结束应在真实 OBS/Streamlabs 环境验收。

## 代码与协议

- [kasamila-dev / SDK 2.1.0](https://github.com/kasamila/kasamila-dev/tree/main/examples/realtime-integrations)
- [代码与协议](https://github.com/kasamila/kasamila-dev/tree/main/examples/realtime-integrations/obs-streamlabs/README.en.md)
- [OBS Browser](https://github.com/obsproject/obs-browser)
- [Streamlabs Socket API](https://dev.streamlabs.com/docs/socket-api)

## Markdown / AI 阅读

- [Markdown](https://www.kasamila.com/portal/content/blog/obs-kasamila-streamlabs-avatar-livestream.md?lang=zh)
- [HTML](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=zh)
- [JSON](https://www.kasamila.com/api/v1/portal/content/blog/obs-kasamila-streamlabs-avatar-livestream?locale=zh)

[zh](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=zh) | [en](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=en) | [fr](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=fr) | [de](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=de) | [ru](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ru) | [es](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=es) | [it](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=it) | [ar](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ar) | [ja](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ja) | [ko](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ko) | [th](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=th) | [ms](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ms) | [vi](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=vi) | [hi](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=hi) | [id](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=id)
