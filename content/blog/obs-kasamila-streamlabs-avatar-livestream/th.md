---
title: "OBS + Kasamila + Streamlabs: คอมโพเนนต์ผู้ดำเนินรายการดิจิทัลสำหรับไลฟ์"
summary: "ภาพโปร่งใส อินพุตเสียง คิว การขัดจังหวะ ฉาก และการจบเซสชันชัดเจนในคอมโพเนนต์เดียว"
lang: th
slug: obs-kasamila-streamlabs-avatar-livestream
---

# OBS + Kasamila + Streamlabs: คอมโพเนนต์ผู้ดำเนินรายการดิจิทัลสำหรับไลฟ์

ภาพโปร่งใส อินพุตเสียง คิว การขัดจังหวะ ฉาก และการจบเซสชันชัดเจนในคอมโพเนนต์เดียว

## ขั้นตอนใช้งาน

1. เริ่ม relay ด้วย Agent หนึ่งตัวหรือ PCM bridge ที่ยืนยันสิทธิ์ ตั้ง KASAMILA_OUTPUT_MODE=transparent และ packed-matte HLS ของเทมเพลตโปร่งใส CSS opacity ใช้แทนไม่ได้

2. เปิด /public/studio.html สร้างห้องและคัดลอก URL ชั่วคราว ใส่ใน Browser Source ของ OBS หรือ Streamlabs Desktop ทั้งสองเป็นโฮสต์ทางเลือก

3. ใช้ Interact กด Enable audio ก่อน Start ใน studio ไมโครโฟนเก็บที่ studio และเฉพาะคำตอบขับอวตาร หลีกเลี่ยงรับเสียงเบราว์เซอร์ซ้ำกับเสียงเดสก์ท็อป

4. คิว FIFO รับไฟล์สมบูรณ์สี่ไฟล์ แต่ละไฟล์ไม่เกิน 3 MiB และ 30 วินาที Interrupt ทิ้งรายการเก่า บันเทิง แชต ค้าขาย และเกมเป็นเลย์เอาต์ของโฮสต์เดียว OBS WebSocket v5 เสริมเปลี่ยน Program Scene จริง แต่ไม่ได้อ้าง RPC เดียวกันของ Streamlabs Desktop

5. อีเวนต์ Streamlabs เสริมเป็นสรุปให้ผู้ดูแลตรวจ ไม่เปลี่ยนข้อความบริจาคเป็นคำสั่งหรือเสียงอัตโนมัติ ซ่อน ปิดใช้งาน หลุด หรือ End จบเซสชัน การแสดงใหม่ไม่เริ่มคิดเงินอัตโนมัติ ตรวจการจบ หากเครื่องพังยังขึ้นกับเวลาหมดอายุของสิทธิ์

```bash
cd examples/realtime-integrations
npm ci
cp .env.example .env
# Backend-only configuration: see linked guide
npm start
```

## ขอบเขตและตรวจรับ

โฮสต์ร่วมไม่ใช่สี่ผลิตภัณฑ์สำเร็จ เพิ่มตรวจ Origin โควตาและการกลั่นกรอง แล้วทดสอบโปร่งใส คิว เปลี่ยนฉากและจบจริง

## โค้ดและโปรโตคอล

- [kasamila-dev / SDK 2.1.0](https://github.com/kasamila/kasamila-dev/tree/main/examples/realtime-integrations)
- [โค้ดและโปรโตคอล](https://github.com/kasamila/kasamila-dev/tree/main/examples/realtime-integrations/obs-streamlabs/README.en.md)
- [OBS Browser](https://github.com/obsproject/obs-browser)
- [Streamlabs Socket API](https://dev.streamlabs.com/docs/socket-api)

## อ่าน Markdown / AI

- [Markdown](https://www.kasamila.com/portal/content/blog/obs-kasamila-streamlabs-avatar-livestream.md?lang=th)
- [HTML](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=th)
- [JSON](https://www.kasamila.com/api/v1/portal/content/blog/obs-kasamila-streamlabs-avatar-livestream?locale=th)

[zh](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=zh) | [en](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=en) | [fr](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=fr) | [de](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=de) | [ru](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ru) | [es](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=es) | [it](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=it) | [ar](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ar) | [ja](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ja) | [ko](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ko) | [th](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=th) | [ms](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ms) | [vi](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=vi) | [hi](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=hi) | [id](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=id)
