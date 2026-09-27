[English](sdk_2_runtime_release_contract.en.md) | 简体中文

> SDK 2.1：GLSL/ONNX 加密与 Runtime 临时授权，第三方无需配置解密密钥。参见 [AILIVE 升级与保护说明](sdk_2_1_protected_runtime.md)。固定 2.0.0 仍受支持。

# SDK 2.1.0：一次迁移、独立升级的 Runtime 接入规范

发布版本：SDK 2.1.0，实际生产版本请通过 /api/v1/runtime/releases 核对。
相对 SDK 1 是一次破坏性迁移，不提供 SDK 1、旧入口或微调模式兼容层；
相对 SDK 2.0 保持调用接口兼容，并继续支持固定 2.0.0 会话。
API 路径仍为 /api/v1，Runtime 协议为 kasamila-runtime-v1。
几何契约为 kasamila-geometry-track-v2；V7 口腔链、默认 C 和显式候选 I 不变。
不需要重新训练已有合格几何模型；Worker 不随本次升级。

## 1. 服务端声明需要的版本和能力

永久 Key 仅保存在客户后端，禁止放入网页、日志或模型上下文。
后端用 Key 调用 POST /api/v1/runtime/sessions：

```json
{
  "avatar_id": "999000000001",
  "template_code": "001",
  "origin": "https://app.example.com",
  "input_modes": ["file", "audio_url", "pcm_stream", "tts_stream", "rtc"],
  "output_mode": "original",
  "max_duration_seconds": 600,
  "client": {
    "sdk_version": "2.1.0",
    "protocol": "kasamila-runtime-v1",
    "geometry_contract": "kasamila-geometry-track-v2",
    "update_policy": "pinned",
    "required_capabilities": ["geometry-v7", "hls"]
  }
}
```

示例数字人 ID 为占位符。Origin 必须是 Key 已授权的真实应用 Origin。
返回 data 中新增 sdk 描述符，包含 version、protocol、geometry_contract、
capabilities、update_policy、loader_url、esm_url、package_url、
package_sha256 和 entry_sha256。后端向网页返回 client_token 和原样 sdk，
不要自行根据“最新版本”拼装路径或替换描述符。
已有 sdk_version 字段仅作为会话选定版本的摘要。

三种策略：

- pinned（默认）：只选择请求的精确版本。生产客户推荐使用。
- stable：显式选择当前稳定版，但限定请求版本的主版本及协议/能力；只影响新会话。
- preview：测试专用，必须显式选择；尚未配置预览发行版时返回 409。

GET /api/v1/runtime/releases 返回可用发行版和稳定通道；它不是强制升级指令。
不支持的版本、协议或能力返回 409 runtime_contract_unsupported，不创建会话、不占计费租约。
省略 client 时只使用 SDK 2.1.0 的默认固定契约；第三方仍应明确声明。

## 2. 网页使用会话返回的完整包

```html
<div id="avatar" style="width:540px;height:960px"></div>
<script type="module">
  import { loadKasamila } from "https://www.kasamila.com/sdk/bootstrap/1/loader.mjs";
  // 自己的后端必须先登录校验、模板授权及限流。
  const { sessionToken, sdk, templateMedia } = await fetch("/api/runtime-token", {
    method: "POST", credentials: "same-origin"
  }).then(r => r.json());
  const Kasamila = await loadKasamila(sdk, "https://www.kasamila.com");
  const player = await Kasamila.create({
    element: document.querySelector("#avatar"), sessionToken, templateMedia
  });
  // 在用户点击事件中：await player.setAudioFile(file);
  // 使用结束：await player.destroy();
</script>
```

bootstrap 校验受信 API Origin、精确版本路径和入口 SRI。
SDK 校验会话版本、协议及 release.json 摘要，然后加载包内依赖。
整个包位于 /sdk/releases/2.1.0/，包含 renderer、hls.js、Audio2Viseme、
ONNX/WASM、Worklet 和牙齿纹理，发布后不得覆盖。缓存一年且 immutable。
不要混用 /web/js、/web/weights、/web/common 或单独复制入口 JS。
HLS 解码器已在包内，无需外部 hlsScriptUrl。

同一网页只能加载一个 SDK 版本。切换版本须刷新文档或使用独立 iframe；
运行中的会话不热替换 SDK。不能把已加载版本与服务端“最新版本”比较后强制报错。
文件音频、MIC、PCM、RTC、口型校准及 Agent 回执接口保持现有语义。
媒体仍由客户托管；templateMedia 的 timelineId、摘要、fps、尺寸和时间轴必须匹配几何契约。
模板重新生成后，新会话需要该代匹配的媒体描述符；已有会话仍使用创建时的产物代。

## 3. 会话快照与生命周期

创建时固化 SDK 描述符、模板产物 UUID/代号、尺寸、fps 和口型默认值。
Manifest 返回 protocol 和 artifact_generation 及该快照，不随稳定通道推进、模板重新生成或校准更新切换资源。
旧发行包必须保留；旧模板产物在依赖会话结束/到期前不得删除。
归档、删除、Key 吊销及权限撤回不是兼容性承诺，仍可停止资源访问。
SDK 1 的已有会话返回 runtime_session_migration_required；客户须建立新会话。

普通 API/SDK 会话从创建即按服务端时间计费，包括静音、IDLE 和网页隐藏；
stop() 只停声音。destroy() 或已授权的会话结束请求才结算并返还未用租约。
本地示例先验证媒体描述符再创建会话，避免配置错误消耗时长。
Agent 创建会话的工具参数也接受相同 client；Agent 投递与回执仍受 Token/Origin 约束。
客户端未结束时，租约仍会消耗至到期，不依赖前端心跳上报较短时长。

## 4. AILIVE 等第三方一次迁移清单

1. 后端增加 client，初次固定 2.1.0，并将返回的 sdk 透传网页。
2. 删除 /web/sdk/kasamila.js?v=...、外部 renderer、旧覆盖层及 Service Worker 的旧 SDK 路径缓存。
3. 按上方 bootstrap 创建播放器；不要预加载另一个版本的依赖。
4. CSP 放行受信 Kasamila 的 script-src/connect-src、wasm-unsafe-eval（浏览器需要时）及 worker-src blob:；
   媒体 Origin 同时按业务需求放行 media-src/connect-src。不要为了运行 SDK 全面关闭 CSP。
5. 保留自托管 HLS 的 CORS/Range、媒体签名续签，以及 timeline/digest 校验。
6. 验证本地声音、PCM/RTC、牙齿、C/G/H/I、透明媒体、seek/loop、到期、销毁结算及 Agent 回执。
7. 先内部灰度，确认新服务端已支持 2.1.0，再替换生产接入；失败时停止灰度，不能回退到不再支持的 SDK 1。

此后新增功能采用能力协商与显式通道；有破坏性变化发布新协议/主版本，
不覆盖原 SDK 文件。旧主版本支持期限与安全撤销须另行公告，不承诺无限期保留。

## 5. 浏览器安全边界

不可变包和 SRI 防止意外资源混用及未授权供应链篡改，不是防破解或 DRM。
浏览器 SDK、通用声音模型和已获授权的几何/材质可被提取；
Origin/CORS 不能防止非浏览器伪造请求。永久 Key 保密、短 Token、
服务端配额/计费、授权检查能保护在线 API，不能保证已下载模型不可离线复用。
若业务要求“停止付费即绝对不可运行”，必须另行选择服务端渲染/推理等交付模式，
不能只依赖混淆、WASM 或前端加密。
