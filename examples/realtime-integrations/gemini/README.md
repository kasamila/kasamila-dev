[简体中文](README.md) | [English](README.en.md)

# Google Gemini Live API + Kasamila SDK 2.1.0

方式：PCM。[公共初始化与计费生命周期](../README.md)。

填写 `PROVIDER=gemini`、服务端 `GEMINI_API_KEY` 和明确可用的 `GEMINI_LIVE_MODEL`；不会替换模型或猜测权限。输入 16kHz PCM16，输出按 MIME 采样率处理。遍历全部 parts，不能只取第一块；interrupted 清理旧回复。

此版本没有自动 Gemini 会话恢复。平台会话断开/go-away 后销毁 Kasamila Runtime，再通过后端重新建立；不要把永久 Google Key 写入浏览器。

`providers/gemini.mjs` 会忽略图片与文本 part，输出缺省采样率为平台文档规定的24kHz。`@google/genai` 在服务端运行，浏览器只接收本地中继的音频。

## 验收

请验证多轮对话、用户抢话、平台断开、Token 到期和关闭时 Runtime 释放。密钥仅存服务端；样例协议测试不等于真实付费平台验收。

协议来源：[Google Gemini Live API 官方资料](https://ai.google.dev/gemini-api/docs/live-api/capabilities)。核对日期：2026-09-27；实际模型/账号权限需开发者确认。
