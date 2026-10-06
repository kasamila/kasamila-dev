# 实时数字人聊天

[English](README.en.md) | [简体中文](README.md)

官网的[免登录应用展示](https://www.kasamila.com/portal/apps)复用 SDK 2.1 与 `audio-bridge` PCM 底座。本例增加文字输入与回复文本、麦克风输入、五个平台的语音适配和打断，不修改 SDK、几何推理或口腔渲染。YouTube/Twitch 与卖货展示目前是即将推出的场景。

## 本地运行

需要 Python 3.11+、支持 AudioWorklet 的浏览器、HTTPS 或 localhost，以及支持的 Kasamila 模板。在本目录执行：

```sh
python -m venv .venv
# 激活虚拟环境后：
python -m pip install -r requirements.txt
# 在 Shell 安全配置 .env.example 列出的环境变量。
python -m uvicorn server:app --host 127.0.0.1 --port 8792
```

打开 `http://127.0.0.1:8792/portal/apps/chat`。专用 Kasamila Runtime Key 需要允许此 Origin，并有足够推理额度与并发席位。按照 `../geometry-runtime-web` 的说明配置客户自行托管的 HLS 描述符，在 `KASAMILA_MEDIA_DESCRIPTOR` 中填写其文件路径。示例不自动读取 `.env`，请使用部署环境的安全环境变量加载方式；不得提交密钥。

`VOICE_PROVIDER` 可选 `openai`、`gemini`、`qwen`、`grok`、`doubao`。设置 `VOICE_API_KEY`，按需设置 `VOICE_MODEL`、`VOICE_NAME`、`VOICE_ENDPOINT` 和 `AGENT_INSTRUCTIONS`。豆包还需要 `DOUBAO_APP_ID`、`DOUBAO_APP_KEY`，并明确要求单声道 `pcm_s16le` 输出，不能将默认 float32/Opus 当作 PCM16 使用。模型、音色和访问资格以对应平台账户为准。代码通过协议测试，真实平台验收需要你自己的已开通账户。

## 数据流和控制

麦克风声音经应用服务器传给所选 AI 平台。AI 返回的 24 kHz 单声道 PCM16 通过现有音频桥接驱动 `setPcmStream`；OpenAI/Grok 输入为 24 kHz，Gemini/Qwen/Doubao 输入为 16 kHz。只有 AI 输出驱动数字人。界面同时显示回复文本，关闭声音后可使用文字对话。

服务器 VAD 支持自动打断；点击打断立即停止播放并取消上游回复。Gemini 通过停止说话指令实现主动打断，豆包会用原 dialog ID 结束并重启语音会话。这些平台差异需要真实账户验收。

永久平台密钥和 Runtime Key 保留在服务器。浏览器使用单次票据，在 WebSocket 第一帧发送，不放在 URL 中。会话三分钟后关闭，并调用 Runtime `sessions/end`；离开页面时销毁 SDK player。本例不保存对话，各 AI 平台有独立的数据保留政策，请勿输入敏感信息。

此本地启动器不包含公开托管的防滥用机制或凭据管理界面。官网实现提供管理员加密配置、已发布公共模板白名单、每 IP 访问限制和专用 Runtime Key 并发约束。公开部署此样例前应加入同等控制。人设与护栏是模型指令，不保证内容过滤；应按业务场景验证。

官方协议链接见英文说明。官网管理员从 Admin 的“应用演示管理”入口设置公开数字人、名字、人设、护栏、各通道音色、模型、凭据与会话限额；只有 superadmin 能保存。

Qwen 3.8 需要 `VOICE_ENDPOINT=wss://工作空间ID.cn-beijing.maas.aliyuncs.com/api-ws/v1/realtime`（北京），或新加坡 `ap-southeast-1` 域名；默认模型 `qwen3.8-omni-flash-realtime`，默认音色 `Tina`。密钥必须具有对应工作空间权限。
