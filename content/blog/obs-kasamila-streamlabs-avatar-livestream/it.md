---
title: "OBS + Kasamila + Streamlabs: un unico avatar conduttore per le dirette"
summary: "Sorgente trasparente, ingresso audio, coda, interruzione, scene e chiusura esplicita in un componente."
lang: it
slug: obs-kasamila-streamlabs-avatar-livestream
---

# OBS + Kasamila + Streamlabs: un unico avatar conduttore per le dirette

Sorgente trasparente, ingresso audio, coda, interruzione, scene e chiusura esplicita in un componente.

## Implementazione

1. Avvia il relay con un agente o il ponte PCM autenticato. Imposta KASAMILA_OUTPUT_MODE=transparent e HLS packed-matte della versione trasparente; l’opacità CSS non sostituisce un vero sfondo trasparente.

2. Apri /public/studio.html, crea una stanza e copia l’URL temporaneo. Usalo come Browser Source in OBS oppure Streamlabs Desktop: sono alternative.

3. Con Interact premi Enable audio prima di Start nello studio. Lo studio acquisisce il microfono; solo le risposte animano l’avatar. Evita la doppia cattura dell’audio browser e desktop.

4. La coda FIFO accetta quattro file completi, ciascuno entro 3 MiB e 30 secondi. Interrupt scarta gli elementi precedenti. Intrattenimento, chat, commercio e giochi sono layout dello stesso host. L’OBS WebSocket v5 opzionale cambia la vera Program Scene, senza promettere lo stesso RPC in Streamlabs Desktop.

5. Gli eventi Streamlabs opzionali sono riepiloghi da approvare, mai messaggi di donazione pronunciati o inseriti automaticamente nei prompt. Nascondere, disattivare, disconnettere o End chiude la sessione; mostrarla non riavvia gli addebiti. Controlla la chiusura; un guasto dipende ancora dalla scadenza della concessione.

```bash
cd examples/realtime-integrations
npm ci
cp .env.example .env
# Backend-only configuration: see linked guide
npm start
```

## Limiti e verifica

Un host comune non equivale a quattro prodotti completi. Servono controlli dell’origine, quote, moderazione e prove reali di trasparenza, code, transizioni e chiusura.

## Codice e protocolli

- [kasamila-dev / SDK 2.1.0](https://github.com/kasamila/kasamila-dev/tree/main/examples/realtime-integrations)
- [Codice e protocolli](https://github.com/kasamila/kasamila-dev/tree/main/examples/realtime-integrations/obs-streamlabs/README.en.md)
- [OBS Browser](https://github.com/obsproject/obs-browser)
- [Streamlabs Socket API](https://dev.streamlabs.com/docs/socket-api)

## Lettura Markdown / IA

- [Markdown](https://www.kasamila.com/portal/content/blog/obs-kasamila-streamlabs-avatar-livestream.md?lang=it)
- [HTML](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=it)
- [JSON](https://www.kasamila.com/api/v1/portal/content/blog/obs-kasamila-streamlabs-avatar-livestream?locale=it)

[zh](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=zh) | [en](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=en) | [fr](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=fr) | [de](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=de) | [ru](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ru) | [es](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=es) | [it](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=it) | [ar](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ar) | [ja](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ja) | [ko](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ko) | [th](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=th) | [ms](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ms) | [vi](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=vi) | [hi](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=hi) | [id](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=id)
