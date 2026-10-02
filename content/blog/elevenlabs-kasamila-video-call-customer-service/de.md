---
title: "ElevenLabs + Kasamila: Video-Kundendienst mit gemeinsamem Ton- und Bildpfad"
summary: "Den bestehenden ElevenLabs Agent behalten und seine Antworten sichtbar machen: Wiedergabe und Mundbewegung nutzen denselben Audiopfad."
lang: de
slug: elevenlabs-kasamila-video-call-customer-service
---

# ElevenLabs + Kasamila: Video-Kundendienst mit gemeinsamem Ton- und Bildpfad

Den bestehenden ElevenLabs Agent behalten und seine Antworten sichtbar machen: Wiedergabe und Mundbewegung nutzen denselben Audiopfad.

## Umsetzung

1. Konfigurieren Sie den bestehenden ElevenLabs Agent: Wissensbasis, Service-Regeln, erlaubte Werkzeuge und menschliche Eskalation bleiben dort. Der Avatar ersetzt diese Logik nicht.

2. npm ci ausführen und .env.example nach .env kopieren. PROVIDER=elevenlabs, ELEVENLABS_API_KEY, ELEVENLABS_AGENT_ID sowie Kasamila-Zugang und passenden Mediendeskriptor nur serverseitig setzen. PCM für Ein- und Ausgabe wählen.

3. npm start ausführen und /public/video-call.html öffnen. Start entsperrt Audio und fragt nach dem Mikrofon. Der Server beschafft die signierte ElevenLabs-URL; permanente Schlüssel und diese URL bleiben vom Browser fern.

4. Das Mikrofon geht nur zum Agent. Die echte PCM-Antwort wird vom selben Kasamila SDK abgespielt und für Mundbewegungen genutzt, ohne zweiten Player. Die optionale Kamera bleibt lokal; dies ist kein fertiger menschlicher WebRTC- oder PSTN-Dienst.

5. Dazwischenreden verwirft alte Wiedergabe. Manuelles Leeren stoppt nicht garantiert die entfernte Generierung. End schließt den Transport, zerstört den Avatar und fordert das autorisierte Runtime-Ende an. Stille beendet keine Abrechnung; Bestätigung prüfen.

```bash
cd examples/realtime-integrations
npm ci
cp .env.example .env
# Backend-only configuration: see linked guide
npm start
```

## Grenzen und Abnahme

Ein ausführbares Beispiel ist keine Anbieterzertifizierung oder Phonem-Garantie. Login, Vorlagenrechte, Einwilligung, Werkzeugrechte und HTTPS/WSS ergänzen; echte Gespräche und Unterbrechungen testen.

## Code und Protokolle

- [kasamila-dev / SDK 2.1.0](https://github.com/kasamila/kasamila-dev/tree/main/examples/realtime-integrations)
- [Code und Protokolle](https://github.com/kasamila/kasamila-dev/tree/main/examples/realtime-integrations/voice-platforms/README.en.md)
- [ElevenLabs WebSocket](https://elevenlabs.io/docs/eleven-agents/api-reference/eleven-agents/websocket)

## Markdown / KI-Lektüre

- [Markdown](https://www.kasamila.com/portal/content/blog/elevenlabs-kasamila-video-call-customer-service.md?lang=de)
- [HTML](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=de)
- [JSON](https://www.kasamila.com/api/v1/portal/content/blog/elevenlabs-kasamila-video-call-customer-service?locale=de)

[zh](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=zh) | [en](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=en) | [fr](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=fr) | [de](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=de) | [ru](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ru) | [es](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=es) | [it](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=it) | [ar](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ar) | [ja](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ja) | [ko](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ko) | [th](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=th) | [ms](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ms) | [vi](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=vi) | [hi](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=hi) | [id](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=id)
