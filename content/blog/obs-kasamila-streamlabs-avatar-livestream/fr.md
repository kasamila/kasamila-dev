---
title: "OBS + Kasamila + Streamlabs : un composant commun pour les directs avec avatar"
summary: "Source transparente, entrée audio, file de lecture, interruption, scènes et fin de session dans un seul composant."
lang: fr
slug: obs-kasamila-streamlabs-avatar-livestream
---

# OBS + Kasamila + Streamlabs : un composant commun pour les directs avec avatar

Source transparente, entrée audio, file de lecture, interruption, scènes et fin de session dans un seul composant.

## Mise en œuvre

1. Lancez le relais avec un agent ou le pont PCM authentifié. Choisissez KASAMILA_OUTPUT_MODE=transparent et le HLS packed-matte d’un modèle compatible ; l’opacité CSS ne suffit pas.

2. Ouvrez /public/studio.html, créez une salle et copiez son URL temporaire. Ajoutez une source navigateur OBS ou Streamlabs Desktop : ce sont deux hôtes alternatifs.

3. Dans Interact, cliquez Enable audio avant Start dans le studio. Le microphone est capturé dans le studio ; seules les réponses animent l’avatar. Évitez de doubler le son navigateur avec le son du bureau.

4. La file FIFO accepte quatre fichiers complets, chacun limité à 3 MiB et 30 secondes. Interrupt élimine les anciens éléments. Divertissement, discussion, commerce et jeu sont quatre dispositions du même hôte. Le RPC OBS WebSocket v5 facultatif change la vraie scène Program, sans promettre le même RPC dans Streamlabs Desktop.

5. Les événements Streamlabs facultatifs deviennent des résumés à vérifier, jamais des instructions ou paroles automatiques issues des dons. Masquer, désactiver, déconnecter ou End termine la session ; la réapparition ne relance pas automatiquement la facturation. Vérifiez la fin ; une panne dépend encore de l’expiration du bail.

```bash
cd examples/realtime-integrations
npm ci
cp .env.example .env
# Backend-only configuration: see linked guide
npm start
```

## Limites et validation

Un hôte commun ne constitue pas quatre produits métier. Ajoutez contrôle d’origine, quotas et modération ; validez transparence, files, transitions et fin de session dans votre installation réelle.

## Code et protocoles

- [kasamila-dev / SDK 2.1.0](https://github.com/kasamila/kasamila-dev/tree/main/examples/realtime-integrations)
- [Code et protocoles](https://github.com/kasamila/kasamila-dev/tree/main/examples/realtime-integrations/obs-streamlabs/README.en.md)
- [OBS Browser](https://github.com/obsproject/obs-browser)
- [Streamlabs Socket API](https://dev.streamlabs.com/docs/socket-api)

## Lecture Markdown / IA

- [Markdown](https://www.kasamila.com/portal/content/blog/obs-kasamila-streamlabs-avatar-livestream.md?lang=fr)
- [HTML](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=fr)
- [JSON](https://www.kasamila.com/api/v1/portal/content/blog/obs-kasamila-streamlabs-avatar-livestream?locale=fr)

[zh](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=zh) | [en](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=en) | [fr](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=fr) | [de](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=de) | [ru](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ru) | [es](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=es) | [it](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=it) | [ar](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ar) | [ja](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ja) | [ko](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ko) | [th](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=th) | [ms](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ms) | [vi](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=vi) | [hi](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=hi) | [id](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=id)
