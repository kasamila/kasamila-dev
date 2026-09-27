[简体中文](README.md) | [English](README.en.md)

# Google Gemini Live API + Kasamila SDK 2.1.0

方式：PCM。[公共初始化与计费生命周期](../README.md)。

填写 `PROVIDER=gemini`、服务端 `GEMINI_API_KEY` 和明确可用的 `GEMINI_LIVE_MODEL`；不会替换模型或猜测权限。输入 16kHz PCM16，输出按 MIME 采样率处理。遍历全部 parts，不能只取第一块；interrupted 清理旧回复。

此版本没有自动 Gemini 会话恢复。平台会话断开/go-away 后销毁 Kasamila Runtime，再通过后端重新建立；不要把永久 Google Key 写入浏览器。

## 代码与详细步骤

Set `PROVIDER=gemini`, server-only `GEMINI_API_KEY` and **explicit** `GEMINI_LIVE_MODEL` from your account's model catalogue. Run the [local starter](../README.en.md). The relay uses `@google/genai`; input is 16 kHz mono PCM16, output typically 24 kHz with the actual rate parsed from MIME metadata.

The adapter iterates every `serverContent.modelTurn.parts` entry; it does not read only the first part or confuse text/images with audio. `serverContent.interrupted` invalidates the previous reply. See [gemini.mjs](../providers/gemini.mjs).

If your Live session ends or emits go-away, end the Kasamila player and reacquire both sessions through your backend. Automatic Gemini session resumption is not implemented by this starter. Never use a permanent Google Key in a public browser.

协议来源：[Google Gemini Live API 官方资料](https://ai.google.dev/gemini-api/docs/live-api/capabilities)。核对日期：2026-09-27；实际模型/账号权限需开发者确认。协议测试不等于付费云端验收。
