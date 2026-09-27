[简体中文](README.md) | [English](README.en.md)

# Doubao realtime voice + Kasamila SDK 2.1.0

方式：PCM hook。[公共初始化与计费生命周期](../README.md)。

使用火山引擎官方文档里的端到端实时语音 Demo，沿用认证、Session 和二进制协议，示例不猜测解包细节。将官方 Demo 的 TTS 输出显式改为单声道 pcm_s16le/24000Hz，不能把默认 float32 或压缩字节当作 PCM16。

本地示例选择 bridge，配置随机私密 BRIDGE_SECRET；浏览器连接后，把显示的 channel、相同密钥和本地 BRIDGE_URL 配给官方 Demo。按下列回调接入解包后的音频、ASR 抢话及麦克风输入。输入 reader 用独立线程，关闭官方 Demo 自己的扬声器避免声音重复。

边界：此处提供可运行的本地回调桥，不包含/冒充完整火山二进制握手实现，也未完成带凭据的端到端测试。

具体操作：1）启动本地 bridge 模式；2）取得浏览器显示的 channel；3）将 BRIDGE_CHANNEL、BRIDGE_SECRET、BRIDGE_URL 配给官方 Demo 进程；4）在官方解包后的输出音频和 ASR 抢话回调中挂接以下函数；5）独立线程读取浏览器麦克风并送入官方原有输入函数。桥只发送给对应 channel，不广播到其他用户。

## 挂接代码

```python
# Rename doubao-hook.py to kasamila_bridge.py in your local demo integration.
from kasamila_bridge import KasamilaBridge
bridge = KasamilaBridge()
# In the official decoder's TTS callback:
bridge.audio(decoded_pcm16_bytes, sample_rate=24000)
# In its ASR/barge-in callback:
bridge.interrupt()
# In a dedicated input thread, feed browser microphone into official transport:
bridge.microphone(lambda pcm, rate: official_send_audio(pcm))
# official_send_audio is YOUR demo's existing audio-input function, not a new API.
```

## 验收

如果官方解包明确输出单声道小端 float32，可使用显式转换，不能直接标记为 PCM16：

```python
bridge.audio_float32(decoded_float32_bytes, sample_rate=24000)
```

必须根据解包元数据选择格式，不能按字节长度猜测；转换器会拒绝 NaN 和不完整数据。

请验证多轮对话、用户抢话、平台断开、Token 到期和关闭时 Runtime 释放。密钥仅存服务端；样例协议测试不等于真实付费平台验收。

协议来源：[Doubao realtime voice 官方资料](https://www.volcengine.com/docs/6561/1594356)。核对日期：2026-09-27；实际模型/账号权限需开发者确认。
