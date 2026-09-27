[English](sdk_2_1_protected_runtime.en.md) | 简体中文

# SDK 2.1 加密包接入与发布

版本：SDK 2.1.0。正式包已用独立密钥封装；实际生产部署状态以 /api/v1/system/version、
/api/v1/runtime/releases 为准，不以文档更新时间代替健康检查。
范围按简化要求：加密资源及临时授权，失败停止，无 Logo/备用播放器。

## AILIVE 升级清单

1. 后端创建会话时声明 client.sdk_version=2.1.0、update_policy=pinned，
   required_capabilities 包含 geometry-v7、hls、protected-runtime-v1、license-grant-v1。
2. 原样透传返回的 sdk 和 client_token，网页继续使用 loadKasamila(sdk, apiBase)，
   不复制模型/渲染源码，不手工指定旧 SDK 地址。加载不同版本需新页面/iframe，清除旧入口缓存。
3. 继续传入原有 templateMedia；客户 HLS、透明媒体、几何模型数据均无需重新生成。
4. 授权请求由 SDK 自动发起，AILIVE 不需要、也不应持有 Kasamila 的封包密钥。
   CSP 保留 API connect-src、WASM 编译及原有 worker-src blob: 权限。
5. 加载失败按错误处理并释放会话，不静默回退到旧版/明文模型；
   验收 C/G/H/I、seek/loop、IDLE、透明背景及 Agent 音频回执。

示例后端默认 2.1.0，npm start 即沿用同一公开调用接口。
只升级后端版本声明和前端加载策略，不修改媒体描述符及永久 Key 的存储方式。
API 路径仍 /api/v1，SDK 2.0.0 pinned 会话仍受支持，不因本次更新失效。

## 保护范围

- V7 GLSL 在构建时提取，ONNX 权重按模型分包，AES-256-GCM 加密。
- 小型 WASM 校验封包头/长度，WebCrypto 进行实际解密；不重写密码算法。
- V7 网格调度和驱动映射仍为原有 JS；模型仍由 ONNX Runtime Web 执行。
- 不宣称全部渲染算法已迁移到 WASM，或不可提取/不可破解。
- 仅下载所选模型；C/G/H 共用的模型和 I Worker 均走授权解密。

临时授权通过现有 Runtime Token 请求 POST /api/v1/runtime/license-grants。
授权校验会话/Origin/模板访问/锁定包/密钥指纹，有限流。
P-256 ECDH + HKDF-SHA256 + AES-GCM 将内容密钥封装到客户端临时公钥。
grant 最多 120 秒且不超出会话到期，供初始化取得密钥，不是每 120 秒重新加载模型。
解密成功后仍按原 Runtime lease 生命周期执行，客户端内存无法被服务器强制撤回。
TLS、会话包 SHA256、密文/明文摘要及 AEAD 绑定负责本轮认证完整性；未新增单独签名服务。

初始化或驱动切换解包失败时，停止媒体/引擎、释放会话，不回退到明文模型。
Token 过期/吊销仍遵守现有 Runtime 规则。合法会话的模型内存可以被分析，这是商业门槛而非 DRM。

## 部署密钥

生成独立随机 32 字节密钥，Base64 编码，以受控秘密管理方式配置：

- GitHub Actions Secret：KASAMILA_SDK_PACKAGE_KEY。
- API 服务环境：KASAMILA_SDK_PACKAGE_KEY，值与正式封包构建一致。

不复用身份认证/URL 签名密钥，不写代码/文档/Git，不打印到日志。
CI 构建步骤已支持秘密注入，当前默认构建 2.1.0；API 默认新会话使用 2.1.0。
密钥指纹不匹配/缺失时 API 在创建计费会话之前返回 503。
不要原地轮换一个已发布包的密钥；新密钥需新包版本，并保留仍支持版本的密钥获取能力。
当前最小实现只读取一个根密钥，尚未实现多密钥轮换管理。

维护/重建步骤（已发布版本不可覆盖，变更需新版本）：

1. 用正式密钥执行：

   python scripts/build_sdk_release.py --version 2.1.0 --create-lock

2. 本地浏览器/后端回归，并用同一密钥的部署环境验收包指纹；测试生成的锁不能复用。
3. releases.json 已注册 2.1.0 supported，default/stable 为 2.1.0，协议/几何契约不变。
   后续版本先通过候选验证再提升通道，capabilities 必须匹配正式生成锁。
4. CI 部署仍仅 API/Web，无需 Worker、无需重新训练已有几何模型。
5. 保留 2.0.0 不可变包及其固定接入承诺；若需要退役明文版本，另行明确通知与日期。

新客户端声明 client.sdk_version=2.1.0、update_policy=pinned，
required_capabilities 至少含 protected-runtime-v1 和 license-grant-v1。
其余接口不变，仍通过 Bootstrap 加载会话 sdk，仍由客户托管媒体。
不要求第三方生成/保管加密包密钥，授权解密由 SDK 自动完成。

旧版 2.0.0 及历史 /web/ 资源不能收回，保留这些路径就不能说已消除明文资源获取。
本轮不私自下线旧版；是否退役需单独安排。

## 回归

后端测试覆盖正确公钥封装互通、包绑定、Origin、过期、错误公钥及缺失/错误配置；
包测试覆盖无明文 ONNX/GLSL、解密摘要、错误 key、构建确定性；
Chrome 测试覆盖 WASM、GLSL 编译、真实 C 模型和 I Worker、错误 key、
过期 grant、密文篡改、销毁上下文以及初始化失败不播放/释放 lease。
完整数字人画面对照、生产授权端到端及移动端长时测试仍需在正式候选包完成后验收。
