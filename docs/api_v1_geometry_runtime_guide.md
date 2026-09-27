[English](api_v1_geometry_runtime_guide.en.md) | [简体中文](api_v1_geometry_runtime_guide.md)

> SDK 2.1：GLSL/ONNX 加密与 Runtime 临时授权，第三方无需配置解密密钥。参见 [AILIVE 升级与保护说明](sdk_2_1_protected_runtime.md)。固定 2.0.0 仍受支持。

# Kasamila 几何模型 API / Web SDK 第三方接入指南

> SDK 2.1.0 已上线：请先阅读[新 Runtime 版本契约](sdk_2_runtime_release_contract.md)。不兼容 SDK 1 或旧可变入口。本文固定版本检查仅适用于显式 pinned 的样例，不能与服务端全局最新版本比较。后端须透传 Session 返回的 sdk，网页使用 bootstrap 加载。HLS 已内置。现在可以按清单迁移。


本文是几何模型模板的正式第三方接入说明，适用于 Kasamila API v1 和 Web SDK
`2.1.0`。自 2026-09-20 起，几何训练是唯一可创建和运行的模板处理模式：它通过离线计算生成逐帧跟踪、网格、口腔材质和校准数据组成的几何模型，不训练人物专属神经网络权重，
但仍需要离线执行全片人脸追踪、MediaPipe 468 点数据生成、V7 口腔处理、材质先验、
几何轨道打包和质量门禁。

SDK `2.1.0` 在源牙清理与声音驱动牙齿显隐的基础上，为开口原片增加了通用的动态
闭合唇缝重建。接触层使用几何模型内经过鲁棒取样、离线时序滤波和运行时平滑的双唇
材质色，减少逐帧源视频唇边的影响，旨在抑制牙齿、高光及压缩噪声在 IDLE、静音或
闭合音中形成游荡乳白像素、双排亮片或肉色补片；个别模板仍需按实际效果验收，不能保证消除所有伪影。唇缝随声音
开度连续淡出，真正张开后仍由 V7 WebGL renderer 平滑生成上下牙。该变更不依赖
模板编号，也不需要重新进行几何训练。

可运行代码位于
[`examples/geometry-runtime-web`](../examples/geometry-runtime-web/README.md)。

## 1. 架构和责任边界

```text
模板所有者上传原片
        │
        ▼
Kasamila Worker：V7 口腔处理 + 468 点跟踪 + Mouth Rig + geometry track
        │
        ├── Kasamila 托管：mesh、rig、材质、几何分块、Runtime Manifest
        └── 交付规范媒体：原背景 MP4 或 Packed Matte MP4
                                  │
                                  ▼
接入方：按 2 秒切成 HLS，上传自己的 CDN，保存 kasamila-media.json
                                  │
商户后端：永久 API Key → 短期 Runtime Token
                                  │
浏览器：HLS + Kasamila 几何数据 + 音频 → WebGL 实时渲染
```

几何数据归 Kasamila API/SDK 管理；模板视频的生产存储、CDN、带宽、签名和 HLS
传输归接入方管理。短片和长片使用完全相同的 HLS 接口，不存在“小于某时长就整段
下载”的另一套几何协议。

## 2. 当前生产模式

| 项目 | 生产契约 |
| --- | --- |
| 构建字段 | `build_mode=geometry`；可省略 |
| 额度 | `geometry_templates`，每个 ready 模板核销 1 额度 |
| 人物专属模型 | 不训练 |
| 预处理 | V7 分割、逐帧 468 点、动态 ROI 与质量门禁 |
| 浏览器口腔 renderer | 完整 V7 几何、材质、遮挡与牙齿链 |
| Runtime 默认口型 | C |
| 可选口型 | C/G/H/I；I 仍为显式候选 |
| 长短片媒体 | 统一 HLS + 对齐的几何分块 |

人物专属 MouthUNet 和 V7+v29 混合模式已经退役。历史记录只用于审计，不能创建、
重试或运行。对外支持能力和变更说明见
[版本公告](https://www.kasamila.com/portal/releases)。

模板构建通过 Portal 登录会话和 CSRF 保护，不使用 Runtime API Key。第三方只消费
已经 ready 的模板时，可以跳过构建 API，直接从目录和 Runtime Session 开始。

几何构建的排队请求为：

```http
POST /api/v1/avatars/{avatar_id}/templates/{template_code}/train
Content-Type: application/json
X-CSRF-Token: …
Idempotency-Key: geometry-999000000001-001-v1
```

```json
{
  "upload_id": "00000000-0000-4000-8000-000000000000",
  "background_mode_confirmation": "original",
  "build_mode": "geometry",
  "epochs": 1,
  "priority": 0,
  "max_retries": 2
}
```

`epochs` 在 geometry 模式固定按 1 处理，只是兼容字段。额度查询：

```http
GET /api/v1/training/entitlement
```

## 3. 查询可用模板

永久 `ks_live_`/`ks_test_` Key 只能在商户后端使用：

```http
GET https://www.kasamila.com/api/v1/runtime/catalog?visibility=all&orientation=all
Authorization: Bearer ks_live_REDACTED
```

几何模板的关键字段：

```json
{
  "template_id": "999000000001-001",
  "build_mode": "geometry",
  "media_delivery": "hls",
  "available_output_modes": ["original", "transparent"],
  "transparent_behavior": "alpha_composite",
  "mouth_profile": "C",
  "mouth_parameters": {
    "teeth_scale": 1,
    "mask_offset": 0,
    "openness_scale": 1,
    "width_scale": 1,
    "left_openness_scale": 1,
    "left_width_scale": 1
  }
}
```

以 `build_mode` 和 `media_delivery` 决定前端是否需要 `templateMedia`，不要根据视频
时长猜测模式。目录不返回长期视频地址；运行时几何数据只通过短期 Manifest 签发。

## 4. 创建 Runtime Session

商户后端调用：

```javascript
const response = await fetch('https://www.kasamila.com/api/v1/runtime/sessions', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${process.env.KASAMILA_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    avatar_id: '999000000001',
    template_code: '001',
    origin: 'https://app.example.com',
    input_modes: ['file', 'audio_url', 'pcm_stream', 'tts_stream'],
    output_mode: 'original',
    max_duration_seconds: 600
  })
});
const payload = await response.json();
if (!response.ok) throw new Error(payload.error?.message || `Kasamila ${response.status}`);
```

响应包含：

```json
{
  "data": {
    "session_id": "rts_…",
    "client_token": "ks_rt_…",
    "sdk_version": "2.1.0",
    "expires_at": "2026-09-20T12:00:00Z",
    "build_mode": "geometry",
    "media_delivery": "hls",
    "output_mode": "original",
    "output_behavior": "original",
    "mouth_profile": "C"
  }
}
```

商户自己的 Token 交换接口必须先验证终端用户登录和模板使用权限，再把
`client_token` 返回浏览器。不要把永久 Key、完整 Kasamila 响应或签名资产 URL
写入日志。

## 5. 规范媒体与 HLS 描述符

### 5.1 原背景

从 Portal/受授权管理交付取得几何模板的规范 `preview_video` 和 `media_contract`，
然后运行：

```bash
python scripts/package_template_hls.py canonical.mp4 ./hls-original \
  --public-url https://media.example.com/avatar/999000000001/001/original \
  --timeline-id <media_contract.timeline_id> \
  --frame-count <media_contract.frame_count> \
  --fps <media_contract.fps> \
  --width <media_contract.width> \
  --height <media_contract.height> \
  --layout original \
  --source-sha256 <media_contract.canonical_video_sha256>
```

### 5.2 透明背景

透明输出必须使用规范 `preview_video_matte`，不能把普通 HLS 当作 Alpha 视频：

```bash
python scripts/package_template_hls.py canonical-matte.mp4 ./hls-transparent \
  --public-url https://media.example.com/avatar/999000000001/001/transparent \
  --timeline-id <media_contract.timeline_id> \
  --frame-count <media_contract.frame_count> \
  --fps <media_contract.fps> \
  --width <media_contract.width> \
  --height <media_contract.height> \
  --layout packed_matte \
  --matte-layout-json '{"color_region":[0,0,0.6666666666666666,1],"matte_region":[0.6666666666666666,0,0.3333333333333333,0.5]}' \
  --source-sha256 <media_contract.packed_matte_sha256>
```

脚本验证 SHA-256、CFR 帧率、帧数、时长、尺寸和透明布局，生成 2 秒独立 fMP4
HLS，并写出 `kasamila-media.json`。上传整个输出目录且不要再次转码。

描述符字段：

| 字段 | 说明 |
| --- | --- |
| `delivery` | geometry 固定为 `hls` |
| `url` | 接入方 HTTPS HLS VOD 播放列表 |
| `timelineId` | 必须等于 Manifest `media_contract.timeline_id` |
| `frameCount` / `fps` | 必须匹配规范 CFR 时间线 |
| `width` / `height` | 逻辑人物画面尺寸；Packed Matte 的物理解码宽度由布局推导 |
| `layout` | 原背景为 `original`，透明为 `packed_matte` |
| `segmentDuration` | v2 几何轨道固定与 `geometry_track.chunk_seconds` 相同，当前为 2 |
| `canonicalVideoSha256` | 打包输入 MP4 的摘要，原背景与 Packed Matte 使用各自契约摘要 |
| `matteLayout` | 仅 Packed Matte 必填，必须与契约完全一致 |

同一透明模板若同时开放原背景与透明输出，应分别保存两个描述符，并按 Runtime
Session 的实际 `output_mode` 返回对应描述符。

## 6. 浏览器 SDK

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

Safari 使用原生 HLS；其他支持的浏览器使用不可变 SDK 包内的 hls.js。SDK 将 HLS 前向缓冲限制为 12 秒、最大 30 秒，后向
缓冲限制为 15 秒，并按需读取 Kasamila 的 2 秒几何数据分块。当前 SDK 在开始播放
前会保持视频暂停，完成首块几何数据、纹理和口型运行时初始化后再从第 0 帧启动；
几何轨道保留六个分块、最多提前读取三个分块，并在结尾提前读取第 0 块以覆盖 loop。

几何分块的 gzip 解压和 JSON 解析在 Blob Worker 中完成，避免每两秒阻塞浏览器渲染
主线程。视频的解码帧 PTS 是唯一模板时钟，`playbackRate` 固定为 `1.0`；SDK 不会
通过临时加速追赶几何数据。数据尚未到达时仍会暂停媒体时钟以保证帧级对齐，但在
正常网络和允许 Worker 的 CSP 下，应由预取覆盖而不是形成周期性停顿。

SDK 会拒绝以下情况，而不是静默错位播放：

- geometry 模板没有 `templateMedia`；
- `timelineId`、帧数、fps 或逻辑尺寸不一致；
- HLS 分片时长与几何分块时长不一致；
- 原背景/透明布局与 Session 输出模式不一致；
- 规范媒体 SHA-256 身份不匹配。

### 6.1 声音输入

```javascript
await player.setAudioFile(fileOrHttpsUrl);
await player.setAudioUrl(corsEnabledTemporaryUrl);
await player.setPcmStream(readable, { sampleRate: 16000 });
await player.setPcmStream(ttsReadable, { mode: 'tts_stream', sampleRate: 16000 });
await player.setMicrophone();
await player.setMediaStreamTrack(remoteRtcAudioTrack);
await player.connectAudioNode(node, audioContext, { mode: 'tts_stream' });
player.stop();
await player.destroy();
```

Session 必须包含对应 `input_modes`。生产 TTS 优先使用可解码音频文件，或 16 kHz
单声道 Int16/Float32 PCM。`speechSynthesis` Demo 无法取得 PCM，仅能近似驱动，不应
作为口型质量验收。

### 6.2 口型档位

- C：生产默认，第三方上线默认使用。
- G/H：显式对比候选。
- I：仅 geometry 模板可选，仍是显式候选，不会因模板是 geometry 自动启用。

```javascript
await player.setProfile('C');
const current = player.getMouthConfiguration();
```

档位切换只作用于当前实例，不写回模板。模板级保存由管理 Portal 或受授权模板
PATCH 完成。

### 6.3 IDLE 和时间轴

Runtime 初始化时模板从第 0 帧开始播放。IDLE 会完整播放模板并在结尾循环；声音
开始时从当时的 IDLE 位置继续，不会自动 seek 到第 0 帧。声音结束后视频仍从当前
位置继续。调用 `stop()` 只停止声音和口型输入，不停止或重置模板视频。

## 7. CDN、CORS 与 CSP

HLS 媒体域至少需要：

```http
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Methods: GET, HEAD, OPTIONS
Access-Control-Expose-Headers: Content-Length, Content-Range, Accept-Ranges, ETag
```

MIME 建议：

- `.m3u8`: `application/vnd.apple.mpegurl`
- `.m4s` / `init.mp4`: `video/mp4`
- `kasamila-media.json`: `application/json`

推荐 CSP 起点：

```text
script-src 'self' https://www.kasamila.com;
connect-src 'self' https://www.kasamila.com https://media.example.com;
media-src 'self' https://www.kasamila.com https://media.example.com blob:;
worker-src 'self' blob:;
img-src 'self' https://www.kasamila.com data: blob:;
```

SDK `2.1.0` 在第三方 Origin 上会通过 CORS 读取 Audio2Viseme Worker、牙齿纹理和渲染资产，再创建当前
页面 Origin 的口型与几何解码 Blob Worker，因此 `worker-src blob:` 是必需项。不要把 hls.js URL
暴露成用户可输入字段；固定部署到自己的可信静态域。

第三方只应加载 `/sdk/releases/2.1.0/kasamila.js` 并调用 `Kasamila.create()`。不要直接加载
`custom_live_geometry_ghi_v7.js`，也不要只复制 SDK 入口文件：V7 renderer、牙齿
纹理、Audio2Viseme Worker 和其他静态依赖必须保持同一版本和完整路径。SDK 会从
Kasamila 脚本 Origin 加载这些资源，媒体仍从接入方 HLS Origin 加载。

## 8. 透明输出

以 `player.getOutput()` 的实际值为准：

```javascript
const output = player.getOutput();
// { requestedMode, mode, behavior, strategy, availableModes, transparentCanvas }
```

只有 `mode === 'transparent'` 且 `transparentCanvas === true` 才表示最终 Canvas 带
透明通道。普通背景模板请求透明可能返回 `original_passthrough`，应用不能只根据
请求参数假定已经透明。

## 9. 常见错误

| 错误/现象 | 原因与处理 |
| --- | --- |
| `origin_not_allowed` | API Key 白名单没有 Session 请求中的精确 Origin |
| `runtime_origin_mismatch` | 浏览器 `location.origin` 与 Token 绑定 Origin 不同 |
| `runtime_session_expired` | 重新由商户后端签发短期 Token |
| `runtime_media_contract_invalid` | 模板 V7/几何/媒体契约不完整，不能在前端绕过 |
| `Template media timeline does not match…` | 描述符属于其他模板版本或被手工修改 |
| `Geometry templates require HLS…` | geometry 不能使用 progressive 描述符 |
| `HLS segment duration…` | 重新按契约的 2 秒分片打包 |
| HLS 403/签名过期 | 接入方 CDN 签名生命周期短于 Runtime Session；重新签发描述符 URL |
| HLS CORS 错误 | 检查播放列表、初始化段和所有媒体段的响应头 |
| Worker 被 CSP 拦截 | 增加 `worker-src blob:`，并允许连接 Kasamila 静态域 |
| 视频周期卡顿或忽快忽慢 | 确认实际加载当前 SDK 2.1.0、Blob Worker 未被 CSP 拦截、几何 bundle 的 Range 请求返回 `206`，且 HLS 媒体段可以持续预缓冲；不要由业务代码修改 `video.currentTime` 或 `playbackRate` |
| 有口型但没有牙齿 | 确认 SDK 为 2.1.0、牙齿纹理返回 200、`teeth_scale > 0`，且没有第三方旧嘴层覆盖 SDK Canvas |
| I 不可选 | 模板不是 geometry，或调用方把候选档位当成默认档位 |
| 本地音频无口型 | Session 未授权 `file`，浏览器音频未由手势解锁，或文件不可解码 |

## 10. 上线检查表

- 永久 API Key 只在 Secret Manager/商户后端，浏览器只拿 `ks_rt_`。
- Token 交换接口具备用户登录、模板授权、限流和错误脱敏。
- `build_mode=geometry` 时始终返回与输出模式匹配的 `templateMedia`。
- HLS 是 2 秒独立 fMP4 VOD，已测试首播、跨段、seek、loop、断网重试和签名过期。
- 长时播放保持 `1.0` 倍速，几何 Range 预取没有形成固定 2 秒周期的暂停/恢复。
- 原背景和 Packed Matte 分别核验摘要、帧数、fps、时长和逻辑尺寸。
- CDN CORS、MIME、缓存键和签名参数正确。
- CSP 允许 Kasamila 脚本/连接、媒体 CDN 和 Blob Worker。
- 不直接加载内部 renderer；牙齿、上下唇遮挡和内唇材质由完整 V7 SDK 链统一渲染。
- 默认使用 C；G/H/I 仅在明确的 A/B 测试中启用。
- 文件、PCM/TTS、MIC、RTC 只申请实际需要的 `input_modes`。
- Windows/macOS/iOS/Android 真机验证音频解锁、后台恢复、内存和长时循环。
- 页面卸载和 SPA 组件销毁调用 `destroy()`。
