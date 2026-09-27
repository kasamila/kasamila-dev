> SDK 2.1：GLSL/ONNX 加密与 Runtime 临时授权，第三方无需配置解密密钥。参见 [AILIVE 升级与保护说明](sdk_2_1_protected_runtime.md)。固定 2.0.0 仍受支持。

[English](api_v1_runtime_integration_guide.en.md) | [简体中文](api_v1_runtime_integration_guide.md)

# Kasamila 推理 API、Web SDK 与 MCP/Agent 集成指南

> SDK 2.1.0 已上线：请先阅读[新 Runtime 版本契约](sdk_2_runtime_release_contract.md)。不兼容 SDK 1 或旧可变入口。本文固定版本检查仅适用于显式 pinned 的样例，不能与服务端全局最新版本比较。后端须透传 Session 返回的 sdk，网页使用 bootstrap 加载。HLS 已内置。现在可以按清单迁移。


本文面向实际接入 Kasamila 数字人的前端、后端和 Agent 开发者。生产架构始终分成两个安全域：商户后端持有永久 API Key，浏览器只持有短期 Runtime Token。音频、Audio2Viseme 推理和 WebGL 渲染默认在最终用户浏览器完成。

本文覆盖几何模型生产 Runtime。几何模型模板的 HLS 媒体交接、透明
Packed Matte、长模板和完整可运行样例见
[`api_v1_geometry_runtime_guide.md`](api_v1_geometry_runtime_guide.md)。当前 Web SDK
版本为 `2.1.0`。已有第三方升级请同时执行
[`sdk_1_11_0_third_party_migration.md`](sdk_1_11_0_third_party_migration.md)。
Runtime 并发配额、购买及 Key 分配的升级说明见
[`runtime_concurrency_api_sdk_upgrade_20260923.md`](runtime_concurrency_api_sdk_upgrade_20260923.md)。

机器可读 OpenAPI 位于 `https://www.kasamila.com/openapi.json`，交互文档位于 `https://www.kasamila.com/docs`。模板口型字段的枚举、默认值、数值上下界和局部 PATCH 语义均同步到在线 schema；本文补充跨端集成和安全边界。

## 1. 选择正确的入口

| 入口 | 调用位置 | 凭据 | 主要用途 |
| --- | --- | --- | --- |
| Runtime Session API | 商户后端 | `ks_live_…` / `ks_test_…` | 为单个网页、模板和输入方式签发短期权限 |
| Web Runtime SDK | 最终用户网页 | `ks_rt_…` | 接收声音，浏览器内推理并渲染数字人 |
| MCP/Agent API | MCP Host / Agent 后端 | `ks_live_…` / `ks_test_…` | Agent 列出模板、创建会话并向网页投递音频 URL |

永久 Key 禁止出现在 HTML、前端 JavaScript、URL、移动端安装包、模型上下文或日志中。MCP 也运行在服务端，它不是前端 SDK 的替代品。

## 2. 端到端集成流程

1. 在 Portal 的“API Keys”创建 Key，并配置网页 Origin 白名单。
2. 网页向自己的已鉴权后端请求数字人会话。
3. 商户后端调用 `POST https://www.kasamila.com/api/v1/runtime/sessions`。
4. 商户后端只把响应的 `data.client_token` 返回网页。
5. 网页用 Token 初始化 `Kasamila.create()`。
6. 网页把文件、MIC、PCM/TTS 流或 RTC 音轨送入 SDK。
7. SDK 在浏览器完成 Audio2Viseme 和 WebGL 渲染，并每 25 秒发送计量心跳。
8. 页面退出或业务结束时调用 `destroy()`。

Token 会绑定一个模板、一个 Origin、允许的输入模式、背景输出模式。请求租约为 60–900 秒；余额不足时实际有效期可缩短至剩余秒数（最低 1 秒）。网页实际 Origin 不匹配时，Manifest 和运行时接口都会拒绝访问。

### 免费站内预览与 API/SDK 计费

登录后从 Kasamila Portal 打开的内置预览免费，不占用推理分钟；其 Token 必须同时携带同一 Workspace 的有效 Portal 登录 Cookie，不能复制给第三方网页或服务端使用。第三方必须通过自己的 API Key 创建普通 Runtime Session。新注册账号赠送 1 小时普通 API/SDK Runtime，注册后 30 天有效，不赠送私有模板训练额度。各时长包独立到期，优先消耗最先到期的可用时长。

普通 Runtime 从 Session 创建时开始按服务端时钟计时。服务器先预留本次租约（最多 15 分钟），SDK `destroy()` 发送 `end`，或第三方显式调用 `POST /api/v1/runtime/sessions/end` 后，未用秒数按账本幂等返还；若客户端未结束 Session，则一直计时至到期并消耗完整租约。心跳只用于统计，不能代替结束操作或自行上报较短的计费时长。

### Runtime 并发席位与 API Key 分配

每个 Workspace 默认拥有 100 个同时有效的 Runtime Session 席位；购买并发席位包后增加 Workspace 总额。推理分钟额度是另一种独立配额，并发席位不会兑换分钟。每个新建 API Key 默认分配 20 个并发席位（创建时可指定 `runtime_concurrency_limit`），也可以在 Portal“API Keys”或 `PATCH /api/v1/api-keys/{key_id}` 中调整为 0 到 Workspace 可用额内的整数。`GET /api/v1/api-keys` 返回 `runtime_concurrency.total/allocated/available/overallocated` 和每个 Key 的分配值。撤销 Key 会立即使其活动会话失效，并释放其分配的席位；轮换 Key 仅使旧会话失效，不改变分配。减少某个 Key 的席位不会中断已有会话，但在活跃会话数降到新上限以下前不能再新建。

单 Key 活跃会话数不能超过该 Key 的分配额，整个 Workspace 的活跃会话数不能超过账户总额（Portal 的内部预览 Key 也计入后者，但不占用户 Key 的预分配席位）。超过任一门禁返回 429，分别为 `runtime_key_concurrency_exceeded` 或 `runtime_workspace_concurrency_exceeded`。创建请求另有每 Key 每 60 秒 60 次的进程内速率限制，包括创建失败的尝试；它与并发配额是独立门禁。生产目前单 Uvicorn 进程；扩展为多进程/多实例前必须将速率限制移至共享存储。

购买包按一次性席位增加处理，价格和每包席位数由管理员在 Stripe 与 Kasamila 后台配置，未配置时不开放 Checkout。全额退款后系统会从最新创建的活动 Key 开始回收超额分配，已建立的会话保留至正常结束或到期，不允许再创建超出新上限的会话。管理员也可通过受审计的配额调账增加/减少购买部分；基础 100 席位不能减去。

### 2.1 用 API Key 查询数字人及模板目录

第三方后端可先使用同一个永久 API Key 查询该 Workspace 可使用的 ready 模板：

```http
GET /api/v1/runtime/catalog?visibility=all&orientation=all&limit=50
Authorization: Bearer ks_live_REDACTED
```

筛选参数可以任意组合：

| 参数 | 可选值 | 语义 |
| --- | --- | --- |
| `visibility` | `all`、`public`、`private` | 所有可访问模板、全平台公共模板、该 Key 所属 Workspace 的私有模板 |
| `orientation` | `all`、`landscape`、`portrait` | 不限制、宽大于高、高大于宽；正方形和未知尺寸只在 `all` 中返回 |
| `limit` | 1–100 | 每页数字人数量，默认 50 |
| `cursor` | 12 位 Avatar ID | 使用上一页 `next_cursor` 继续查询 |

例如查询“公共横屏”：

```bash
curl --fail-with-body \
  'https://www.kasamila.com/api/v1/runtime/catalog?visibility=public&orientation=landscape&limit=50' \
  -H "Authorization: Bearer ${KASAMILA_API_KEY}"
```

响应按数字人嵌套模板：

```json
{
  "data": {
    "filters": {"visibility": "public", "orientation": "landscape"},
    "items": [{
      "avatar_id": "999000000001",
      "name": "Demo",
      "visibility": "public",
      "access": "public",
      "portrait_url": "/api/v1/runtime/catalog/media/999000000001?kind=portrait",
      "full_body_url": "/api/v1/runtime/catalog/media/999000000001?kind=full_body",
      "templates": [{
        "template_code": "001",
        "template_id": "999000000001-001",
        "orientation": "landscape",
        "resolution": {"width": 1920, "height": 1080},
        "thumbnail_url": "/api/v1/runtime/catalog/media/999000000001?kind=template_thumbnail&template_code=001",
        "template_image_url": "/api/v1/runtime/catalog/media/999000000001?kind=template_image&template_code=001",
        "available_output_modes": ["original", "transparent"],
        "transparent_behavior": "original_passthrough",
        "build_mode": "geometry",
        "media_delivery": "hls",
        "mouth_profile": "C",
        "mouth_parameters": {
          "teeth_scale": 1.01,
          "mask_offset": 0.06,
          "openness_scale": 0.92,
          "width_scale": 0.92,
          "left_openness_scale": 1.0,
          "left_width_scale": 1.0
        }
      }]
    }],
    "next_cursor": null
  }
}
```

`transparent_behavior` 为 `alpha_composite` 时，模板来自明确的绿幕/蓝幕训练流程且已生成 Matte/Alpha 产物，可以输出透明 Canvas；为 `original_passthrough` 时，即使创建 Session 时请求 `transparent`，也会安全地原视频直出。每个模板同时返回 `mouth_profile`（`C`、`G`、`H`，几何模板还可显式保存候选 `I`）和 `mouth_parameters`；这是模板所有 Runtime、MCP/Agent 和推理接口共同采用的权威口型配置。

`build_mode=geometry` 的模板会同时返回 `media_delivery=hls`，浏览器初始化时必须
传入接入方托管的 `templateMedia`。模板可显式选择候选 I，但默认仍为 C。不要根据
视频时长推断交付模式。旧微调模板已经退役，不能创建新的 Runtime Session。

数字人的 `portrait_url`/`full_body_url` 与模板的 `thumbnail_url`/`template_image_url` 是受保护的相对 API 地址，不是可长期匿名访问的 `/assets` 地址。第三方后端获取图片时必须继续携带同一个永久 API Key：

```http
GET /api/v1/runtime/catalog/media/999000000001?kind=template_image&template_code=001
Authorization: Bearer ks_live_REDACTED
```

图片响应使用 `private` 缓存且执行与目录相同的所属 Workspace/公共模板授权；缺少 Key 或访问其他 Workspace 的私有图片会被拒绝。目录和图片接口都是服务端接口，禁止从浏览器暴露永久 Key。视频和网格仍只能从 Runtime Manifest 获得短期签名 URL。

## 3. 创建 Runtime Session

管理后台的 API Keys 页面提供“生成测试 Token”按钮。它调用登录态接口
`POST /api/v1/api-keys/{key_id}/test-tokens`，并要求 CSRF Token；服务端直接按所选
Key 签发同样受模板、Origin、输入模式、有效期和推理额度约束的 Runtime Token，
不会把永久 Key 明文重新发送到浏览器。该接口只用于 Workspace 管理测试，第三方
生产集成仍应使用永久 Key 从自己的后端调用标准 Session 接口。

请求：

```http
POST /api/v1/runtime/sessions
Authorization: Bearer ks_live_REDACTED
Content-Type: application/json
```

```json
{
  "avatar_id": "999000000001",
  "template_code": "001",
  "origin": "https://app.example.com",
  "input_modes": ["file", "audio_url", "microphone", "pcm_stream", "tts_stream", "rtc"],
  "output_mode": "transparent",
  "max_duration_seconds": 600
}
```

`output_mode` 可为 `original` 或 `transparent`。明确的绿幕/蓝幕模板请求透明时优先使用 Packed Matte，也可回退 Alpha WebM 或 Chroma Shader；普通背景模板请求透明时不执行抠像，实际输出原始视频。输入模式必须按最小权限签发；不需要 MIC 的页面不要申请 `microphone`。

成功响应的关键字段：

```json
{
  "data": {
    "session_id": "rts_…",
    "client_token": "ks_rt_…",
    "expires_at": "…",
    "input_modes": ["file", "microphone"],
    "requested_output_mode": "transparent",
    "output_mode": "original",
    "output_behavior": "original_passthrough",
    "available_output_modes": ["original", "transparent"],
    "build_mode": "geometry",
    "media_delivery": "hls",
    "mouth_profile": "C",
    "mouth_parameters": {
      "teeth_scale": 1.01,
      "mask_offset": 0.06,
      "openness_scale": 0.92,
      "width_scale": 0.92,
      "left_openness_scale": 1.0,
      "left_width_scale": 1.0
    }
  }
}
```

### 3.1 Node.js 18+

```javascript
const response = await fetch('https://www.kasamila.com/api/v1/runtime/sessions', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${process.env.KASAMILA_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(sessionRequest)
});
if (!response.ok) throw new Error(`Kasamila ${response.status}: ${await response.text()}`);
const { data } = await response.json();
return { sessionToken: data.client_token, expiresAt: data.expires_at };
```

### 3.2 Python 3

```python
import os, requests

response = requests.post(
    "https://www.kasamila.com/api/v1/runtime/sessions",
    headers={"Authorization": f"Bearer {os.environ['KASAMILA_API_KEY']}"},
    json=session_request,
    timeout=15,
)
response.raise_for_status()
runtime = response.json()["data"]
```

### 3.3 Java 11+

```java
var request = HttpRequest.newBuilder()
    .uri(URI.create("https://www.kasamila.com/api/v1/runtime/sessions"))
    .header("Authorization", "Bearer " + System.getenv("KASAMILA_API_KEY"))
    .header("Content-Type", "application/json")
    .POST(HttpRequest.BodyPublishers.ofString(sessionRequestJson))
    .build();
var response = HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.ofString());
if (response.statusCode() >= 300) throw new RuntimeException(response.body());
```

### 3.4 Go

```go
req, err := http.NewRequest("POST", endpoint, bytes.NewReader(sessionRequestJSON))
if err != nil { return err }
req.Header.Set("Authorization", "Bearer "+os.Getenv("KASAMILA_API_KEY"))
req.Header.Set("Content-Type", "application/json")
resp, err := http.DefaultClient.Do(req)
if err != nil { return err }
defer resp.Body.Close()
if resp.StatusCode >= 300 { return fmt.Errorf("Kasamila: %s", resp.Status) }
```

### 3.5 PHP 8

```php
$ch = curl_init('https://www.kasamila.com/api/v1/runtime/sessions');
curl_setopt_array($ch, [
  CURLOPT_POST => true,
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_HTTPHEADER => [
    'Authorization: Bearer ' . getenv('KASAMILA_API_KEY'),
    'Content-Type: application/json'
  ],
  CURLOPT_POSTFIELDS => json_encode($sessionRequest),
  CURLOPT_TIMEOUT => 15
]);
$body = curl_exec($ch);
if (curl_getinfo($ch, CURLINFO_RESPONSE_CODE) >= 300) throw new RuntimeException($body);
$runtime = json_decode($body, true)['data'];
```

### 3.6 C# / .NET 6+

```csharp
using var http = new HttpClient();
http.DefaultRequestHeaders.Authorization =
    new AuthenticationHeaderValue("Bearer", Environment.GetEnvironmentVariable("KASAMILA_API_KEY"));
var response = await http.PostAsync(endpoint,
    new StringContent(sessionRequestJson, Encoding.UTF8, "application/json"));
response.EnsureSuccessStatusCode();
var body = await response.Content.ReadAsStringAsync();
```

### 3.7 cURL

```bash
curl --fail-with-body 'https://www.kasamila.com/api/v1/runtime/sessions' \
  -H "Authorization: Bearer ${KASAMILA_API_KEY}" \
  -H 'Content-Type: application/json' \
  --data @runtime-session.json
```

所有语言都应设置连接/读取超时、检查非 2xx 响应，并避免记录 Authorization 和 `client_token`。后端返回 Token 的接口必须要求自己的用户登录，且建议校验用户对该数字人的业务权限。

## 4. 前端 Web 集成

```html
<div id="avatar" style="width:540px;height:960px"></div>
<script type="module">
  import { loadKasamila } from "https://www.kasamila.com/sdk/bootstrap/1/loader.mjs";
  const response = await fetch("/api/runtime-token", {
    method: "POST", credentials: "same-origin"
  });
  const bootstrap = await response.json();
  if (!response.ok) throw new Error("Runtime bootstrap failed");
  const Kasamila = await loadKasamila(bootstrap.sdk, "https://www.kasamila.com");
  const player = await Kasamila.create({
    element: document.querySelector("#avatar"),
    sessionToken: bootstrap.sessionToken,
    templateMedia: bootstrap.templateMedia
  });
  window.addEventListener("pagehide", () => player.destroy(), { once: true });
</script>
```

不要在页面加载时自动请求 MIC 或自动播放。Chrome、Edge 和 WebKit 都可能要求可信用户手势；MIC 还要求 HTTPS（localhost 开发环境除外）。嵌入 iframe 时，父页面需要同时配置 `allow="microphone"` 和相应 Permissions-Policy。

### 4.1 模板口型配置

管理 Portal 的 Runtime Sandbox 可以实时切换 C/G/H/I（I 仅用于显式候选测试），
并微调以下参数：

- `teeth_scale`：0.00–1.50；
- `mask_offset`：-0.20–0.50；
- `openness_scale`、`width_scale`、`left_openness_scale`、`left_width_scale`：0.50–2.00。

点击“保存到模板”后，配置写入模板记录。后续创建的 Runtime Session 会在 Session 响应、目录接口和 Manifest 中返回相同的 `mouth_profile`、`mouth_parameters`；SDK 2.1.0 在启动 WebGL 后自动应用它们，并保留异常历史模板的几何安全上限。已经初始化的浏览器实例不会被服务端配置热重置：Portal 会先把当前比较值应用到实例，再保存给后续会话。`setProfile()` 和 `setMouthParameters()` 只用于当前浏览器的实时比较，不会改变模板，除非管理 Portal 再调用模板 PATCH 保存。

管理系统也可调用模板 PATCH；`mouth_parameters` 是局部合并而非整对象替换。例如只提交 `{"mouth_parameters":{"mask_offset":0.08}}` 时，其余五项保持不变。未知字段、越界值和显式 `null` 返回 `422 validation_error`。完整管理端点及字段表见 `api_v1_phase2_avatars.md`。

### 4.2 声音适配器

```javascript
await player.setAudioFile(fileOrHttpsUrl);
await player.setMicrophone();
await player.setMediaStreamTrack(remoteRtcAudioTrack);
await player.setPcmStream(readable, { sampleRate: 16000 });
await player.setPcmStream(ttsReadable, { mode: 'tts_stream', sampleRate: 16000 });
await player.connectAudioNode(node, audioContext, { mode: 'tts_stream' });
player.setPhonemeTimeline(optionalCues);
player.stop();
await player.destroy();
```

生产 TTS 推荐返回音频文件，或输出 16 kHz、单声道、Int16/Float32 PCM 分块流。TTS 有标准音素时间戳时，可额外调用 `setPhonemeTimeline`；没有时间戳时 Audio2Viseme 仍会直接从声音推理。

### 4.3 本机浏览器 TTS Demo

```javascript
const voices = await Kasamila.listBrowserTtsVoices();
await player.speakWithBrowserTts('你好，Kasamila。', {
  voiceURI: voices[0]?.voiceURI,
  rate: 1,
  pitch: 1
});
```

Web Speech 的 `speechSynthesis` 只控制系统扬声器，没有标准 API 可把生成声音导出为 PCM 或 MediaStream。因此该方法使用 `boundary` 事件，并在事件缺失时使用字符时间估计来驱动近似口型；它适合快速体验，不代表 Audio2Viseme 的生产效果。准确评估必须把云 TTS/后端 TTS 的音频文件或 PCM 流传给 SDK。

## 5. 浏览器兼容策略

| 平台 | 支持目标 | 注意事项 |
| --- | --- | --- |
| Windows Chrome / Edge | 完整 Runtime、MIC、RTC、本机 TTS | Chromium；透明输出优先 Packed Matte，Alpha WebM 为优化回退 |
| macOS Chrome | 完整 Runtime、MIC、RTC、本机 TTS | 首次声音播放和 MIC 应由点击触发 |
| macOS Safari | Runtime、MIC、RTC、本机 TTS | 优先 Packed Matte；Web Speech `boundary` 不能作为强依赖 |
| iOS Safari / Chrome | WebKit Runtime、MIC、本机 TTS | 两者都受 iOS WebKit 约束；点击解锁音频；切后台可能暂停 |
| Android Chrome | Runtime、MIC、RTC、本机 TTS | 可用声音依赖厂商和已安装语言包；低端机需关注帧率/内存 |

运行前至少检测：`isSecureContext`、WebGL、`AudioContext`、`AudioWorkletNode`、`navigator.mediaDevices.getUserMedia` 和 `speechSynthesis`。兼容决策以能力检测为准，不使用 User-Agent 字符串硬编码。

明确绿幕/蓝幕模板的透明背景生产顺序为 Packed Matte H.264（生产主路径）→ Alpha WebM（优化回退）→ 实时 Chroma Key（兜底）。普通背景模板不会进入这条链路，请依据 `output.mode` 和 `output.behavior` 判断实际输出，不要只依据请求参数。

## 6. MCP / Agent API

Endpoint：`POST https://www.kasamila.com/api/v1/mcp/rpc`

认证：`Authorization: Bearer ks_live_…` 或 `ks_test_…`。支持 MCP Streamable HTTP 的无 SSE 模式和 JSON-RPC 2.0。当前工具：

- `list_avatars`
- `list_avatar_templates`
- `create_runtime_session`
- `get_runtime_session_status`
- `enqueue_audio_source`
- `stop_runtime_session`

初始化：

```json
{"jsonrpc":"2.0","id":"init-1","method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"your-agent","version":"1.0.0"}}}
```

创建 Agent/Runtime Session：

```json
{
  "jsonrpc": "2.0",
  "id": "session-1",
  "method": "tools/call",
  "params": {
    "name": "create_runtime_session",
    "arguments": {
      "avatar_id": "999000000001",
      "template_code": "001",
      "origin": "https://app.example.com",
      "input_modes": ["audio_url"],
      "output_mode": "original",
      "max_duration_seconds": 600
    }
  }
}
```

Agent 将 `client_token` 安全传给网页。网页初始化 SDK 后会轮询持久化命令。创建 Session 时必须在 `input_modes` 中包含 `audio_url`，Agent 才能用 `enqueue_audio_source` 投递公开 HTTPS 音频 URL；该 URL 必须允许目标网页 Origin 跨域 GET，建议使用短期、只读、单对象预签名 URL。MCP 不生成文本、不调用 LLM 或 TTS；它只编排调用方提供的声音。默认自动播放模式在音频成功提交给播放器后回执 `acknowledged`，失败回执 `failed`，不会形成队首阻塞。

如网页以 `autoPlayAgentCommands: false` 初始化 SDK，则 `kasamila-audio-source` 事件仅交付命令，SDK **不会自动回执**。接入方完成处理后必须调用 `await avatar.ackAgentCommand(command.command_id)`；处理失败时调用 `await avatar.ackAgentCommand(command.command_id, { status: "failed", error_code: "audio_playback_failed" })`。这避免尚未播放的命令被误报为成功。

`list_avatars` 仅列出当前 API Key 可访问且至少有一个可运行几何模板的活跃数字人；`list_avatar_templates` 仅返回 `ready` 的 geometry 模板及其 `background_mode`、`available_output_modes`、`transparent_behavior`、`mouth_profile` 和完整 `mouth_parameters`。`create_runtime_session` 的结构化结果也返回同一组口型配置，因此 MCP Host 无需自行维护另一份方案或参数表。

## 7. Demo 与故障排查

- 文件无声音：确认浏览器已由用户点击解锁音频、文件可被 `decodeAudioData` 解码，并检查 Session 包含 `file`。
- MIC 按钮无响应：确认 HTTPS、系统存在输入设备、浏览器网站权限允许；检查设备是否被会议软件独占。
- `NotAllowedError`：权限被拒绝或不安全上下文。
- `NotFoundError`：没有满足约束的麦克风。
- `NotReadableError`：设备或操作系统无法读取，常见于独占占用。
- iOS Chrome 与 Safari 表现相同：这是预期的 WebKit 平台约束。
- 本机 TTS 声音列表为空：等待 `voiceschanged` 后重试，并确认操作系统已安装所需语言包。
- 本机 TTS 口型不够准确：这是无 PCM 条件下的近似 Demo；改用 TTS 音频/PCM 流验证生产效果。
- `runtime_origin_mismatch`：签发 Session 的 `origin` 与页面 `location.origin` 不一致。
- 请求透明但得到原视频：检查 `output_behavior=original_passthrough`；这表示模板不是明确的绿幕/蓝幕源，系统按设计跳过抠像。
- geometry 初始化拒绝缺少媒体：生产 SDK 不使用 Portal 的 `providerPreview`；按几何接入指南传入与时间线匹配的 HLS `templateMedia`。
- 第三方页面 Worker 或纹理被 CSP 拦截：SDK 2.1.0 的 Audio2Viseme 和几何分块解码都需要 `worker-src blob:`，同时 `connect-src` 和 `img-src` 允许 `https://www.kasamila.com`。
- 视频周期卡顿或忽快忽慢：确认几何 Range 返回 `206`、HLS 能持续预缓冲、Blob Worker 未被 CSP 拦截，并删除业务侧对 SDK 内部 video 的 `currentTime`/`playbackRate` 校时逻辑。
- 有口型但没有牙齿：确认实际 SDK 为 `2.1.0`，牙齿纹理请求返回 200，`teeth_scale > 0`，并删除第三方旧嘴部图层或对内部 renderer 的直接调用；详见第三方升级指南。

## 8. 上线检查表

- 永久 Key 只存在服务端 Secret Manager，已配置轮换和撤销流程。
- Origin 白名单使用精确 HTTPS Origin，通配范围保持最小。
- 自有 Token 交换接口要求用户登录、校验模板权限并设置限流。
- CSP 允许加载 Kasamila SDK、模型、视频和 Worker；iframe 正确配置麦克风权限。
- geometry 模板已按 `media_contract` 打包 2 秒 fMP4 HLS，并按实际输出模式返回原背景或 Packed Matte 描述符。
- 长时播放和 loop 已验证固定 `1.0` 倍速，无固定 2 秒周期暂停/恢复或循环边界快进。
- 页面有明确的加载、权限、播放、停止和错误状态。
- `pagehide`/组件卸载调用 `destroy()`，RTC/MIC 切换前调用 `stop()`。
- Windows Chrome/Edge、macOS Safari/Chrome、iOS Safari/Chrome、Android Chrome 使用真实设备验收。
- 分别验证原背景和透明背景；透明模式验证 Alpha WebM 与 Packed Matte 回退。
- 生产 TTS 使用可送入 SDK 的文件/PCM，不把本机 Web Speech Demo 当作质量门禁。
