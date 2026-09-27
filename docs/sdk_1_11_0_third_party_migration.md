[English](sdk_1_11_0_third_party_migration.en.md) | 简体中文

> SDK 2.1：GLSL/ONNX 加密与 Runtime 临时授权，第三方无需配置解密密钥。参见 [AILIVE 升级与保护说明](sdk_2_1_protected_runtime.md)。固定 2.0.0 仍受支持。

# 第三方一次迁移：SDK 2.1.0

本次不兼容 SDK 1 或旧 /web/sdk 入口。请执行[完整 Runtime 版本契约与迁移清单](sdk_2_runtime_release_contract.md)。

后端声明 client 版本、协议、能力和更新策略，并透传选定 sdk 描述符。
网页加载不可变 bootstrap，再调用 loadKasamila(sdk) 和 Kasamila.create()。
完整包包括 V7、Audio2Viseme、Worklet、ONNX/WASM、HLS 和牙齿纹理。
以后 pinned 客户不会因为服务器发布新版本就被强制升级。
已有合格几何模型无需重训，Worker 不随本次更新。

切换前验证音频、牙齿、口型、透明、HLS、到期、结算和 Agent 回执。
SDK 2.1.0 已上线；完成应用验收后切换第三方生产接入。

示例：[浏览器 Demo](../examples/geometry-runtime-web/README.md)。
