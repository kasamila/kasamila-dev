# Shopify实时店员

[English](README.en.md)

店主授权 Shopify 后，Qwen 3.8 实时模型通过原生工具查询商品、国家价格和店铺政策。Kasamila 数字人语音讲解的商品进入页面主展示区；买家选择规格后创建 Shopify Cart，跳转官方结账。文字、麦克风、打断、15 种界面语言和手机布局均在 Portal 演示中提供。

## 配置现有演示

1. 打开 `https://kasamila.com/api/v1/admin/portal/shopify/manage`。Shopify Client ID / Secret 仅在此填写，服务器加密保存；不要放入网页、挂件或 Git。
2. 在 Shopify Dev Dashboard 创建可安装到目标店铺的独立应用，设置 application URL 为 `https://www.kasamila.com/portal/apps/shopify`，回调为 `https://www.kasamila.com/portal/apps/shopify/oauth/callback`。注册本目录 TOML 中的 scopes 和 compliance webhooks。启用应用的 Storefront API / sales-channel 访问，并把需要展示的商品发布到该应用的销售渠道。
3. 添加 `kasamila.myshopify.com` 或其他 canonical `xxx.myshopify.com` 域名。选择已发布数字人、已配置的 Qwen 3.8 通道、音色、人设、内容护栏、默认国家。保存，勾选授权同意后点击“授权店铺管理者”。
4. 授权成功后点击“同步商品与政策 / 注册更新通知”，再选择全店公开商品，或者勾选集合、Shopify taxonomy 类别、商品。配置与国家事实有关的补充说明；不应填写虚构优惠或发货承诺。勾选发布并保存。
5. 将实际嵌入网站的 HTTPS origin（包括店铺自定义域名）加入 Admin 允许列表，再复制挂件代码。嵌入需要 HTTPS、父页面麦克风权限及 `allow="microphone; autoplay"`，浏览器仍要求用户点击开始并允许麦克风。

Shopify 授权的是商店公开商品、市场和库存读取权限，不读取客户、订单或付款信息。需要店主安装授权；只有一个店铺链接不足以读取私有商店数据。未发布到应用渠道的商品不会推荐。应用的安装方式受 Shopify 的 distribution 配置和商店资格约束；本示例没有发布到 Shopify App Store。

如果店铺改过 `myshopify.com` 名称，Shopify 的 OAuth 回调可能使用最初的域名。Portal 在校验签名、浏览器绑定和一次性 state 后，会通过已授权商店的域名列表核实原配置地址属于同一商店，再保存 canonical 域名；原地址仍可用于再次发起授权。

## 可运行挂件

在任意允许嵌入的网站中加载 `widget.mjs`：

```html
<div id="assistant"></div>
<script type="module">
import {mountAssistant} from './widget.mjs';
const widget = mountAssistant(document.querySelector('#assistant'), {
  store: 'kasamila', language: 'zh', height: 850
});
// 页面卸载 / 流程结束时：widget.destroy();
</script>
```

`extensions/shop-assistant` 同时提供页面区块 `assistant.liquid` 和全店悬浮的应用嵌入 `assistant-embed.liquid`。使用全店头像时，先将 `shopify.app.toml` 关联到店主已安装的同一个开发应用，并通过 Shopify CLI 发布包含此主题扩展的应用版本。仅部署 Portal 或推送本示例到 GitHub 不会发布 Shopify 扩展。

发布后，店主打开 **在线商店 → 主题 → 编辑主题（或自定义）→ 应用嵌入 → 实时店员**，开启开关，填写 Kasamila Admin 中**本店对应的商店 ID**，点击保存。Admin 也需发布该商店，并把实际店铺 HTTPS 域名（包括自定义域名）加入允许嵌入列表。头像固定在店铺页面右下角；不需要逐个商品页添加区块。避免同时启用页面区块和应用嵌入，结账步骤不支持此主题扩展。更换主题后需要在新主题重新启用。

安装授权不会自动启用主题中的应用嵌入。可在安装完成后提供以下主题编辑器链接，引导店主预览并保存（`CLIENT_ID` 是公开应用 ID，不是 Secret）：

```text
https://SHOP.myshopify.com/admin/themes/current/editor?context=apps&template=index&activateAppId=CLIENT_ID/assistant-embed
```

扩展默认不填写商店 ID，避免其他店铺意外展示示例店商品。主题编辑器支持中英文，消费者界面自动使用已支持的店铺语言，其他语言回退到英语。本示例不代表已部署到任何商店或已通过 App Store 审核。[Shopify 应用嵌入说明](https://shopify.dev/docs/apps/build/online-store/theme-app-extensions/configuration)。

Webhook 地址不填入 OAuth 重定向列表；重定向列表只保留 Admin 显示的 `/oauth/callback`。普通商品、集合、市场等通知由 Admin 的“同步商品与政策 / 注册更新通知”自动注册；三项隐私通知按 `shopify.app.toml` 配置。

## 服务端查询和语音工具样例

```sh
python -m pip install -r requirements.txt
python -m host.catalog --shop your-store.myshopify.com --country US --language en
```

CLI 从服务器环境变量 `SHOPIFY_ACCESS_TOKEN` 读取已有店主授权得到的 offline token，仅用于开发者自己的应用测试。它读取全量公开目录和政策，不把令牌写到输出。生产 Portal 的凭据依然全部通过 Admin 配置。到期时需要自己的 OAuth token store 提供 Client ID、Secret 和 refresh token；Portal 参考实现已包含 expiring offline token 自动刷新、加密存储和轮换锁。

`host/client.py` 是与生产共享的 GraphQL / 分页 / 签名验证适配器；`host/voice.py` 是 Qwen 原生工具的 continuation 与取消实现。`reference/portal` 包含完整 Portal 集成参考源码及前端；它依赖 Kasamila Portal 的身份、加密设置、数据库和公开 Runtime API，不能脱离该宿主直接启动。独立产品可以实现相同的存储 / 授权接口，复用 `host` 组件并接入 Kasamila 公开 Runtime 服务；无须修改 Kasamila API 或 SDK。

商品目录按国家与语言分区，更新 webhook 会失效缓存，未收到通知时也按管理员配置的间隔刷新。对话结果最多短缓存 20 秒；规格展示和创建购物车前再次请求当前产品与国家可用性。Shopify 结账核定实际运费、税费、优惠和最终库存；不能仅凭 Markets 条件推断 B2B、渠道条件或继承策略。退换货来自已公布的店铺政策，缺失信息应回答无法确认。订阅、复杂组合和超过演示数量范围的购买应在商店处理。

会话由访客明确开始，最多 10 分钟，结束后释放 Runtime 和 Qwen 连接；不保存对话记录。商品内容和用户输入均作为不可信资料处理，模型通过提示约束使用查询结果；仍需店主评估人设、内容护栏和回答质量。购物车创建不会自动支付或提交订单。

## 官方参考

- [Shopify standalone OAuth](https://shopify.dev/docs/apps/build/authentication-authorization/authenticate-standalone-apps)
- [Offline access tokens](https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens)
- [Storefront Cart](https://shopify.dev/docs/api/storefront/latest/mutations/cartCreate)
- [Mandatory privacy webhooks](https://shopify.dev/docs/apps/build/compliance/privacy-law-compliance)
- [Qwen 3.8 realtime](https://help.aliyun.com/en/model-studio/qwen3-8-omni-flash-realtime)

## 对话舞台与低延迟查询

挂件默认仅显示角落头像，点击后展开并建立连接。商品随对话显示在数字人前方，全部商品在抽屉中查看。顾客连续 120 秒没有打字、语音或点击操作时自动收起，并关闭麦克风、音频、Qwen 和 Runtime；再次点击会开启新会话。数字人自己的回复和静音音频不会延长计时。传入 `floating:false` 可保留行内 iframe 模式。

目录在后台刷新；对话每次最多批量读取 3 个候选商品，已核验结果短缓存 20 秒，按商店、国家、语言及 webhook 版本隔离。模型接收精简事实，减少重复工具调用。商品详情和购物车仍实时核验，不使用短缓存。Admin 复制的挂件与主题 block 都支持点击展开和自动收起。

后台目录刷新不再阻塞可用快照的读取，单次对话工具查询最多等待 8 秒；超时返回无法核实，不编造商品事实。工具执行与语音事件接收分开，查商品时仍可打断。可恢复的单轮错误保留会话，新的输入重置工具调用计数。模型提到已批准目录中的明确商品名时，UI 也会跟随已有商品记录切换，并保留核验时间。字幕使用独立布局区域，不覆盖数字人。原有十分钟体验上限会明确提示。

### Brief network interruptions

The Portal reference sends a ten-second ping/pong heartbeat that does not reset the shopper inactivity deadline. Browser disconnects retry for fifteen seconds; the backend retains the existing Qwen conversation and Runtime for a twenty-second reconnect window. Resume requires the same signed ticket, origin and IP and a still-live server session. It preserves product focus and chat history without creating a new billable session or replaying stale audio. Explicit close, two-minute inactivity and the original ten-minute demo limit still release resources.

### Continuous microphone backpressure

Microphone capture uses the same continuous 16 kHz mono PCM and Qwen transport defaults as the realtime chat demo, including echo cancellation and noise suppression. Do not reduce TCP send buffers or apply an amplitude gate that clips quiet speech. Browser writes are bounded at 64 KiB. The Shopify host applies the conservative WebRTC speech detector before the Qwen uplink, preserving 400 ms of onset pre-roll and 1.2 seconds of trailing audio. Sustained non-speech is replaced by silent PCM, preserving the continuous audio clock needed for prompt Qwen end-of-turn detection; speech remains full-quality 16 kHz PCM. Do not omit silence packets after applying VAD. Install the pinned webrtcvad-wheels dependency from requirements.txt. A separate three-second audio pump keeps browser heartbeats responsive during transient upstream stalls. A localized warning reports discarded stale audio; delayed pongs alone do not disconnect the session.

The public embed URL hosts the assistant inside a same-origin child frame so the published player's parent-window accesses work inside Shopify. Both frames retain the merchant-specific CSP allowlist. Only validated expand/collapse messages pass through to the merchant page; no credentials are forwarded. Microphone and autoplay permissions are delegated through both frames.


## 移动端连接

首次加载会分别显示数字人准备与语音连接状态。语音票据在数字人准备完毕后获取，整个启动过程有三分钟超时保护；取消后会清理迟到的初始化结果。如果浏览器暂停音频，请点击“点击启用声音”。Shopify 的两分钟无操作计时从连接成功后开始，加载时间不计入。此调整仅在应用层完成，不改变 Kasamila API、SDK 或口型模型。

Portal 还会等待人物视频实际输出帧后才连接语音；只加载元数据不视为成功。视频加载或中途缓冲时展示封面，恢复后继续；播放被浏览器阻止时提供播放按钮，持续无帧或解码失败则结束并提示重试。视频监测不会改写 SDK 的口型、帧回调或几何时间轴。
