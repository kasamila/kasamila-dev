---
title: "OBS + Kasamila + Streamlabs：共通コンポーネントでデジタル司会の配信"
summary: "透明なブラウザソース、音声入力、キュー、割り込み、シーン、明示的な終了を一つのホストにまとめます。"
lang: ja
slug: obs-kasamila-streamlabs-avatar-livestream
---

# OBS + Kasamila + Streamlabs：共通コンポーネントでデジタル司会の配信

透明なブラウザソース、音声入力、キュー、割り込み、シーン、明示的な終了を一つのホストにまとめます。

## 実装手順

1. 一つの Agent または認証済み PCM bridge で relay を起動。KASAMILA_OUTPUT_MODE=transparent と対応する packed-matte HLS を使い、CSS の透明度で代用しません。

2. /public/studio.html でルームを作り一時 URL をコピー。OBS または Streamlabs Desktop の Browser Source に追加。二つは代替ホストです。

3. Interact で Enable audio を押してから studio の Start。マイクは studio 側で取得し返答だけでアバターを動かします。ブラウザ音声とデスクトップ音声の二重収録を避けます。

4. FIFO は完全ファイル四件、各 3 MiB / 30 秒まで。Interrupt は旧項目を破棄。娯楽、チャット、商取引、ゲームは同じホストのレイアウトです。任意の OBS WebSocket v5 は実際の Program Scene を変更しますが、Streamlabs Desktop の同等 RPC を約束しません。

5. 任意の Streamlabs イベントは人が確認する要約になり、投げ銭本文を自動的に指示や発話にしません。非表示、無効化、切断、End で終了し、再表示では自動課金再開しません。終了確認を残し、機器障害時はリース期限に依存します。

```bash
cd examples/realtime-integrations
npm ci
cp .env.example .env
# Backend-only configuration: see linked guide
npm start
```

## 範囲と検証

共通ホストは四つの完成業務製品ではありません。Origin 確認、割当、モデレーションを追加し、透明表示、キュー、転場、終了を実環境で検証してください。

## コードとプロトコル

- [kasamila-dev / SDK 2.1.0](https://github.com/kasamila/kasamila-dev/tree/main/examples/realtime-integrations)
- [コードとプロトコル](https://github.com/kasamila/kasamila-dev/tree/main/examples/realtime-integrations/obs-streamlabs/README.en.md)
- [OBS Browser](https://github.com/obsproject/obs-browser)
- [Streamlabs Socket API](https://dev.streamlabs.com/docs/socket-api)

## Markdown / AI 閲覧

- [Markdown](https://www.kasamila.com/portal/content/blog/obs-kasamila-streamlabs-avatar-livestream.md?lang=ja)
- [HTML](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ja)
- [JSON](https://www.kasamila.com/api/v1/portal/content/blog/obs-kasamila-streamlabs-avatar-livestream?locale=ja)

[zh](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=zh) | [en](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=en) | [fr](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=fr) | [de](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=de) | [ru](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ru) | [es](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=es) | [it](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=it) | [ar](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ar) | [ja](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ja) | [ko](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ko) | [th](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=th) | [ms](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ms) | [vi](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=vi) | [hi](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=hi) | [id](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=id)
