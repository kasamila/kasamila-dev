# YouTube / Twitch 数字人直播样例

本样例复用 Kasamila **现有发布的 Runtime API/SDK**，不修改 SDK、几何或 API 服务。YouTube 使用 Live Chat API（按 `pollingIntervalMillis` 和 `nextPageToken` 轮询）；Twitch 使用 EventSub WebSocket 与 Send Chat Message API。有效消息通过文本提交给 Qwen 端到端实时模型。

[English](README.en.md)

## 本地运行

```bash
python -m venv .venv
# 激活虚拟环境，然后安装依赖
pip install -r requirements.txt
cp .env.example .env
# 将凭据仅填写到本地 .env；不要提交 .env 或授权 token 文件
python authorize.py
uvicorn server:app --host 127.0.0.1 --port 8877
```

在平台开发者控制台注册 `.env` 的 `OAUTH_CALLBACK`。Twitch 使用 `user:read:chat user:write:chat`；YouTube 使用 `https://www.googleapis.com/auth/youtube.force-ssl`，需要启用 YouTube Data API v3，并按 Google 的要求配置 OAuth 同意屏幕/测试用户或验证。运行 `authorize.py` 时必须使用目标直播频道的所有者账号。两个平台的凭据不同；每个本地实例负责一个直播间。

`QWEN_ENDPOINT` 使用自己的北京/新加坡工作空间专属 WSS；默认模型为 `qwen3.8-omni-flash-realtime`。`KASAMILA_MEDIA_DESCRIPTOR` 指向自己的模板媒体描述文件，参照相邻 `geometry-runtime-web` 样例；Runtime Key 必须允许 `DEMO_ORIGIN`、该模板及所需额度/并发席位。

生成一个至少 20 字符的随机 `SOURCE_TOKEN`。在 OBS 添加浏览器源：

```text
http://127.0.0.1:8877/portal/apps/live/obs#room=demo&token=<SOURCE_TOKEN>
```

设置为 1920×1080，启用“通过 OBS 控制音频”，关闭“源不可见时关闭”。OBS 再向 YouTube/Twitch 推流。URL fragment 不发送到访问日志，但整个源地址具有控制能力，不应分享。该本地服务器只绑定 `127.0.0.1`，不作为公开生产服务。

## 策略和边界

- 过滤重复消息、机器人回声、指令、仅表情、链接、重复字符、频繁刷屏和配置的屏蔽词。
- 每条被接受的消息生成带 `@用户名` 的平台文字回复。低流量逐条语音回复；高流量按问题、观众轮换和间隔挑选。语音通过 OBS 播放完成确认串行输出。
- 每位观众的最近四轮对话独立保存，默认 30 分钟；直播会话结束即清除。重新连接不承诺跨直播持久记忆。
- 平台限流排队重试；权限、离线、审核或模型错误显示失败状态。平台配额不允许无限发送，也不保证 API 被拒绝的消息能最终送达。已接受的队列只保留在进程内，停止/进程重启不会自动补发旧消息，避免重复发言。
- OBS 会话每十分钟轮换现有 Runtime 授权；关闭/失联会释放 Runtime，持续直播仍消耗正常额度。
- 网页展示使用平台播放器和原生聊天嵌入；Portal 托管版额外提供观众 OAuth 输入框，按观众本人身份发言，不使用主播身份代发观众消息。

生产 Portal 的所有平台/Qwen 密钥在 **Admin → 应用演示 → 直播演示** 配置；上述环境变量只用于独立本地样例。生产版另有管理员鉴权、CSRF、加密 token 存储、同源校验、OBS 单源接管和源地址撤销。

## 官方协议

- [YouTube Live Chat list](https://developers.google.com/youtube/v3/live/docs/liveChatMessages/list)
- [YouTube Live Chat insert](https://developers.google.com/youtube/v3/live/docs/liveChatMessages/insert)
- [Twitch 聊天收发](https://dev.twitch.tv/docs/chat/send-receive-messages/)
- [Twitch EventSub WebSocket](https://dev.twitch.tv/docs/eventsub/handling-websocket-events/)
- [Qwen 实时客户端事件](https://help.aliyun.com/en/model-studio/client-events)
