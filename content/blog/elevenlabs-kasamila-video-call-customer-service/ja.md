---
title: "ElevenLabs + Kasamila：音声と映像を同じ経路で扱うビデオ客服"
summary: "既存の ElevenLabs Agent を維持し、返答に見えるアバターを追加。再生と口の動きは同じ音声を使います。"
lang: ja
slug: elevenlabs-kasamila-video-call-customer-service
---

# ElevenLabs + Kasamila：音声と映像を同じ経路で扱うビデオ客服

既存の ElevenLabs Agent を維持し、返答に見えるアバターを追加。再生と口の動きは同じ音声を使います。

## 実装手順

1. 既存 Agent の知識ベース、客服指示、許可されたツール、人への引き継ぎを設定します。アバターは業務ロジックを置き換えません。

2. npm ci を実行し .env.example を .env にコピー。PROVIDER=elevenlabs、ELEVENLABS_API_KEY、ELEVENLABS_AGENT_ID、Kasamila 設定と一致する媒体記述子をサーバーだけに設定し、入出力は PCM にします。

3. npm start 後 /public/video-call.html を開き、Start で音声とマイクを許可。サーバーが署名付き ElevenLabs URL を取得し、その URL と永久キーをブラウザへ渡しません。

4. マイクは Agent だけに送信。返答の実際の PCM を同じ Kasamila SDK で再生し口を動かし、別プレイヤーは使いません。任意のカメラはローカル表示のみ。人同士の WebRTC 通話や PSTN の完成サービスではありません。

5. 話し始めると古い再生を破棄します。手動キュー消去だけでは上流生成の停止を保証しません。End で接続を閉じ、アバターを destroy し認可済み Runtime 終了を要求。無音は課金停止ではなく、終了確認が必要です。

```bash
cd examples/realtime-integrations
npm ci
cp .env.example .env
# Backend-only configuration: see linked guide
npm start
```

## 範囲と検証

実行可能な例であり、プロバイダー認証や音素精度の保証ではありません。ログイン、権限、同意、HTTPS/WSS を追加し、実アカウントで会話と割り込みを確認してください。

## コードとプロトコル

- [kasamila-dev / SDK 2.1.0](https://github.com/kasamila/kasamila-dev/tree/main/examples/realtime-integrations)
- [コードとプロトコル](https://github.com/kasamila/kasamila-dev/tree/main/examples/realtime-integrations/voice-platforms/README.en.md)
- [ElevenLabs WebSocket](https://elevenlabs.io/docs/eleven-agents/api-reference/eleven-agents/websocket)

## Markdown / AI 閲覧

- [Markdown](https://www.kasamila.com/portal/content/blog/elevenlabs-kasamila-video-call-customer-service.md?lang=ja)
- [HTML](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ja)
- [JSON](https://www.kasamila.com/api/v1/portal/content/blog/elevenlabs-kasamila-video-call-customer-service?locale=ja)

[zh](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=zh) | [en](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=en) | [fr](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=fr) | [de](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=de) | [ru](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ru) | [es](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=es) | [it](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=it) | [ar](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ar) | [ja](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ja) | [ko](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ko) | [th](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=th) | [ms](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ms) | [vi](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=vi) | [hi](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=hi) | [id](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=id)
