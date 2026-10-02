---
title: "OBS + Kasamila + Streamlabs: satu komponen pembawa acara digital untuk siaran"
summary: "Tampilan transparan, input audio, antrean, interupsi, adegan dan akhir sesi eksplisit dalam satu komponen."
lang: id
slug: obs-kasamila-streamlabs-avatar-livestream
---

# OBS + Kasamila + Streamlabs: satu komponen pembawa acara digital untuk siaran

Tampilan transparan, input audio, antrean, interupsi, adegan dan akhir sesi eksplisit dalam satu komponen.

## Implementasi

1. Mulai relay dengan satu Agent atau jembatan PCM terautentikasi. Atur KASAMILA_OUTPUT_MODE=transparent dan packed-matte HLS templat transparan; opacity CSS bukan pengganti.

2. Buka /public/studio.html, buat ruang dan salin URL sementara. Tambahkan ke Browser Source OBS atau Streamlabs Desktop; keduanya host alternatif.

3. Melalui Interact klik Enable audio sebelum Start di studio. Mikrofon ditangkap di studio dan hanya balasan menggerakkan avatar. Hindari menangkap audio browser dan desktop yang sama dua kali.

4. FIFO menerima empat berkas lengkap, masing-masing <=3 MiB dan <=30 detik. Interrupt membuang item lama. Hiburan, obrolan, niaga dan gim adalah tata letak satu host. OBS WebSocket v5 opsional mengganti Program Scene nyata, tanpa menjanjikan RPC sama di Streamlabs Desktop.

5. Acara Streamlabs opsional menjadi ringkasan untuk ditinjau, bukan otomatis mengubah pesan donasi menjadi instruksi atau ucapan. Menyembunyikan, menonaktifkan, terputus atau End mengakhiri sesi; tampil kembali tidak memulai tagihan otomatis. Periksa akhir; kegagalan mesin masih bergantung pada masa sewa.

```bash
cd examples/realtime-integrations
npm ci
cp .env.example .env
# Backend-only configuration: see linked guide
npm start
```

## Batas dan penerimaan

Host bersama bukan empat produk bisnis selesai. Tambahkan pemeriksaan Origin, kuota dan moderasi; uji transparansi, antrean, transisi dan akhir di lingkungan nyata.

## Kode dan protokol

- [kasamila-dev / SDK 2.1.0](https://github.com/kasamila/kasamila-dev/tree/main/examples/realtime-integrations)
- [Kode dan protokol](https://github.com/kasamila/kasamila-dev/tree/main/examples/realtime-integrations/obs-streamlabs/README.en.md)
- [OBS Browser](https://github.com/obsproject/obs-browser)
- [Streamlabs Socket API](https://dev.streamlabs.com/docs/socket-api)

## Bacaan Markdown / AI

- [Markdown](https://www.kasamila.com/portal/content/blog/obs-kasamila-streamlabs-avatar-livestream.md?lang=id)
- [HTML](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=id)
- [JSON](https://www.kasamila.com/api/v1/portal/content/blog/obs-kasamila-streamlabs-avatar-livestream?locale=id)

[zh](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=zh) | [en](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=en) | [fr](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=fr) | [de](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=de) | [ru](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ru) | [es](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=es) | [it](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=it) | [ar](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ar) | [ja](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ja) | [ko](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ko) | [th](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=th) | [ms](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ms) | [vi](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=vi) | [hi](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=hi) | [id](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=id)
