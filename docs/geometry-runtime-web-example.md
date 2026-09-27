[English](geometry-runtime-web-example.en.md) | [简体中文](geometry-runtime-web-example.md)

# Kasamila Web SDK 1.11.6 几何模型第三方接入样例

站内源文件：[服务端 server.mjs](https://github.com/kasamila/kasamila-dev/blob/main/examples/geometry-runtime-web/server.mjs) · [浏览器 app.js](https://github.com/kasamila/kasamila-dev/blob/main/examples/geometry-runtime-web/public/app.js) · [页面 index.html](https://github.com/kasamila/kasamila-dev/blob/main/examples/geometry-runtime-web/public/index.html) · [原背景描述符](https://github.com/kasamila/kasamila-dev/blob/main/examples/geometry-runtime-web/config/kasamila-media.original.example.json) · [透明背景描述符](https://github.com/kasamila/kasamila-dev/blob/main/examples/geometry-runtime-web/config/kasamila-media.transparent.example.json)。

完整可运行代码在 [公开仓库](https://github.com/kasamila/kasamila-dev/tree/main/examples/geometry-runtime-web)。下载仓库后先在该目录执行 `npm install`，安装锁定版本的 HLS 依赖。

这是最小可运行样例：永久 API Key 只在 Node.js 服务端换取短期 `ks_rt_` Token，浏览器加载 SDK、调用本地音频并播放调用方自托管的 HLS 模板媒体。

已有系统升级前请先阅读
[`docs/sdk_1_11_0_third_party_migration.md`](./sdk_1_11_0_third_party_migration.md)。
不要从本样例中只复制 WebGL renderer：浏览器必须通过官方
`kasamila.js?v=1.11.6` 和 `Kasamila.create()` 初始化完整 V7 口腔、内唇和牙齿链。

## 1. 准备媒体描述符

从 Portal/交付清单取得 `media_contract` 和对应的规范媒体。原背景复制
`config/kasamila-media.original.example.json`；透明输出复制
`config/kasamila-media.transparent.example.json`，用真实打包结果替换全部占位值。

不要直接编辑描述符猜测帧数或摘要。推荐使用仓库脚本生成：

```bash
python scripts/package_template_hls.py canonical.mp4 ./hls \
  --public-url https://media.example.com/avatars/999000000001/001/original \
  --timeline-id <media_contract.timeline_id> \
  --frame-count <media_contract.frame_count> --fps <media_contract.fps> \
  --width <media_contract.width> --height <media_contract.height> \
  --layout original \
  --source-sha256 <media_contract.canonical_video_sha256>
```

透明输出把输入换为规范 Packed Matte，使用 `--layout packed_matte`、
`--source-sha256 <media_contract.packed_matte_sha256>`，并传入：

```bash
--matte-layout-json '{"color_region":[0,0,0.6666666666666666,1],"matte_region":[0.6666666666666666,0,0.3333333333333333,0.5]}'
```

上传生成目录中的 `index.m3u8`、`init.mp4`、全部 `.m4s` 和
`kasamila-media.json`，不要再次转码。

## 2. 启动

PowerShell：

```powershell
$env:KASAMILA_API_KEY='ks_test_REDACTED'
$env:KASAMILA_AVATAR_ID='999000000001'
$env:KASAMILA_TEMPLATE_CODE='001'
$env:KASAMILA_OUTPUT_MODE='original'
$env:KASAMILA_MEDIA_DESCRIPTOR='D:\path\to\hls\kasamila-media.json'
$env:APP_ORIGIN='http://127.0.0.1:8788'
node examples/geometry-runtime-web/server.mjs
```

打开 `http://127.0.0.1:8788`。API Key 的 Origin 白名单必须包含完全相同的
Origin。生产环境必须给 `/api/runtime-token` 增加自己的登录校验、模板授权和限流；
样例为了突出 Kasamila 调用链没有实现业务登录。

## 3. 生产要求

- 页面、HLS 与音频 URL 使用 HTTPS；本机开发仅允许 localhost/127.0.0.1 HTTP。
- HLS 域允许页面 Origin 跨域读取 `.m3u8`、`init.mp4` 和 `.m4s`。
- 正确设置 MIME：m3u8 为 `application/vnd.apple.mpegurl`，fMP4 为 `video/mp4`。
- CSP 至少允许 `script-src https://www.kasamila.com`、`connect-src` 访问 Kasamila 与媒体域、`media-src` 访问媒体域，以及 `worker-src blob:`。
- `img-src` 必须允许 `https://www.kasamila.com`，否则官方牙齿/口腔纹理会被拦截。
- 初始化后确认 `Kasamila.version === '1.11.6'` 且 `player.getMouthConfiguration().parameters.teeth_scale > 0`。
- 不记录 API Key、Runtime Token 或签名资产 URL。
- 页面卸载时调用 `destroy()`；切换声音源前调用 `stop()`。

完整字段、错误码、透明媒体和上线检查见
[`docs/api_v1_geometry_runtime_guide.md`](./api_v1_geometry_runtime_guide.md)。
