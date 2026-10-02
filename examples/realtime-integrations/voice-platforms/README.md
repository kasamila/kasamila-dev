[简体中文](README.md) | [English](README.en.md)

# 六个新语音平台，一套数字人音频链

本样例在原有七个平台基础上扩展 Grok、ElevenLabs、Vapi、Deepgram、Hume EVI、Dify。只把 Agent 回复音频送入正式 Kasamila SDK 2.1.0，不复制渲染核心，不替换现有助手，不把用户麦克风当作数字人口型输入。

## 启动

```bash
cd examples/realtime-integrations
npm ci
cp .env.example .env
# 填写服务端凭据、真实模板 ID 和严格匹配的媒体描述符。
npm start
```

打开 `http://127.0.0.1:8790`，点击 Start 解锁声音并授权麦克风。每个服务进程选一种 PROVIDER。同一 SDK 同时负责回复播放和口型；禁止再由平台 SDK 或 audio 元素重复播放。

| PROVIDER | 服务端配置 | 音频与回合处理 |
| --- | --- | --- |
| grok | XAI_API_KEY，可选 XAI_VOICE | 24k 单声道 PCM16；xAI 独立会话协议、服务端 VAD、response.cancel |
| elevenlabs | ELEVENLABS_API_KEY、ELEVENLABS_AGENT_ID | 服务端获取签名会话 URL；实际 pcm_* 格式协商；ping/pong 与 interruption |
| vapi | VAPI_API_KEY、VAPI_ASSISTANT_ID | 复用现有助手；二进制 PCM16 双向传输；默认 16k，GPT-Live 设置 VAPI_SAMPLE_RATE=24000 |
| deepgram | DEEPGRAM_API_KEY | SettingsApplied 后才发麦克风；16k 输入 / 24k 输出；KeepAlive 和抢话事件 |
| hume | HUME_API_KEY、HUME_SECRET_KEY、HUME_CONFIG_ID | 服务端临时 OAuth 授权；16k 原始输入；完整 WAV 回复解码排队 |
| dify | DIFY_API_KEY，可选 DIFY_API_BASE | 现有 Chat/Chatflow 知识库→识别→回答→合成→数字人；16k 按键发言 |

## 各平台操作

**Grok Voice Agent**：设置 PROVIDER=grok。使用 xAI 实际 session.update 结构而非 OpenAI GA 结构；PCM 回复支持两种已记录事件名，取消后的旧 response ID 被丢弃。模型、音色及账户可用范围以平台为准。

**ElevenLabs 视频客服**：设置 PROVIDER=elevenlabs 和现有 Agent ID，保留该 Agent 的知识库、工具及客服规则；输入输出设为 PCM。MP3/ulaw 协商会拒绝，不伪装成 PCM。永久 Key 与签名会话 URL 都留在服务端。打开 `/public/video-call.html`，开始、说话、打断、结束；可选用户摄像头仅本地预览。这是 AI 视频电话式界面，不是已实现的真人 WebRTC 通话或 PSTN 电话。CRM 权限、人工转接与用户同意由业务应用负责。

**Vapi 给已有助手加数字人**：设置 PROVIDER=vapi 与现有 VAPI_ASSISTANT_ID。POST /call 直接使用 assistantId，不新建另一套助手；二进制音频驱动数字人。GPT-Live 必须显式用 24k，不能只更改标签。结束时调用返回且校验过的 monitor control URL；在发布前验收现有助手实际 transport 和抢话行为。

**Deepgram Voice Agent**：设置 PROVIDER=deepgram；可配置 STT/LLM/TTS 模型及 AGENT_LANGUAGE、AGENT_INSTRUCTIONS，必须是账户实际可用的模型。收到 SettingsApplied 后送声音，UserStartedSpeaking 清空本地播放；关闭后移除 KeepAlive 定时器。

**Hume EVI**：设置 PROVIDER=hume 与现有 Config ID。原始输入通过 session_settings 声明 PCM16；输出是完整 WAV，不是裸 PCM。浏览器先完整解码，再按样本送同一数字人播放器，不把 RIFF 文件头或任意压缩片段送入口型推理。每段不超过 30 秒、队列最多四段；打断使旧回合失效。

**Dify 原知识库转语音数字人**：设置 PROVIDER=dify，使用现有 Chat/Chatflow 应用 Key，并启用该应用 STT/TTS。若流程要求额外输入，应在服务端 inputs 对象填写；当前示例为空，不能把纯 Workflow 的 /workflows/run 当 Chat 接口。点击 Record，最多录 15 秒，再 Send recording，或直接提交文本。WAV 上传 /audio-to-text；/chat-messages 保留 conversation_id 与每会话独立 user；/text-to-audio 的完整编码文件经浏览器解码。这是按键发言，不冒称全双工实时链。请求上限 60 秒；打断中止 HTTP 并废弃旧回复。应用提示词需约束口头回答不超过 30 秒。

## 打断、结束和验证边界

手动打断总会清空本地队列。Grok 使用真实 response.cancel；Dify 取消本地请求。其他四个平台按实际用户说话事件自动抢话，示例不编造通用取消命令，也不保证手动静音已停止上游生成或计费。End 会关闭平台链路、在提供控制 URL 时结束 Vapi call、destroy 数字人并调用授权的 Runtime 结束接口。结束失败会提示，不报已确认结束；进程或机器崩溃仍依赖租约超时及平台政策。

本服务只绑定回环地址，不是生产多租户网关。上线前增加登录、用户/模板授权、HTTPS/WSS、配额、CSP、脱敏日志及平台专属重试策略。不要向浏览器暴露永久密钥或平台签名 URL，也不要让来电声音自动获得工具权限。

`npm test` 使用协议模拟与合成声音，覆盖队列、打断、会话释放，不调用付费服务。真实账户、OBS/Streamlabs 安装、设备、语言和长期运行仍需带凭据验收。“支持”表示有实现样例，不等于平台认证或精确音素承诺。

协议链接与审核日期见 [English references](README.en.md#official-protocol-references-reviewed-2026-10-02)。继续阅读 [OBS / Streamlabs 共用主持组件](../obs-streamlabs/README.md)。
