# Runtime 并发配额：API/SDK 更新与第三方升级指南

适用范围：Kasamila API package `0.11.0` 的 Runtime Session、MCP/Agent Session、Portal 测试会话。Web SDK 仍为 `1.11.6`，本次**不改变** HLS `templateMedia`、音频接口、口型参数或浏览器初始化方式；这是服务端席位分配与计费扩展。

## 规则

- Workspace 默认有 **100 个同时有效会话**。并发席位包是可选的一次性购买商品，购买后增加 Workspace 总额；推理分钟另行计费，两种额度互不替代。
- 每个新 API Key 默认预分配 **20 席位**。可以在创建时指定其他非负整数，或在 Portal 的 API Keys 页面修改。所有活动 Key 的分配总和不能超过 Workspace 总额。设为 `0` 可保留 Key，但不能新建 Runtime Session。
- 撤销 Key 立即使其活动 Session 失效，同时释放它的全部分配额度到 Workspace；轮换 Key 不释放分配额。降低分配不取消已有会话，但新会话会在活跃数低于新上限前返回 429。
- Portal 免费预览使用内部 Key：每个 Workspace 最多同时进行 3 个站内预览，其 Session 计入 Workspace 活跃总数，但不从用户可分配给 API Key 的额度里预留席位。
- 退款后服务器自动从最新的活动 Key 起回收超额分配；已有 Session 运行至正常结束或到期。管理员调账只能扣回购买/加赠部分，不能扣掉默认 100 席位。

## 后端/API 变更

创建 Key 的原请求仍可用，省略新字段即为 20：

```http
POST /api/v1/api-keys
Content-Type: application/json
X-CSRF-Token: <当前 Portal CSRF>

{"name":"production","environment":"live","origins":["https://app.example.com"],"runtime_concurrency_limit":20}
```

调整已有 Key（只改变分配，不要求轮换密钥）：

```http
PATCH /api/v1/api-keys/key_<id>
Content-Type: application/json
X-CSRF-Token: <当前 Portal CSRF>

{"runtime_concurrency_limit":35}
```

`GET /api/v1/api-keys` 的 `data.items[]` 增加 `runtime_concurrency_limit`，`data` 增加汇总：

```json
{"runtime_concurrency":{"total":125,"allocated":55,"available":70,"overallocated":0}}
```

`total` 包含基础 100 和已购买/授予席位；`allocated` 仅统计未撤销的用户 Key；`available` 是可再分配额。`overallocated` 正常应为 0，用于暴露历史异常状态。API Key 删除端点实际执行**不可恢复的撤销**，不会删除账本或改变 Workspace 已购买总额。

错误处理：

| 场景 | HTTP | `error.code` |
| --- | ---: | --- |
| Key 创建或扩容超过 Workspace 未分配额 | 409 | `runtime_concurrency_allocation_exceeded` |
| 单 Key 活跃 Session 达到其分配额 | 429 | `runtime_key_concurrency_exceeded` |
| Workspace 活跃 Session 达到总额 | 429 | `runtime_workspace_concurrency_exceeded` |
| 每 Key 每 60 秒创建请求达到 60 次 | 429 | `runtime_rate_limited`，遵守 `Retry-After` |

并发是“当前活跃会话数”，60 次/分钟是“创建请求频率”；创建失败也计入频率。创建 Session 仍受推理分钟余额、Origin、模板 ready 状态等原有门禁约束。第三方后端应复用/结束不再需要的会话，不要用无限重试规避 429。

## 购买与管理员配置

管理员先在 Stripe 建立单次付款 Price，再于 Kasamila `/admin` 的“订阅与计费”填写 `concurrency_price_id`、`concurrency_units`、`concurrency_amount` 并启用。价格和每包席位数必须与 Stripe 一致；未配置时 Portal 只展示“管理员尚未配置”，不开放 Checkout。客户通过既有 `POST /api/v1/billing/checkout-sessions`，传 `{"price_code":"concurrency-pack"}` 购买。仅可信 Stripe Webhook 的已付款事件会幂等增加 `runtime_concurrency` 账本，浏览器跳转成功页不授予额度。

新购额度到账后在 Portal 的 API Keys 页面把未分配席位给指定 Key；购买本身不会自动扩大任何一个 Key。通过 `GET /api/v1/api-keys` 可核对总额及分配。管理员人工调账使用现有受审计的 `/api/v1/admin/entitlements/adjustments`，`resource` 为 `runtime_concurrency`、`delta_units` 为席位数。

## 第三方升级步骤

1. 继续使用 Web SDK `1.11.6`，无需重新下载媒体或重建几何模板；Agent 和 Runtime Session 请求体不变。
2. 在服务端监控上述两个并发 429 和 `Retry-After`；不要把并发不足误判为 Token、媒体或声音驱动故障。
3. 如需要超过单 Key 20 并发，先购买/领取 Workspace 席位，再由 Workspace 管理员将额度分配给相应 Key；不要创建多个 Key 试图绕过 Workspace 总额。
4. 如系统会频繁创建/销毁会话，请调用现有 Session 结束接口或 SDK `destroy()`，并注意 60 次/分钟创建请求的独立限制。
5. 在测试环境验证“创建 20 个 → 第 21 个返回 Key 并发 429 → 结束/到期一个 → 新建成功”，并核验多个 Key 的活跃数总和不超过 Workspace 总额。

兼容性：旧 Key 会在数据库迁移时获得默认 20 席位；若某 Workspace 原有超过 5 个活动 Key，迁移按创建时间依次分配，后续 Key 只能获得剩余席位（可能为 0），以避免上线瞬间超分配。第三方只消费 Runtime Session/Manifest/SDK 的接入代码不需修改；Key 管理后台如读取新增字段，应按上述语义展示。
