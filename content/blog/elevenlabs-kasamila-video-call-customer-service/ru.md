---
title: "ElevenLabs + Kasamila: видеоподдержка с единым трактом голоса и изображения"
summary: "Сохраните существующего ElevenLabs Agent и добавьте видимого аватара: звук и движение рта получают одну аудиодорожку."
lang: ru
slug: elevenlabs-kasamila-video-call-customer-service
---

# ElevenLabs + Kasamila: видеоподдержка с единым трактом голоса и изображения

Сохраните существующего ElevenLabs Agent и добавьте видимого аватара: звук и движение рта получают одну аудиодорожку.

## Реализация

1. Настройте существующего Agent ElevenLabs: база знаний, правила поддержки, разрешённые инструменты и передача человеку остаются в нём. Аватар не заменяет бизнес-логику.

2. Выполните npm ci и скопируйте .env.example в .env. Задайте только на сервере PROVIDER=elevenlabs, ELEVENLABS_API_KEY, ELEVENLABS_AGENT_ID и параметры Kasamila с точным описателем медиашаблона. Выберите PCM для входа и выхода.

3. Запустите npm start и откройте /public/video-call.html. Start разрешает звук и запрашивает микрофон. Сервер получает подписанный URL ElevenLabs; постоянные ключи и этот URL не передаются браузеру.

4. Микрофон отправляется только агенту. PCM его ответа одновременно воспроизводится и управляет ртом через Kasamila SDK, без второго плеера. Необязательная камера остаётся локальной; это не готовая связь WebRTC между людьми и не PSTN.

5. Перебивание удаляет старую очередь. Ручная очистка не гарантирует остановку генерации у провайдера. End закрывает транспорт, уничтожает аватар и запрашивает авторизованное завершение Runtime. Тишина не останавливает оплату; проверяйте подтверждение.

```bash
cd examples/realtime-integrations
npm ci
cp .env.example .env
# Backend-only configuration: see linked guide
npm start
```

## Ограничения и приёмка

Рабочий пример не является сертификацией провайдера или гарантией фонемной точности. Добавьте вход, права на шаблоны и инструменты, согласие и HTTPS/WSS; проверьте реальные диалоги.

## Код и протоколы

- [kasamila-dev / SDK 2.1.0](https://github.com/kasamila/kasamila-dev/tree/main/examples/realtime-integrations)
- [Код и протоколы](https://github.com/kasamila/kasamila-dev/tree/main/examples/realtime-integrations/voice-platforms/README.en.md)
- [ElevenLabs WebSocket](https://elevenlabs.io/docs/eleven-agents/api-reference/eleven-agents/websocket)

## Markdown / чтение ИИ

- [Markdown](https://www.kasamila.com/portal/content/blog/elevenlabs-kasamila-video-call-customer-service.md?lang=ru)
- [HTML](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ru)
- [JSON](https://www.kasamila.com/api/v1/portal/content/blog/elevenlabs-kasamila-video-call-customer-service?locale=ru)

[zh](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=zh) | [en](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=en) | [fr](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=fr) | [de](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=de) | [ru](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ru) | [es](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=es) | [it](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=it) | [ar](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ar) | [ja](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ja) | [ko](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ko) | [th](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=th) | [ms](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ms) | [vi](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=vi) | [hi](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=hi) | [id](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=id)
