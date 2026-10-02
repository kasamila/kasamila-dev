---
title: "ElevenLabs + Kasamila : service client en appel vidéo, voix et image unifiées"
summary: "Conservez votre Agent ElevenLabs et rendez ses réponses visibles, avec un seul chemin audio pour la voix et les mouvements de bouche."
lang: fr
slug: elevenlabs-kasamila-video-call-customer-service
---

# ElevenLabs + Kasamila : service client en appel vidéo, voix et image unifiées

Conservez votre Agent ElevenLabs et rendez ses réponses visibles, avec un seul chemin audio pour la voix et les mouvements de bouche.

## Mise en œuvre

1. Configurez votre Agent ElevenLabs existant : base de connaissances, consignes, outils autorisés et transfert humain. L’avatar ne remplace pas cette logique.

2. Exécutez npm ci et copiez .env.example vers .env. Gardez côté serveur PROVIDER=elevenlabs, ELEVENLABS_API_KEY, ELEVENLABS_AGENT_ID et les paramètres Kasamila. Utilisez un modèle accessible, son descripteur média exact et des entrées/sorties PCM.

3. Lancez npm start puis /public/video-call.html. Start débloque le son et demande le microphone. Le serveur obtient l’URL signée ElevenLabs ; ni cette URL ni les clés permanentes ne vont au navigateur.

4. Le microphone alimente uniquement l’agent. Sa réponse PCM est lue et anime la bouche par le même SDK Kasamila, sans second lecteur. La caméra facultative reste locale ; cette interface n’est pas un appel WebRTC humain ou un service PSTN complet.

5. La prise de parole interrompt la lecture ancienne. Vider la file manuellement ne garantit pas l’arrêt de la génération distante. End ferme le transport, détruit l’avatar et demande la fin autorisée du Runtime. Le silence n’arrête pas la facturation ; vérifiez la confirmation.

```bash
cd examples/realtime-integrations
npm ci
cp .env.example .env
# Backend-only configuration: see linked guide
npm start
```

## Limites et validation

Cet exemple exécutable n’est ni une certification fournisseur ni une garantie phonétique. Ajoutez authentification, consentement, autorisation des modèles et outils, HTTPS/WSS et tests réels de conversation.

## Code et protocoles

- [kasamila-dev / SDK 2.1.0](https://github.com/kasamila/kasamila-dev/tree/main/examples/realtime-integrations)
- [Code et protocoles](https://github.com/kasamila/kasamila-dev/tree/main/examples/realtime-integrations/voice-platforms/README.en.md)
- [ElevenLabs WebSocket](https://elevenlabs.io/docs/eleven-agents/api-reference/eleven-agents/websocket)

## Lecture Markdown / IA

- [Markdown](https://www.kasamila.com/portal/content/blog/elevenlabs-kasamila-video-call-customer-service.md?lang=fr)
- [HTML](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=fr)
- [JSON](https://www.kasamila.com/api/v1/portal/content/blog/elevenlabs-kasamila-video-call-customer-service?locale=fr)

[zh](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=zh) | [en](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=en) | [fr](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=fr) | [de](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=de) | [ru](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ru) | [es](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=es) | [it](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=it) | [ar](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ar) | [ja](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ja) | [ko](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ko) | [th](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=th) | [ms](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ms) | [vi](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=vi) | [hi](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=hi) | [id](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=id)
