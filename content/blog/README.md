# Multilingual tutorials / 多语言博客

Two articles, each with **15 independently written language versions**, not an English body under translated navigation:

- [ElevenLabs + Kasamila](elevenlabs-kasamila-video-call-customer-service/en.md) / [中文](elevenlabs-kasamila-video-call-customer-service/zh.md)
- [OBS + Kasamila + Streamlabs](obs-kasamila-streamlabs-avatar-livestream/en.md) / [中文](obs-kasamila-streamlabs-avatar-livestream/zh.md)

Locales: zh, en, fr, de, ru, es, it, ar, ja, ko, th, ms, vi, hi, id.

`catalog.mjs` is the editorial source. `node content/blog/build.mjs` mechanically renders Markdown; `node content/blog/build.mjs --check` verifies it. Optional `--bundle <path>` creates a publication payload, but **does not publish**, authenticate or modify CMS.

Portal publication uses its versioned editorial draft/publish workflow with role authorization, revision guards and audit records. The published pages expose HTML, locale-specific Markdown and JSON. Portal's existing canonical/hreflang/BlogPosting, sitemap and llms discovery remain the delivery layer; do not use a JavaScript-only page or mislabel fallback text as a translation.

中文：正文通过 CMS 的草稿/发布流程上线，保留版本与审计；本目录不存凭据，也不自动发布。文章及示例区分实际协议实现、离线测试与需要真实账户的端到端验收。内容里的视觉声音统一表示同一回复音频链路，不是音素准确承诺。
