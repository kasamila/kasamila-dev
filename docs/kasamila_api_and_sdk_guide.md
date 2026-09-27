[English](kasamila_api_and_sdk_guide.en.md) | [简体中文](kasamila_api_and_sdk_guide.md)

> SDK 2.1：GLSL/ONNX 加密与 Runtime 临时授权，第三方无需配置解密密钥。参见 [AILIVE 升级与保护说明](sdk_2_1_protected_runtime.md)。固定 2.0.0 仍受支持。

# Kasamila API / Web SDK 2.1.0 开发者手册

> SDK 2.1.0 已上线：请先阅读[新 Runtime 版本契约](sdk_2_runtime_release_contract.md)。不兼容 SDK 1 或旧可变入口。本文固定版本检查仅适用于显式 pinned 的样例，不能与服务端全局最新版本比较。后端须透传 Session 返回的 sdk，网页使用 bootstrap 加载。HLS 已内置。现在可以按清单迁移。


本文是第三方接入 Kasamila 的当前入口。生产系统自 `1.11.0` 起只接受和运行
`build_mode=geometry` 的几何模型模板；人物专属 MouthUNet、微调任务和
V7+v29 混合渲染已经退役。旧微调接口、旧渲染器和旧示例只具有历史审计意义，
不能用于新接入。

面向已有接入方的逐项迁移说明见
[`sdk_1_11_0_third_party_migration.md`](sdk_1_11_0_third_party_migration.md)。
完整字段、HLS、透明媒体和浏览器实现见
[`api_v1_geometry_runtime_guide.md`](api_v1_geometry_runtime_guide.md)，可运行代码见
[`examples/geometry-runtime-web`](../examples/geometry-runtime-web/README.md)。

## 1. 当前生产契约

| 项目 | SDK 2.1.0 契约 |
| --- | --- |
| 模板模式 | 仅 `geometry` |
| SDK 地址 | `https://www.kasamila.com/sdk/releases/2.1.0/kasamila.js` |
| 媒体交付 | 所有长短模板统一使用接入方托管的 HLS |
| 几何数据 | Kasamila Runtime Manifest 签发，V7 + 468 点 + 分块几何轨道 |
| 默认口型 | C |
| 候选口型 | G/H/I 仅用于显式测试；I 不会自动启用 |
| 牙齿与口腔 | SDK 的 V7 WebGL renderer 统一生成；不是 HLS 视频的一部分 |
| 透明媒体 | Packed Matte HLS；不能把普通 HLS 当作 Alpha 视频 |
| 浏览器凭据 | 仅短期 `ks_rt_` Runtime Token |
| 服务端凭据 | 永久 `ks_live_` / `ks_test_` API Key |

计费边界：登录用户在 Kasamila Portal 站内进行内置预览不扣推理额度。通过 API/SDK
创建 Runtime Session 后立即开始按服务端实际经过时间计费；创建时预留租约额度，
提前结束会返还未使用的秒数，直到租约到期仍未结束则消耗完整租约。新注册账号赠送的
1 小时仅供 API/SDK 使用，注册后 30 天有效。官方 SDK 会在销毁时发送 `end`，第三方自行管理 Token
时也应及时调用 `POST /api/v1/runtime/sessions/end`。站内免费预览 Token 同时绑定有效
Portal 登录 Cookie，不可复制到第三方页面使用；第三方必须用自己的 API Key 签发普通 Runtime Token。

SDK `2.1.0` 增加 client 协商和 sdk 描述符；口型与媒体字段的语义保持不变。V7 对开口原片完成源牙清理后，会沿实时 468 点内唇
曲线重建闭合接触层，并随声音开度连续淡出。接触层颜色来自几何模型中已经过鲁棒
取样和时序滤波的上下唇材质，减少逐帧原视频取样的影响，旨在抑制 IDLE、静音和闭合音中
牙齿、高光或编码噪声形成的乳白像素、双排亮片和肉色补片；个别模板仍需按实际效果验收，不保证消除所有伪影。
声音真正驱动张口后，程序化上下牙仍按开度和闭合权重平滑显示。该规则适用于所有
geometry 模板，不包含模板编号特判。现有 `templateMedia` 和口腔校准
参数无需迁移，模板无需重新进行几何训练。

媒体和数据必须使用同一个 `timelineId`、帧数、fps、逻辑尺寸和 2 秒分块契约。
SDK 会拒绝不一致的描述符，不能在第三方页面跳过检查。

## 2. 最小接入流程

1. 第三方后端用永久 API Key 查询 ready 的 geometry 模板。
2. 后端创建绑定模板、网页 Origin、输入方式和输出方式的 Runtime Session。
3. 后端只把短期 `client_token` 及自己保存的 `templateMedia` 描述符返回网页。
4. 网页加载官方 SDK `2.1.0`，将 Token 与 HLS 描述符传给
   `Kasamila.create()`。
5. SDK 获取签名几何数据，加载 V7 renderer、口腔材质和牙齿纹理，在浏览器中
   接收音频并实时渲染。
6. 页面退出或组件卸载时调用 `destroy()`。

```text
第三方后端                      浏览器
ks_live_/ks_test_               ks_rt_
      │                            │
      ├─ POST /runtime/sessions ───┤
      │                            ├─ Kasamila.create()
      │                            ├─ 第三方 HLS 视频
      │                            ├─ Kasamila 签名几何分块
      │                            └─ WebGL V7 口腔/牙齿渲染
```

## 3. 后端创建 Runtime Session

永久 Key 只能保存在第三方服务器或 Secret Manager 中：

```javascript
const response = await fetch(
  'https://www.kasamila.com/api/v1/runtime/sessions',
  {
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
  }
);
const payload = await response.json();
if (!response.ok) {
  throw new Error(payload.error?.message || `Kasamila ${response.status}`);
}

// 先验证自己的终端用户与模板权限，再返回给网页。
return {
  sdk: payload.data.sdk, sessionToken: payload.data.client_token,
  expiresAt: payload.data.expires_at,
  mediaDelivery: payload.data.media_delivery,
  templateMedia: loadTrustedMediaDescriptor(
    payload.data.output_mode,
    '999000000001-001'
  )
};
```

`loadTrustedMediaDescriptor()` 必须从第三方受信配置或数据库读取，不能接受浏览器
任意提交的 URL。永久 Key、Runtime Token 和签名资产 URL 不得写入日志。

## 4. 浏览器初始化

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

Safari 可使用原生 HLS；Chrome、Edge、Firefox 和多数 Android 浏览器需要接入方
使用 SDK 包内的 hls.js，无需外部脚本地址。
SDK 会在几何、纹理和口型运行时就绪后才从第 0 帧启动视频；HLS 与 2 秒几何分块
分别预缓冲，几何解压解析在 Blob Worker 中完成。模板始终以 `1.0` 倍速运行，接入方
不要直接修改 SDK 内部 video 的 `currentTime` 或 `playbackRate`。

## 5. 音频输入

Runtime Session 必须授权对应的 `input_modes`：

```javascript
await player.setAudioFile(file);                       // file
await player.setAudioUrl(corsEnabledTemporaryUrl);    // audio_url
await player.setPcmStream(readable, { sampleRate: 16000 });
await player.setPcmStream(ttsReadable, {
  mode: 'tts_stream', sampleRate: 16000
});
await player.setMicrophone();                          // microphone
await player.setMediaStreamTrack(remoteRtcTrack);      // rtc
```

生产 TTS 优先提供可解码音频文件，或 16 kHz 单声道 Int16/Float32 PCM。浏览器
`speechSynthesis` 无法稳定导出 PCM，只适合演示，不应作为口型质量验收依据。

## 6. 口型和牙齿规则

- 不传 `profile` 时，SDK 使用模板 Manifest 的默认档位；生产默认是 C。
- `setProfile('I')` 只应在明确的候选测试中调用。
- 不要把旧系统的 MouthUNet/v29 参数、嘴部 mask 或牙齿图层叠加到 SDK Canvas。
- 不要把 `teeth_scale` 初始化为 `0`。除非有明确产品需求，使用 Manifest 下发值。
- 牙齿不是 HLS 视频的一部分，也不由第三方单独上传。SDK 会从 Kasamila 静态域
  加载 V7 renderer 和 `teeth_cavity_texture.png`，并从签名几何资产加载内唇材质。
- 不要直接实例化 `KasamilaGeometryWebGLPlayer`，也不要只复制
  `custom_live_geometry_ghi_v7.js`。公开稳定入口只有 `Kasamila.create()`。

如果人物有口型但没有牙齿，优先检查浏览器 Network/Console：

1. SDK 必须显示 `Kasamila.version === '2.1.0'`；清理旧 Service Worker/CDN 缓存。
2. `/web/common/teeth_cavity_texture.png` 必须返回 `200`，不能被 CSP、CORS、广告
   拦截器或第三方代理改写。
3. `player.getMouthConfiguration().parameters.teeth_scale` 不得为 `0`。
4. 页面不得在 SDK Canvas 上覆盖自己的嘴部/牙齿层。
5. 若缺少 V7 内唇材质，SDK 会报
   `Geometry v7 oral material is incomplete`，不得捕获后回退旧 renderer。

## 7. HLS、透明媒体、CORS 和 CSP

所有 geometry 模板，不论 10 秒还是 5 分钟，都传完整 `templateMedia` 描述符。
描述符不能只传 `.m3u8` URL；必须包含 `timelineId`、`frameCount`、`fps`、尺寸、
`layout`、`segmentDuration` 和规范视频 SHA-256。透明输出必须使用与 Session 输出
模式匹配的 `packed_matte` 描述符。

第三方媒体域至少返回：

```http
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Methods: GET, HEAD, OPTIONS
Access-Control-Expose-Headers: Content-Length, Content-Range, Accept-Ranges, ETag
```

建议 CSP 起点：

```text
script-src 'self' https://www.kasamila.com;
connect-src 'self' https://www.kasamila.com https://media.example.com;
media-src 'self' https://media.example.com blob:;
worker-src 'self' blob:;
img-src 'self' https://www.kasamila.com data: blob:;
```

特别注意 `img-src https://www.kasamila.com` 与 `worker-src blob:`：前者允许牙齿和
材质纹理，后者允许 Audio2Viseme 与几何分块解码 Worker。HLS 的播放列表、初始化段和所有 `.m4s`
分片都必须有正确 CORS，不能只给 `.m3u8` 加响应头。

## 8. 版本升级与验收

上线前至少验证：

- 原背景、Packed Matte 透明背景各一个模板；
- 10–15 秒短模板和 5 分钟以上长模板的首播、跨段、seek、loop；
- 文件音频、第三方 TTS 音频或 PCM 流至少各一种；
- 静音、张口、闭口、唇齿音和大幅左右口型均能看到上下牙及正确遮挡；
- C 是默认档位，未被业务代码隐式改成 I；
- 断网恢复、HLS 签名过期、Runtime Token 过期都有明确错误状态；
- 长时间播放无固定 2 秒周期卡顿、循环边界停顿或临时快进，实际倍速始终为 `1.0`；
- SPA 路由切换和页面退出调用 `destroy()`，没有重复 Canvas、音频节点或计量心跳；
- Windows/macOS/iOS/Android 真机长时间运行内存稳定。

第三方升级时可直接采用
[`sdk_1_11_0_third_party_migration.md`](sdk_1_11_0_third_party_migration.md)
作为交付和验收清单。
