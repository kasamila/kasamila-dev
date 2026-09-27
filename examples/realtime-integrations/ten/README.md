[简体中文](README.md) | [English](README.en.md)

# TEN Framework + Kasamila SDK 2.1.0

方式：PCM。[公共初始化与计费生命周期](../README.md)。

先按官方 websocket-example 说明启动 TEN 图和语音供应商。此示例设置 `PROVIDER=ten`、`TEN_WS_URL` 后运行公共本地界面。上行是 16kHz 单声道 PCM16；下行按照 metadata 采样率读取，不猜测。

抢话必须从图的 VAD/main_control 发送下列**自定义应用命令**，不是宣称 TEN 自动具备的内置事件；将它路由到 websocket_server，浏览器才能清除旧音频。平台密钥仍放 TEN 服务端。

下行必须包含 `sample_rate`、`channels=1`、`bytes_per_sample=2`，示例会拒绝不明确或多声道数据。下列命令应由图主动发送；不要把文本事件送入口型驱动。

## 挂接代码

```json
{"type":"cmd","name":"kasamila_interrupt"}
```

## 验收

请验证多轮对话、用户抢话、平台断开、Token 到期和关闭时 Runtime 释放。密钥仅存服务端；样例协议测试不等于真实付费平台验收。

协议来源：[TEN Framework 官方资料](https://github.com/TEN-framework/ten-framework/tree/main/ai_agents/agents/examples/websocket-example)。核对日期：2026-09-27；实际模型/账号权限需开发者确认。
