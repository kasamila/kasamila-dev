---
title: "OBS + Kasamila + Streamlabs: один компонент ведущего для трансляций"
summary: "Прозрачный Browser Source, аудиовход, очередь, прерывание, сцены и явное завершение сеанса в одном компоненте."
lang: ru
slug: obs-kasamila-streamlabs-avatar-livestream
---

# OBS + Kasamila + Streamlabs: один компонент ведущего для трансляций

Прозрачный Browser Source, аудиовход, очередь, прерывание, сцены и явное завершение сеанса в одном компоненте.

## Реализация

1. Запустите relay с одним агентом или защищённым PCM bridge. Укажите KASAMILA_OUTPUT_MODE=transparent и packed-matte HLS прозрачного шаблона: CSS-прозрачность обычного видео не подходит.

2. В /public/studio.html создайте комнату и скопируйте временный URL. Добавьте Browser Source в OBS либо Streamlabs Desktop; это альтернативные оболочки.

3. Через Interact нажмите Enable audio перед Start в студии. Микрофон захватывает студия, аватаром управляют только ответы. Не дублируйте звук браузера захватом звука рабочего стола.

4. FIFO принимает четыре полных файла, каждый до 3 MiB и 30 секунд. Interrupt удаляет старые элементы. Развлечения, чат, торговля и игры используют разные раскладки одного компонента. Необязательный OBS WebSocket v5 переключает настоящую Program Scene, но не обещает такой же RPC Streamlabs Desktop.

5. События Streamlabs можно проверять в студии; сообщения донатов не превращаются автоматически в инструкции или речь. Скрытие, отключение, разрыв связи и End завершают сеанс; возврат видимости не запускает оплату. Проверяйте завершение; при аварии остаётся срок аренды.

```bash
cd examples/realtime-integrations
npm ci
cp .env.example .env
# Backend-only configuration: see linked guide
npm start
```

## Ограничения и приёмка

Единый компонент — не четыре готовых бизнес-продукта. Нужны проверка Origin, квоты и модерация, а также реальные испытания прозрачности, очереди, переходов и завершения.

## Код и протоколы

- [kasamila-dev / SDK 2.1.0](https://github.com/kasamila/kasamila-dev/tree/main/examples/realtime-integrations)
- [Код и протоколы](https://github.com/kasamila/kasamila-dev/tree/main/examples/realtime-integrations/obs-streamlabs/README.en.md)
- [OBS Browser](https://github.com/obsproject/obs-browser)
- [Streamlabs Socket API](https://dev.streamlabs.com/docs/socket-api)

## Markdown / чтение ИИ

- [Markdown](https://www.kasamila.com/portal/content/blog/obs-kasamila-streamlabs-avatar-livestream.md?lang=ru)
- [HTML](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ru)
- [JSON](https://www.kasamila.com/api/v1/portal/content/blog/obs-kasamila-streamlabs-avatar-livestream?locale=ru)

[zh](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=zh) | [en](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=en) | [fr](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=fr) | [de](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=de) | [ru](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ru) | [es](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=es) | [it](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=it) | [ar](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ar) | [ja](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ja) | [ko](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ko) | [th](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=th) | [ms](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ms) | [vi](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=vi) | [hi](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=hi) | [id](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=id)
