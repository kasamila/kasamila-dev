---
title: "ElevenLabs + Kasamila: atención por videollamada con voz e imagen unificadas"
summary: "Conserva tu Agent de ElevenLabs y haz visibles sus respuestas: un solo audio alimenta la reproducción y el movimiento de boca."
lang: es
slug: elevenlabs-kasamila-video-call-customer-service
---

# ElevenLabs + Kasamila: atención por videollamada con voz e imagen unificadas

Conserva tu Agent de ElevenLabs y haz visibles sus respuestas: un solo audio alimenta la reproducción y el movimiento de boca.

## Implementación

1. Configura el Agent existente de ElevenLabs: base de conocimientos, reglas, herramientas autorizadas y escalado humano. El avatar no sustituye esa lógica.

2. Ejecuta npm ci y copia .env.example a .env. Guarda en el servidor PROVIDER=elevenlabs, ELEVENLABS_API_KEY, ELEVENLABS_AGENT_ID y los parámetros Kasamila con el descriptor multimedia exacto. Selecciona PCM de entrada y salida.

3. Ejecuta npm start y abre /public/video-call.html. Start habilita el audio y solicita el micrófono. El servidor obtiene la URL firmada de ElevenLabs; ni ella ni las claves permanentes se entregan al navegador.

4. El micrófono solo llega al agente. Su respuesta PCM se reproduce y anima la boca mediante el mismo SDK Kasamila, sin otro reproductor. La cámara opcional queda local; no es una llamada WebRTC entre personas ni un servicio PSTN completo.

5. Al hablar se descarta la reproducción antigua. Vaciar la cola manualmente no garantiza detener la generación remota. End cierra el transporte, destruye el avatar y solicita terminar Runtime. El silencio no detiene la facturación: comprueba la confirmación.

```bash
cd examples/realtime-integrations
npm ci
cp .env.example .env
# Backend-only configuration: see linked guide
npm start
```

## Límites y aceptación

Este ejemplo ejecutable no certifica al proveedor ni garantiza precisión fonética. Añade acceso, autorización, consentimiento, controles de herramientas y HTTPS/WSS; valida llamadas reales.

## Código y protocolos

- [kasamila-dev / SDK 2.1.0](https://github.com/kasamila/kasamila-dev/tree/main/examples/realtime-integrations)
- [Código y protocolos](https://github.com/kasamila/kasamila-dev/tree/main/examples/realtime-integrations/voice-platforms/README.en.md)
- [ElevenLabs WebSocket](https://elevenlabs.io/docs/eleven-agents/api-reference/eleven-agents/websocket)

## Lectura Markdown / IA

- [Markdown](https://www.kasamila.com/portal/content/blog/elevenlabs-kasamila-video-call-customer-service.md?lang=es)
- [HTML](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=es)
- [JSON](https://www.kasamila.com/api/v1/portal/content/blog/elevenlabs-kasamila-video-call-customer-service?locale=es)

[zh](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=zh) | [en](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=en) | [fr](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=fr) | [de](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=de) | [ru](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ru) | [es](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=es) | [it](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=it) | [ar](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ar) | [ja](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ja) | [ko](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ko) | [th](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=th) | [ms](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ms) | [vi](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=vi) | [hi](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=hi) | [id](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=id)
