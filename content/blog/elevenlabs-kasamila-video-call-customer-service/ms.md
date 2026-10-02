---
title: "ElevenLabs + Kasamila: khidmat pelanggan panggilan video dengan suara dan visual sehala"
summary: "Kekalkan Agent ElevenLabs sedia ada dan tambah avatar; audio jawapan yang sama digunakan untuk main balik dan gerakan mulut."
lang: ms
slug: elevenlabs-kasamila-video-call-customer-service
---

# ElevenLabs + Kasamila: khidmat pelanggan panggilan video dengan suara dan visual sehala

Kekalkan Agent ElevenLabs sedia ada dan tambah avatar; audio jawapan yang sama digunakan untuk main balik dan gerakan mulut.

## Pelaksanaan

1. Konfigurasikan Agent sedia ada: pangkalan pengetahuan, arahan servis, alat dibenarkan dan eskalasi manusia kekal di situ. Avatar tidak menggantikan logik perniagaan.

2. Jalankan npm ci dan salin .env.example ke .env. Simpan PROVIDER=elevenlabs, ELEVENLABS_API_KEY, ELEVENLABS_AGENT_ID serta tetapan Kasamila dan deskriptor media sepadan pada pelayan sahaja. Pilih PCM masuk dan keluar.

3. Jalankan npm start dan buka /public/video-call.html. Start membuka audio serta meminta mikrofon. Pelayan mendapat URL ElevenLabs bertandatangan; URL ini dan kunci kekal tidak dihantar ke pelayar.

4. Mikrofon hanya ke Agent. PCM jawapan sebenar dimainkan dan menggerakkan mulut melalui SDK Kasamila yang sama tanpa pemain kedua. Kamera pilihan kekal tempatan; ini bukan panggilan manusia WebRTC atau servis PSTN lengkap.

5. Celahan membuang main balik lama. Mengosongkan giliran secara manual tidak menjamin penjanaan jauh berhenti. End menutup pengangkutan, destroy avatar dan meminta tamat Runtime yang dibenarkan. Senyap tidak menghentikan bil; periksa pengesahan.

```bash
cd examples/realtime-integrations
npm ci
cp .env.example .env
# Backend-only configuration: see linked guide
npm start
```

## Had dan penerimaan

Contoh boleh dijalankan ini bukan pensijilan pembekal atau jaminan fonem. Tambah log masuk, kebenaran, persetujuan dan HTTPS/WSS; uji akaun serta perbualan sebenar.

## Kod dan protokol

- [kasamila-dev / SDK 2.1.0](https://github.com/kasamila/kasamila-dev/tree/main/examples/realtime-integrations)
- [Kod dan protokol](https://github.com/kasamila/kasamila-dev/tree/main/examples/realtime-integrations/voice-platforms/README.en.md)
- [ElevenLabs WebSocket](https://elevenlabs.io/docs/eleven-agents/api-reference/eleven-agents/websocket)

## Bacaan Markdown / AI

- [Markdown](https://www.kasamila.com/portal/content/blog/elevenlabs-kasamila-video-call-customer-service.md?lang=ms)
- [HTML](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ms)
- [JSON](https://www.kasamila.com/api/v1/portal/content/blog/elevenlabs-kasamila-video-call-customer-service?locale=ms)

[zh](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=zh) | [en](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=en) | [fr](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=fr) | [de](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=de) | [ru](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ru) | [es](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=es) | [it](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=it) | [ar](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ar) | [ja](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ja) | [ko](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ko) | [th](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=th) | [ms](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ms) | [vi](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=vi) | [hi](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=hi) | [id](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=id)
