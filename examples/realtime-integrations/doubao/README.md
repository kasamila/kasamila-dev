[简体中文](README.md) | [English](README.en.md)

# Doubao realtime voice + Kasamila SDK 2.1.0

方式：PCM hook。[公共初始化与计费生命周期](../README.md)。

使用火山引擎官方文档里的端到端实时语音 Demo，沿用认证、Session 和二进制协议，示例不猜测解包细节。将官方 Demo 的 TTS 输出显式改为单声道 pcm_s16le/24000Hz，不能把默认 float32 或压缩字节当作 PCM16。

本地示例选择 bridge，配置随机私密 BRIDGE_SECRET；浏览器连接后，把显示的 channel、相同密钥和本地 BRIDGE_URL 配给官方 Demo。按下列回调接入解包后的音频、ASR 抢话及麦克风输入。输入 reader 用独立线程，关闭官方 Demo 自己的扬声器避免声音重复。

边界：此处提供可运行的本地回调桥，不包含/冒充完整火山二进制握手实现，也未完成带凭据的端到端测试。

## 代码与详细步骤

Download and run the **official** end-to-end realtime voice demo linked by Volcengine's documentation. Keep its authentication, connection/session lifecycle and binary framing; this suite does not invent or duplicate those internals.

1. Configure that demo's TTS output to mono **pcm_s16le / 24000 Hz**. Default pcm/float32 output is NOT interchangeable.
2. Set this starter's `PROVIDER=bridge` and a private random `BRIDGE_SECRET` of at least 24 characters. Run it locally, click Start and copy its channel into the official demo process's `BRIDGE_CHANNEL`.
3. Supply the same `BRIDGE_SECRET` and `BRIDGE_URL=http://127.0.0.1:8790/api/bridge` to that process.
4. Add [doubao-hook.py](../providers/doubao-hook.py) to your demo's module path:
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

Disable the official demo's local speaker output to avoid duplicate voices. The HTTP hook routes a specific browser channel; it cannot broadcast one user's audio to all sessions. Run the official input-reader in a dedicated thread; do not block its output callback loop. For production, replace loopback with your authenticated per-user relay.

**Boundary:** official credentials and binary session negotiation are delegated to the vendor demo, not included here. The mapping helper is covered by local bridge tests; paid provider E2E is pending.

协议来源：[Doubao realtime voice 官方资料](https://www.volcengine.com/docs/6561/1594356)。核对日期：2026-09-27；实际模型/账号权限需开发者确认。协议测试不等于付费云端验收。
