---
title: "ElevenLabs + Kasamila: layanan pelanggan panggilan video dengan satu jalur suara dan visual"
summary: "Pertahankan Agent ElevenLabs yang ada dan tambahkan avatar; audio balasan yang sama dipakai untuk pemutaran dan gerak mulut."
lang: id
slug: elevenlabs-kasamila-video-call-customer-service
---

# ElevenLabs + Kasamila: layanan pelanggan panggilan video dengan satu jalur suara dan visual

Pertahankan Agent ElevenLabs yang ada dan tambahkan avatar; audio balasan yang sama dipakai untuk pemutaran dan gerak mulut.

## Implementasi

1. Konfigurasikan Agent yang ada: basis pengetahuan, petunjuk layanan, alat berizin dan eskalasi manusia tetap di sana. Avatar tidak menggantikan logika bisnis.

2. Jalankan npm ci dan salin .env.example ke .env. Simpan PROVIDER=elevenlabs, ELEVENLABS_API_KEY, ELEVENLABS_AGENT_ID serta konfigurasi Kasamila dan deskriptor media yang cocok di server saja. Pilih PCM masuk dan keluar.

3. Jalankan npm start lalu buka /public/video-call.html. Start membuka audio dan meminta mikrofon. Server memperoleh URL ElevenLabs bertanda tangan; URL itu dan kunci permanen tidak diberikan ke browser.

4. Mikrofon hanya menuju Agent. PCM balasan nyata diputar sekaligus menggerakkan mulut lewat SDK Kasamila yang sama, tanpa pemutar kedua. Kamera opsional hanya pratinjau lokal; bukan layanan WebRTC antarmanusia atau PSTN lengkap.

5. Menyela membuang pemutaran lama. Mengosongkan antrean secara manual tidak menjamin penghentian generasi jarak jauh. End menutup transport, destroy avatar dan meminta akhir Runtime berizin. Diam bukan penghentian tagihan; periksa konfirmasinya.

```bash
cd examples/realtime-integrations
npm ci
cp .env.example .env
# Backend-only configuration: see linked guide
npm start
```

## Batas dan penerimaan

Contoh yang berjalan bukan sertifikasi penyedia atau jaminan ketepatan fonem. Tambahkan login, izin, persetujuan dan HTTPS/WSS; uji akun dan percakapan nyata.

## Kode dan protokol

- [kasamila-dev / SDK 2.1.0](https://github.com/kasamila/kasamila-dev/tree/main/examples/realtime-integrations)
- [Kode dan protokol](https://github.com/kasamila/kasamila-dev/tree/main/examples/realtime-integrations/voice-platforms/README.en.md)
- [ElevenLabs WebSocket](https://elevenlabs.io/docs/eleven-agents/api-reference/eleven-agents/websocket)

## Bacaan Markdown / AI

- [Markdown](https://www.kasamila.com/portal/content/blog/elevenlabs-kasamila-video-call-customer-service.md?lang=id)
- [HTML](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=id)
- [JSON](https://www.kasamila.com/api/v1/portal/content/blog/elevenlabs-kasamila-video-call-customer-service?locale=id)

[zh](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=zh) | [en](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=en) | [fr](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=fr) | [de](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=de) | [ru](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ru) | [es](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=es) | [it](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=it) | [ar](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ar) | [ja](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ja) | [ko](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ko) | [th](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=th) | [ms](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ms) | [vi](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=vi) | [hi](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=hi) | [id](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=id)
