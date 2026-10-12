# Shopify Live Shop Assistant

Renamed shops can return their original `myshopify.com` domain in the OAuth callback. After signature, browser binding and one-time state validation, Portal checks the authorized shop's domain list before saving that canonical domain. The verified previous name remains usable for starting authorization.

[中文](README.md)

The merchant authorizes a Shopify store. Qwen 3.8 realtime calls product and policy tools, then speaks through a Kasamila avatar. The referenced product becomes the main product panel. Shoppers choose a variant and explicitly open a Shopify cart checkout. The Portal demo supports voice, text, interruption, 15 UI languages and mobile layouts.

Configure Client ID / Secret exclusively in [Portal Admin](https://kasamila.com/api/v1/admin/portal/shopify/manage). Create an installable standalone Shopify app with the callback and scopes shown there. Enable Storefront access and publish selected products to the app's channel. Use a canonical `xxx.myshopify.com` domain, a published avatar and its configured Qwen 3.8 realtime channel. Save, authorize as the merchant, synchronize to register update webhooks, select the catalogue range, and publish.

Add each HTTPS embedding origin, including the shop's custom domain, to the Admin allowlist. Use `widget.mjs` or the module embed copied from Admin. The parent page must allow microphone delegation; HTTPS, a user gesture and browser permission are required. The theme app block and app TOML are a scaffold for your own registered Shopify app, not an App Store submission or approval.

For a store-wide bottom-right avatar, publish `extensions/shop-assistant/blocks/assistant-embed.liquid` as part of the **same Shopify application the merchant installed**, using Shopify CLI and the linked `shopify.app.toml`. Pushing this repository or deploying Portal does not publish a Shopify extension. The existing `assistant.liquid` remains a page-block alternative.

After publishing the extension, the merchant opens **Online Store → Themes → Edit theme (or Customize) → App embeds → Live shop assistant**, enables it, enters this shop's Kasamila Admin store ID, and saves. Publish the shop in Kasamila Admin and allow its actual HTTPS storefront origin. Use either the embed or the page block to avoid duplicate launchers. The embed covers storefront theme pages, not checkout steps. A newly published theme needs its own activation.

App installation and OAuth do not activate theme embeds automatically. An installation flow can open `https://SHOP.myshopify.com/admin/themes/current/editor?context=apps&template=index&activateAppId=CLIENT_ID/assistant-embed` for the merchant to preview and save. `CLIENT_ID` is the public app ID, never the Secret. The embed deliberately has no default store ID, preventing other shops from showing the demo merchant's catalogue. Theme-editor labels support English/Chinese; the shopper UI follows supported shop languages and falls back to English. See [Shopify theme extension configuration](https://shopify.dev/docs/apps/build/online-store/theme-app-extensions/configuration).

The webhook URL does not belong in OAuth Redirect URLs. Keep the Admin-provided `/oauth/callback` there. Admin synchronization registers ordinary product/collection/market update notifications automatically; configure the three mandatory privacy topics through `shopify.app.toml`.

```js
import {mountAssistant} from './widget.mjs';
const widget = mountAssistant(document.querySelector('#assistant'), {
  store: 'kasamila', language: 'en', height: 850
});
// On teardown: widget.destroy();
```

For a server-side adapter test, install `requirements.txt`, set an already authorized `SHOPIFY_ACCESS_TOKEN` in your own server environment, and run `python -m host.catalog --shop your-store.myshopify.com --country US --language en`. The CLI never outputs credentials. Production Portal credentials remain managed through Admin.

`host/client.py` handles GraphQL queries, full pagination, token refresh hooks, Markets and signature verification. `host/voice.py` handles Qwen native tool outputs and cancellation. `reference/portal` contains the full Portal integration and UI, which depend on the Portal's encrypted settings, database, authentication and public Runtime API. It is reference code, not a standalone runnable server. Supply these adapters for an independent application; no Kasamila API or SDK changes are required.

Product/collection/inventory/market webhooks invalidate country/language caches. The configured refresh interval is a fallback. Conversation facts may be reused for up to 20 seconds; focused details and cart creation always re-read current facts. Public shop policies and country market settings ground answers; unknown charges and inherited or conditional market rules are confirmed by Shopify checkout. Customer, order and payment data are not requested. Chats are not stored. Sessions require explicit consent, expire after 10 minutes and close Qwen and Runtime resources. Creating a cart does not pay or place an order. Complex subscriptions/bundles and quantities outside demo limits remain handled by the store.

See [Shopify authentication](https://shopify.dev/docs/apps/build/authentication-authorization/authenticate-standalone-apps), [Storefront Cart](https://shopify.dev/docs/api/storefront/latest/mutations/cartCreate), [privacy webhooks](https://shopify.dev/docs/apps/build/compliance/privacy-law-compliance) and [Qwen realtime](https://help.aliyun.com/en/model-studio/qwen3-8-omni-flash-realtime).

## Conversation stage and response latency

The widget starts as a corner avatar and connects only after activation. One product is spotlighted alongside the avatar; the full catalogue lives in a drawer. After 120 seconds without shopper typing, speech or interaction, the widget minimizes and closes microphone, playback, Qwen and Runtime resources. Model output and silent audio do not extend the deadline. Reopening starts a new conversation. Set `floating:false` for an inline iframe.

Background catalogue refresh, a single batch query for up to three candidates, and a 20-second verified-fact cache remove repeated product reads. Cache entries are isolated by merchant, country, language and webhook/credential version, with current selection checks. Compact model results reduce unnecessary tool round trips. Detail and cart requests always revalidate live facts.

Eligible catalogue snapshots are read before waiting for the refresh lock. Voice tools have an eight-second deadline and return unknown facts on timeout. The provider reader remains active during tool execution, so speech can interrupt slow lookups. Recoverable turn errors keep the conversation open, and new inputs reset tool-call limits. Explicit approved catalogue names in streamed narration also move the product spotlight using existing records and their original verification timestamps. Captions occupy a separate layout region below the avatar. The existing ten-minute demo limit now displays an explicit message.


## Mobile startup

Avatar preparation and voice connection have separate status messages. Voice admission is requested after the avatar is ready, with a three-minute deadline covering the entire startup. Cancellation cleans up late initialization results. If the browser suspends audio, tap the audio activation button. Shopify starts its two-minute inactivity timer only after connecting. These are application-layer changes; the Kasamila API, SDK and mouth models are unchanged.

Portal also waits for presented avatar video frames before voice admission; metadata alone is insufficient. A poster covers loading or buffering, playback blocks expose a user-gesture button, and persistent missing frames or decoding errors end with a retry message. The monitor does not rewrite SDK mouth rendering, frame callbacks, or geometry timelines.
