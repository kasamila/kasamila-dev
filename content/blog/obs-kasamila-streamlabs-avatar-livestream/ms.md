---
title: "OBS + Kasamila + Streamlabs: satu hos avatar untuk siaran langsung"
summary: "Paparan telus, input audio, baris gilir, gangguan, adegan dan penamatan jelas berkongsi satu komponen."
lang: ms
slug: obs-kasamila-streamlabs-avatar-livestream
---

# OBS + Kasamila + Streamlabs: satu hos avatar untuk siaran langsung

Paparan telus, input audio, baris gilir, gangguan, adegan dan penamatan jelas berkongsi satu komponen.

## Pelaksanaan

1. Mulakan relay dengan satu Agent atau jambatan PCM disahkan. Tetapkan KASAMILA_OUTPUT_MODE=transparent dan packed-matte HLS templat telus; kelegapan CSS bukan pengganti.

2. Buka /public/studio.html, cipta bilik dan salin URL sementara. Tambah Browser Source dalam OBS atau Streamlabs Desktop; kedua-duanya hos alternatif.

3. Melalui Interact klik Enable audio sebelum Start dalam studio. Mikrofon ditangkap di studio dan hanya jawapan menggerakkan avatar. Elak tangkapan audio pelayar dan desktop berganda.

4. FIFO menerima empat fail lengkap, setiap satu <=3 MiB dan <=30 saat. Interrupt membuang item lama. Hiburan, sembang, dagang dan permainan ialah susun atur hos sama. OBS WebSocket v5 pilihan menukar Program Scene sebenar, bukan dakwaan RPC sama pada Streamlabs Desktop.

5. Acara Streamlabs pilihan menjadi ringkasan untuk semakan, tidak menjadikan mesej derma arahan atau ucapan automatik. Sembunyi, nyahaktif, putus atau End menamatkan sesi; paparan semula tidak memulakan bil. Periksa penamatan; kerosakan mesin masih bergantung pada tamat tempoh pajakan.

```bash
cd examples/realtime-integrations
npm ci
cp .env.example .env
# Backend-only configuration: see linked guide
npm start
```

## Had dan penerimaan

Satu hos bukan empat produk perniagaan siap. Tambah semakan Origin, kuota dan moderasi; uji ketelusan, giliran, peralihan dan penamatan sebenar.

## Kod dan protokol

- [kasamila-dev / SDK 2.1.0](https://github.com/kasamila/kasamila-dev/tree/main/examples/realtime-integrations)
- [Kod dan protokol](https://github.com/kasamila/kasamila-dev/tree/main/examples/realtime-integrations/obs-streamlabs/README.en.md)
- [OBS Browser](https://github.com/obsproject/obs-browser)
- [Streamlabs Socket API](https://dev.streamlabs.com/docs/socket-api)

## Bacaan Markdown / AI

- [Markdown](https://www.kasamila.com/portal/content/blog/obs-kasamila-streamlabs-avatar-livestream.md?lang=ms)
- [HTML](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ms)
- [JSON](https://www.kasamila.com/api/v1/portal/content/blog/obs-kasamila-streamlabs-avatar-livestream?locale=ms)

[zh](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=zh) | [en](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=en) | [fr](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=fr) | [de](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=de) | [ru](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ru) | [es](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=es) | [it](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=it) | [ar](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ar) | [ja](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ja) | [ko](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ko) | [th](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=th) | [ms](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ms) | [vi](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=vi) | [hi](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=hi) | [id](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=id)
