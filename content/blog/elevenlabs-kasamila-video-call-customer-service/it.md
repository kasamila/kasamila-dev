---
title: "ElevenLabs + Kasamila: assistenza in videochiamata con voce e immagine unite"
summary: "Mantieni il tuo Agent ElevenLabs: lo stesso audio riproduce la risposta e guida la bocca dell’avatar."
lang: it
slug: elevenlabs-kasamila-video-call-customer-service
---

# ElevenLabs + Kasamila: assistenza in videochiamata con voce e immagine unite

Mantieni il tuo Agent ElevenLabs: lo stesso audio riproduce la risposta e guida la bocca dell’avatar.

## Implementazione

1. Configura l’Agent ElevenLabs esistente con conoscenze, istruzioni, strumenti autorizzati e passaggio a un operatore. L’avatar non sostituisce la logica del servizio.

2. Esegui npm ci e copia .env.example in .env. Imposta solo sul server PROVIDER=elevenlabs, ELEVENLABS_API_KEY, ELEVENLABS_AGENT_ID e i parametri Kasamila con il descrittore multimediale esatto. Scegli PCM in ingresso e uscita.

3. Avvia npm start e apri /public/video-call.html. Start sblocca l’audio e richiede il microfono. Il server ottiene l’URL firmato ElevenLabs; URL e chiavi permanenti restano fuori dal browser.

4. Il microfono va soltanto all’agente. Il PCM della risposta viene riprodotto e anima la bocca dallo stesso SDK Kasamila, senza un secondo lettore. La videocamera facoltativa resta locale; non è un servizio WebRTC tra persone o PSTN completo.

5. Quando l’utente interviene, la vecchia riproduzione viene scartata. Svuotare manualmente la coda non garantisce l’arresto della generazione remota. End chiude il trasporto, distrugge l’avatar e richiede la fine autorizzata di Runtime. Il silenzio non ferma gli addebiti: verifica la conferma.

```bash
cd examples/realtime-integrations
npm ci
cp .env.example .env
# Backend-only configuration: see linked guide
npm start
```

## Limiti e verifica

L’esempio eseguibile non è una certificazione del fornitore né una garanzia fonetica. Aggiungi accesso, autorizzazioni, consenso e HTTPS/WSS; verifica conversazioni e interruzioni reali.

## Codice e protocolli

- [kasamila-dev / SDK 2.1.0](https://github.com/kasamila/kasamila-dev/tree/main/examples/realtime-integrations)
- [Codice e protocolli](https://github.com/kasamila/kasamila-dev/tree/main/examples/realtime-integrations/voice-platforms/README.en.md)
- [ElevenLabs WebSocket](https://elevenlabs.io/docs/eleven-agents/api-reference/eleven-agents/websocket)

## Lettura Markdown / IA

- [Markdown](https://www.kasamila.com/portal/content/blog/elevenlabs-kasamila-video-call-customer-service.md?lang=it)
- [HTML](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=it)
- [JSON](https://www.kasamila.com/api/v1/portal/content/blog/elevenlabs-kasamila-video-call-customer-service?locale=it)

[zh](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=zh) | [en](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=en) | [fr](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=fr) | [de](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=de) | [ru](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ru) | [es](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=es) | [it](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=it) | [ar](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ar) | [ja](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ja) | [ko](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ko) | [th](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=th) | [ms](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ms) | [vi](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=vi) | [hi](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=hi) | [id](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=id)
