---
title: "OBS + Kasamila + Streamlabs: ein Avatar-Host für viele Livestreams"
summary: "Transparente Browserquelle, Audioeingang, Warteschlange, Unterbrechung, Szenen und Sitzungsende in einer Komponente."
lang: de
slug: obs-kasamila-streamlabs-avatar-livestream
---

# OBS + Kasamila + Streamlabs: ein Avatar-Host für viele Livestreams

Transparente Browserquelle, Audioeingang, Warteschlange, Unterbrechung, Szenen und Sitzungsende in einer Komponente.

## Umsetzung

1. Relay mit einem Agent oder authentifizierten PCM-Bridge starten. KASAMILA_OUTPUT_MODE=transparent und echtes packed-matte HLS verwenden; CSS-Deckkraft ersetzt keinen transparenten Videohintergrund.

2. In /public/studio.html einen Raum erstellen und die temporäre Anzeige-URL kopieren. OBS Browser Source oder Streamlabs Desktop Browser Source verwenden; beides sind alternative Hosts.

3. Über Interact zuerst Enable audio, danach Start im Studio. Das Studio nimmt das Mikrofon auf, nur Antworten bewegen den Avatar. Browser- und Desktop-Audio nicht doppelt erfassen.

4. FIFO erlaubt vier vollständige Dateien mit jeweils höchstens 3 MiB und 30 Sekunden. Interrupt verwirft alte Elemente. Unterhaltung, Chat, Handel und Spiel sind Layouts desselben Hosts. Optional schaltet OBS WebSocket v5 die echte Program-Szene; das verspricht keinen entsprechenden Streamlabs-Desktop-RPC.

5. Optionale Streamlabs-Ereignisse werden zur Prüfung angezeigt, nicht automatisch als Spenden-Prompts gesprochen. Verbergen, Deaktivieren, Trennen oder End beendet die Sitzung; Sichtbarkeit startet keine Abrechnung neu. Ende bestätigen; bei Rechnerausfall gilt weiterhin die Lease-Frist.

```bash
cd examples/realtime-integrations
npm ci
cp .env.example .env
# Backend-only configuration: see linked guide
npm start
```

## Grenzen und Abnahme

Eine Host-Komponente ist nicht vier fertige Geschäftsprodukte. Origin-Prüfung, Quoten und Moderation ergänzen; Transparenz, Warteschlangen, Übergänge und Ende real testen.

## Code und Protokolle

- [kasamila-dev / SDK 2.1.0](https://github.com/kasamila/kasamila-dev/tree/main/examples/realtime-integrations)
- [Code und Protokolle](https://github.com/kasamila/kasamila-dev/tree/main/examples/realtime-integrations/obs-streamlabs/README.en.md)
- [OBS Browser](https://github.com/obsproject/obs-browser)
- [Streamlabs Socket API](https://dev.streamlabs.com/docs/socket-api)

## Markdown / KI-Lektüre

- [Markdown](https://www.kasamila.com/portal/content/blog/obs-kasamila-streamlabs-avatar-livestream.md?lang=de)
- [HTML](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=de)
- [JSON](https://www.kasamila.com/api/v1/portal/content/blog/obs-kasamila-streamlabs-avatar-livestream?locale=de)

[zh](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=zh) | [en](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=en) | [fr](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=fr) | [de](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=de) | [ru](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ru) | [es](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=es) | [it](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=it) | [ar](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ar) | [ja](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ja) | [ko](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ko) | [th](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=th) | [ms](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ms) | [vi](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=vi) | [hi](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=hi) | [id](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=id)
