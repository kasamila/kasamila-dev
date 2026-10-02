---
title: "ElevenLabs + Kasamila: خدمة عملاء بمكالمة فيديو ومسار موحّد للصوت والصورة"
summary: "احتفظ بوكيل ElevenLabs الحالي وأضف شخصية مرئية؛ الصوت نفسه يشغّل الرد وحركة الفم."
lang: ar
slug: elevenlabs-kasamila-video-call-customer-service
---

# ElevenLabs + Kasamila: خدمة عملاء بمكالمة فيديو ومسار موحّد للصوت والصورة

احتفظ بوكيل ElevenLabs الحالي وأضف شخصية مرئية؛ الصوت نفسه يشغّل الرد وحركة الفم.

## خطوات التنفيذ

1. اضبط وكيل ElevenLabs الحالي وقاعدة المعرفة وتعليمات الخدمة والأدوات المصرّح بها والتحويل إلى موظف. الشخصية لا تستبدل منطق العمل.

2. نفّذ npm ci وانسخ .env.example إلى .env. ضع PROVIDER=elevenlabs وELEVENLABS_API_KEY وELEVENLABS_AGENT_ID وإعدادات Kasamila ووصف الوسائط المطابق على الخادم فقط. اختر PCM للإدخال والإخراج.

3. شغّل npm start وافتح /public/video-call.html. اضغط Start لتفعيل الصوت والسماح بالميكروفون. يحصل الخادم على رابط ElevenLabs الموقّع؛ لا يصل هذا الرابط ولا المفاتيح الدائمة إلى المتصفح.

4. يصل الميكروفون إلى الوكيل فقط. تُرسل عينات PCM الفعلية للرد إلى Kasamila لتشغيل الصوت وتحريك الفم معاً دون مشغّل ثانٍ. معاينة الكاميرا اختيارية ومحلية؛ ليست هذه خدمة WebRTC بشرية أو PSTN مكتملة.

5. المقاطعة تلغي التشغيل القديم. مسح الطابور يدوياً لا يضمن توقف التوليد البعيد. End يغلق الاتصال ويدمّر الشخصية ويطلب إنهاء Runtime المصرّح به. الصمت لا يوقف الفوترة؛ تحقق من تأكيد الإنهاء.

```bash
cd examples/realtime-integrations
npm ci
cp .env.example .env
# Backend-only configuration: see linked guide
npm start
```

## الحدود والقبول

هذا مثال قابل للتشغيل وليس اعتماداً من المزوّد أو ضماناً للدقة الصوتية. أضف تسجيل الدخول والصلاحيات والموافقة وHTTPS/WSS واختبر الحسابات والمحادثات الحقيقية.

## الكود والبروتوكولات

- [kasamila-dev / SDK 2.1.0](https://github.com/kasamila/kasamila-dev/tree/main/examples/realtime-integrations)
- [الكود والبروتوكولات](https://github.com/kasamila/kasamila-dev/tree/main/examples/realtime-integrations/voice-platforms/README.en.md)
- [ElevenLabs WebSocket](https://elevenlabs.io/docs/eleven-agents/api-reference/eleven-agents/websocket)

## قراءة Markdown والذكاء الاصطناعي

- [Markdown](https://www.kasamila.com/portal/content/blog/elevenlabs-kasamila-video-call-customer-service.md?lang=ar)
- [HTML](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ar)
- [JSON](https://www.kasamila.com/api/v1/portal/content/blog/elevenlabs-kasamila-video-call-customer-service?locale=ar)

[zh](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=zh) | [en](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=en) | [fr](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=fr) | [de](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=de) | [ru](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ru) | [es](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=es) | [it](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=it) | [ar](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ar) | [ja](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ja) | [ko](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ko) | [th](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=th) | [ms](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ms) | [vi](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=vi) | [hi](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=hi) | [id](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=id)
