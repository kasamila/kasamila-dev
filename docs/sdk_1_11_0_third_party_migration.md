# Kasamila Web SDK 1.11.6 第三方升级指南

本文用于已有第三方系统从旧 SDK/旧模板流程升级到 Kasamila Web SDK `1.11.6`。
它可直接交给接入方开发、测试和运维团队执行。
Runtime 并发席位的后续 API 扩展不需要升级 Web SDK；接入方升级说明见
[`runtime_concurrency_api_sdk_upgrade_20260923.md`](runtime_concurrency_api_sdk_upgrade_20260923.md)。

`1.11.6` 是兼容性修订：保持 Runtime API、`templateMedia` 和口腔校准字段不变。Agent 手动音频命令模式须显式调用 `ackAgentCommand()`；默认自动播放模式不变。
V7 会为开口原片沿实时 468 点内唇曲线重建闭合接触层，并随声音开度连续淡出；
其颜色来自几何模型的稳定双唇材质，不再读取当前视频帧的唇边像素，因而不会把牙齿、
高光或编码噪声表现成游荡的乳白像素。IDLE、静音和闭合音也不会出现双排亮片或整块
肉色补片，声音驱动张口后的程序化上下牙仍正常显示。规则对所有 geometry 模板一致，
I 仍是显式候选。第三方仍必须使用 HLS；Portal 自有签名 MP4 预览的启动缓冲属于
内部诊断通道，不改变对外媒体契约。

## 1. 必须变更的内容

### 1.1 只使用 geometry 模板

- 目录和 Session 中只接受 `build_mode === "geometry"` 的 ready 模板。
- 删除 `legacy_train`、MouthUNet、v29、人物专属模型以及微调状态分支。
- 不再调用旧 `/auth/api/train/*` 接口，也不自行拼接旧 `/assets/...` 运行资源。
- 旧模板 ID 不能因为名称相同就继续复用；以 Runtime Catalog 返回的 ready geometry
  模板为准。

### 1.2 固定 SDK 版本

```html
<script src="https://www.kasamila.com/web/sdk/kasamila.js?v=1.11.6"
        crossorigin="anonymous"></script>
```

启动前检查：

```javascript
if (globalThis.Kasamila?.version !== '1.11.6') {
  throw new Error(`Expected Kasamila 1.11.6, got ${globalThis.Kasamila?.version}`);
}
```

不要直接加载或实例化以下内部文件：

- `custom_live_geometry_ghi_v7.js`
- `template-media.js`
- Audio2Viseme Worker/ONNX 文件
- `teeth_cavity_texture.png`

这些依赖由 `Kasamila.create()` 从 SDK 所在的 Kasamila Origin 统一加载。若接入方必须
做离线镜像，应镜像并版本锁定完整 SDK 资源树及其路径，不能只复制入口 JS；正式
环境优先使用 Kasamila 官方地址。

### 1.3 所有媒体统一 HLS

短模板和长模板使用同一接口。接入方负责托管规范媒体 HLS，Kasamila 负责签发
几何、材质和口型数据。浏览器必须同时获得：

- `ks_rt_` Runtime Token；
- 与 Runtime Manifest 同时间线的 `templateMedia`；
- 非 Safari 浏览器所需的受信 hls.js URL。

`templateMedia` 是 JSON 对象，不是单独的 m3u8 URL：

```json
{
  "delivery": "hls",
  "url": "https://media.example.com/avatars/999000000001/001/original/index.m3u8",
  "timelineId": "geometry:999000000001-001:…",
  "frameCount": 9000,
  "fps": 30,
  "width": 1080,
  "height": 1920,
  "layout": "original",
  "segmentDuration": 2,
  "canonicalVideoSha256": "64-character-lowercase-sha256"
}
```

透明背景使用独立的 `layout: "packed_matte"` 描述符和对应
`canonicalVideoSha256`/`matteLayout`，不能复用原背景描述符。

## 2. 推荐后端接口

第三方自己的 `/api/runtime-token` 应完成用户登录、模板权限和限流，然后在服务端
调用 Kasamila：

```javascript
export async function createAvatarRuntime(req, res) {
  const { avatarId, templateCode, outputMode = 'original' } =
    authorizeAvatarRequest(req.user, req.body);

  const upstream = await fetch(
    'https://www.kasamila.com/api/v1/runtime/sessions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.KASAMILA_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        avatar_id: avatarId,
        template_code: templateCode,
        origin: 'https://ailive.avatarworld.cn',
        input_modes: ['file', 'audio_url', 'pcm_stream', 'tts_stream'],
        output_mode: outputMode,
        max_duration_seconds: 600
      })
    }
  );

  const payload = await upstream.json();
  if (!upstream.ok) {
    return res.status(upstream.status).json({
      error: payload.error?.code || 'kasamila_runtime_failed'
    });
  }
  if (payload.data.build_mode !== 'geometry'
      || payload.data.media_delivery !== 'hls') {
    return res.status(409).json({ error: 'unsupported_template_contract' });
  }

  const templateId = `${avatarId}-${templateCode}`;
  const templateMedia = await mediaDescriptorStore.get(templateId, outputMode);
  res.setHeader('Cache-Control', 'no-store');
  return res.json({
    sessionToken: payload.data.client_token,
    expiresAt: payload.data.expires_at,
    sdkVersion: payload.data.sdk_version,
    buildMode: payload.data.build_mode,
    mediaDelivery: payload.data.media_delivery,
    outputMode: payload.data.output_mode,
    templateMedia
  });
}
```

要求：

- 永久 Key 不进入浏览器、URL、移动安装包、LLM 上下文或日志。
- Token 交换接口不能让浏览器任意指定 HLS 地址。
- `origin` 必须与实际 `location.origin` 完全一致。
- `input_modes` 采用最小权限；不用 MIC 就不要签发 `microphone`。
- Runtime Session 与 HLS 签名有效期应覆盖一次业务会话，并在过期时整体重建。

## 3. 推荐前端接口

```javascript
async function createAvatarPlayer(element) {
  const response = await fetch('/api/runtime-token', {
    method: 'POST',
    credentials: 'include',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      avatarId: '999000000001',
      templateCode: '001',
      outputMode: 'original'
    })
  });
  const bootstrap = await response.json();
  if (!response.ok) throw new Error(bootstrap.error || 'Runtime bootstrap failed');
  if (bootstrap.sdkVersion !== '1.11.6') {
    throw new Error(`Unsupported Runtime SDK ${bootstrap.sdkVersion}`);
  }

  const player = await Kasamila.create({
    element,
    sessionToken: bootstrap.sessionToken,
    templateMedia: bootstrap.templateMedia,
    hlsScriptUrl: '/vendor/hls.min.js'
  });

  console.info('Kasamila initialized', {
    sdkVersion: Kasamila.version,
    output: player.getOutput(),
    mouth: player.getMouthConfiguration()
  });
  return player;
}
```

业务代码不要在初始化时强制 `setProfile('I')` 或覆盖口型参数。SDK 默认使用模板保存
的 C 档位和校准参数；G/H/I 只用于明确的 A/B 测试。

## 4. 牙齿与口腔完整性

SDK 1.11.6 的牙齿由 V7 WebGL renderer 生成，与媒体托管位置无关。第三方不需要
在 HLS 中嵌牙齿，也不需要调用单独“牙齿 API”。正常链路包含：

1. Runtime Manifest 中的 V7 mesh、config、geometry track 和内唇材质；
2. 官方 renderer；
3. 官方 `teeth_cavity_texture.png`；
4. 模板下发的 `mouth_parameters.teeth_scale`；
5. SDK Canvas 的统一渲染顺序。

若声音驱动正常但牙齿消失，按顺序检查：

| 检查项 | 正常结果 | 异常处理 |
| --- | --- | --- |
| `Kasamila.version` | `1.11.6` | 清理旧 JS、Service Worker 和 CDN 缓存 |
| 牙齿纹理请求 | `https://www.kasamila.com/web/common/teeth_cavity_texture.png` 返回 200 | 修复 CSP/CORS/代理规则 |
| `mouth.parameters.teeth_scale` | 大于 0 | 删除第三方旧参数覆盖，使用 Manifest 值 |
| Console | 无 `Geometry v7 oral material is incomplete` | 不得回退旧 renderer；重新生成/发布模板数据 |
| DOM/Canvas | 只有 SDK 的口腔渲染 | 删除第三方旧嘴层、mask、CSS clip 和合成层 |

可在初始化后记录非敏感诊断：

```javascript
const mouth = player.getMouthConfiguration();
if (!(mouth.parameters?.teeth_scale > 0)) {
  throw new Error('Kasamila teeth are disabled by mouth calibration');
}
```

不要记录 Runtime Token、Manifest 签名 URL 或完整 `templateMedia` 签名参数。

## 5. CORS/CSP 必需项

```text
script-src 'self' https://www.kasamila.com;
connect-src 'self' https://www.kasamila.com https://media.example.com;
media-src 'self' https://media.example.com blob:;
worker-src 'self' blob:;
img-src 'self' https://www.kasamila.com data: blob:;
```

- `img-src` 允许官方牙齿/口腔纹理。
- `worker-src blob:` 允许 SDK 建立 Audio2Viseme Worker 和几何分块解码 Worker。
- `connect-src` 允许 Runtime API、签名几何数据和媒体域。
- HLS 主清单、媒体清单、`init.mp4`、全部 `.m4s` 都必须返回页面 Origin 的 CORS。
- 媒体 URL 使用 HTTPS；只有 localhost/127.0.0.1 开发环境可使用 HTTP。

## 6. 音频、IDLE 和时间轴

- SDK 初始化后，模板从第 0 帧开始并循环播放 IDLE 视频。
- SDK 在首块几何数据、纹理和口型运行时就绪前保持视频暂停；HLS 和后续几何分块会
  提前缓冲，几何 gzip/JSON 解码不占用渲染主线程。
- 视频解码帧 PTS 是模板时钟，倍速固定为 `1.0`。第三方不得直接校正内部 video 的
  `currentTime` 或 `playbackRate`，否则会破坏 HLS 与几何帧对齐。
- 开始声音时从当前 IDLE 时间继续，不会每次回到模板第 0 帧。
- `stop()` 停止声音和口型输入，不停止或重置视频时间轴。
- `destroy()` 才会释放视频、HLS、AudioContext、Worker、WebGL 和计量心跳。
- PCM/TTS 推荐 16 kHz 单声道 Int16/Float32；不要用浏览器
  `speechSynthesis` 作为生产口型质量验收。

## 7. 错误处理

第三方界面至少区分：

| 错误/现象 | 处理 |
| --- | --- |
| `origin_not_allowed` | 修正 API Key Origin 白名单 |
| `runtime_origin_mismatch` | Session 的 Origin 与网页 Origin 必须完全一致 |
| `runtime_session_expired` | 后端重新创建 Session，并刷新相同输出模式的 HLS 描述符 |
| `runtime_media_contract_invalid` | 模板数据不完整；不能由前端绕过 |
| `Template media timeline does not match…` | 描述符与模板版本不一致，重新交付 |
| `Geometry templates require HLS…` | 必须传完整 `templateMedia` |
| HLS 403 | 更新 CDN 签名，保证有效期覆盖会话 |
| HLS fatal/network error | 显示可重试状态；不能让视频时间轴继续漂移 |
| 视频周期卡顿或忽快忽慢 | 检查 Blob Worker CSP、几何 Range `206`、HLS 预缓冲以及业务代码是否修改内部视频时钟 |
| `Geometry v7 oral material is incomplete` | 停止初始化并报告模板资产问题，禁止旧链回退 |

不要只捕获错误然后继续展示半初始化 Canvas；这会造成有脸、无牙齿、口型错位或
计量状态不一致。

## 8. AILIVE 上线验收清单

- [ ] 浏览器实际加载的 SDK 为 `1.11.6`。
- [ ] 只消费 Catalog 中 ready 的 geometry 模板。
- [ ] 永久 API Key 只存在 AILIVE 后端。
- [ ] 每次 Session 的 Origin、输入模式、输出模式和时长均按业务签发。
- [ ] 原背景和透明背景分别选择正确的 HLS 描述符。
- [ ] SDK 初始化不直接加载任何内部 renderer/模型/纹理文件。
- [ ] C 为默认驱动；I 只在明确测试页面启用。
- [ ] 上牙、下牙、内唇、遮挡均存在，`teeth_scale > 0`。
- [ ] 文件音频和 AILIVE 实际 TTS/PCM 均可驱动口型。
- [ ] 短模板和 5 分钟以上模板完成首播、跨段、seek、loop、断网恢复测试。
- [ ] Chrome/Edge、Safari、iOS 和 Android 至少各完成一次真机测试。
- [ ] SPA 切换、页面隐藏和退出均正确调用 `stop()`/`destroy()`。
- [ ] 日志中没有 API Key、Runtime Token 或签名媒体/几何 URL。

完整媒体打包参数和透明 Packed Matte 示例见
[`api_v1_geometry_runtime_guide.md`](api_v1_geometry_runtime_guide.md)，可运行工程见
[`examples/geometry-runtime-web`](../examples/geometry-runtime-web/README.md)。
