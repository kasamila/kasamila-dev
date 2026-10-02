---
title: "OBS + Kasamila + Streamlabs: مكوّن مقدّم رقمي واحد للبث المباشر"
summary: "عرض شفاف وإدخال صوت وطابور تشغيل ومقاطعة ومشاهد وإنهاء واضح للجلسة في مكوّن واحد."
lang: ar
slug: obs-kasamila-streamlabs-avatar-livestream
---

# OBS + Kasamila + Streamlabs: مكوّن مقدّم رقمي واحد للبث المباشر

عرض شفاف وإدخال صوت وطابور تشغيل ومقاطعة ومشاهد وإنهاء واضح للجلسة في مكوّن واحد.

## خطوات التنفيذ

1. شغّل relay مع وكيل أو جسر PCM موثّق. اضبط KASAMILA_OUTPUT_MODE=transparent ووصف packed-matte HLS لقالب شفاف؛ شفافية CSS ليست بديلاً.

2. افتح /public/studio.html وأنشئ غرفة وانسخ رابط العرض المؤقت. أضفه إلى Browser Source في OBS أو Streamlabs Desktop؛ هما خياران بديلان.

3. من Interact اضغط Enable audio قبل Start في الاستوديو. يُلتقط الميكروفون في الاستوديو ولا تحرّك الشخصية إلا الردود. تجنّب التقاط صوت المتصفح وسطح المكتب مرتين.

4. يسمح FIFO بأربعة ملفات كاملة، كل منها حتى 3 MiB و30 ثانية. Interrupt يلغي العناصر القديمة. الترفيه والدردشة والتجارة والألعاب تخطيطات لنفس المكوّن. يمكن لـ OBS WebSocket v5 الاختياري تبديل Program Scene الحقيقية، دون ادعاء نفس RPC في Streamlabs Desktop.

5. تظهر أحداث Streamlabs الاختيارية للمراجعة البشرية، ولا تصبح رسائل التبرعات تعليمات أو كلاماً آلياً. الإخفاء أو التعطيل أو قطع الاتصال أو End ينهي الجلسة؛ إظهار المصدر لا يعيد الفوترة تلقائياً. تأكد من الإنهاء؛ فشل الجهاز يظل مرتبطاً بانتهاء مدة التأجير.

```bash
cd examples/realtime-integrations
npm ci
cp .env.example .env
# Backend-only configuration: see linked guide
npm start
```

## الحدود والقبول

مكوّن واحد لا يعني أربعة منتجات أعمال مكتملة. أضف فحص Origin والحصص والإشراف واختبر الشفافية والطوابير والانتقالات والإنهاء في بيئتك.

## الكود والبروتوكولات

- [kasamila-dev / SDK 2.1.0](https://github.com/kasamila/kasamila-dev/tree/main/examples/realtime-integrations)
- [الكود والبروتوكولات](https://github.com/kasamila/kasamila-dev/tree/main/examples/realtime-integrations/obs-streamlabs/README.en.md)
- [OBS Browser](https://github.com/obsproject/obs-browser)
- [Streamlabs Socket API](https://dev.streamlabs.com/docs/socket-api)

## قراءة Markdown والذكاء الاصطناعي

- [Markdown](https://www.kasamila.com/portal/content/blog/obs-kasamila-streamlabs-avatar-livestream.md?lang=ar)
- [HTML](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ar)
- [JSON](https://www.kasamila.com/api/v1/portal/content/blog/obs-kasamila-streamlabs-avatar-livestream?locale=ar)

[zh](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=zh) | [en](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=en) | [fr](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=fr) | [de](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=de) | [ru](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ru) | [es](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=es) | [it](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=it) | [ar](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ar) | [ja](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ja) | [ko](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ko) | [th](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=th) | [ms](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ms) | [vi](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=vi) | [hi](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=hi) | [id](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=id)
