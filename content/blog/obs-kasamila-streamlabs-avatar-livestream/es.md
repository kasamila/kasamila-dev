---
title: "OBS + Kasamila + Streamlabs: un anfitrión digital reutilizable para directos"
summary: "Transparencia, entrada de audio, cola, interrupción, escenas y cierre explícito comparten un componente."
lang: es
slug: obs-kasamila-streamlabs-avatar-livestream
---

# OBS + Kasamila + Streamlabs: un anfitrión digital reutilizable para directos

Transparencia, entrada de audio, cola, interrupción, escenas y cierre explícito comparten un componente.

## Implementación

1. Inicia el relay con un agente o el puente PCM autenticado. Usa KASAMILA_OUTPUT_MODE=transparent y HLS packed-matte de una plantilla transparente; la opacidad CSS no basta.

2. Abre /public/studio.html, crea una sala y copia la URL temporal. Añádela a Browser Source de OBS o Streamlabs Desktop; son anfitriones alternativos.

3. En Interact pulsa Enable audio antes de Start en el estudio. El micrófono se captura allí y solo las respuestas animan al avatar. Evita capturar también el mismo audio de escritorio.

4. La cola FIFO admite cuatro archivos completos, de hasta 3 MiB y 30 segundos cada uno. Interrupt descarta elementos viejos. Entretenimiento, chat, comercio y juegos son diseños de un solo anfitrión. OBS WebSocket v5 opcional cambia la Program Scene real, sin atribuir ese RPC a Streamlabs Desktop.

5. Los eventos opcionales de Streamlabs se revisan antes de usarse; el texto de donaciones nunca se convierte automáticamente en instrucciones o voz. Ocultar, desactivar, desconectar o End termina la sesión; mostrarla no reinicia el cobro. Verifica el cierre; un fallo del equipo depende aún del vencimiento del arrendamiento.

```bash
cd examples/realtime-integrations
npm ci
cp .env.example .env
# Backend-only configuration: see linked guide
npm start
```

## Límites y aceptación

Un componente común no son cuatro productos terminados. Añade comprobación de origen, cuotas y moderación; prueba transparencia, colas, transiciones y cierre en tu instalación.

## Código y protocolos

- [kasamila-dev / SDK 2.1.0](https://github.com/kasamila/kasamila-dev/tree/main/examples/realtime-integrations)
- [Código y protocolos](https://github.com/kasamila/kasamila-dev/tree/main/examples/realtime-integrations/obs-streamlabs/README.en.md)
- [OBS Browser](https://github.com/obsproject/obs-browser)
- [Streamlabs Socket API](https://dev.streamlabs.com/docs/socket-api)

## Lectura Markdown / IA

- [Markdown](https://www.kasamila.com/portal/content/blog/obs-kasamila-streamlabs-avatar-livestream.md?lang=es)
- [HTML](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=es)
- [JSON](https://www.kasamila.com/api/v1/portal/content/blog/obs-kasamila-streamlabs-avatar-livestream?locale=es)

[zh](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=zh) | [en](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=en) | [fr](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=fr) | [de](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=de) | [ru](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ru) | [es](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=es) | [it](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=it) | [ar](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ar) | [ja](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ja) | [ko](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ko) | [th](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=th) | [ms](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ms) | [vi](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=vi) | [hi](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=hi) | [id](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=id)
