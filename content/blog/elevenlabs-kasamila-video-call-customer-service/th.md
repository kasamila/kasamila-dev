---
title: "ElevenLabs + Kasamila: บริการลูกค้าแบบวิดีโอด้วยเสียงและภาพในเส้นทางเดียว"
summary: "ใช้ Agent เดิมของ ElevenLabs และเพิ่มอวตารที่มองเห็นได้ เสียงตอบเดียวกันใช้ทั้งเล่นเสียงและขยับปาก"
lang: th
slug: elevenlabs-kasamila-video-call-customer-service
---

# ElevenLabs + Kasamila: บริการลูกค้าแบบวิดีโอด้วยเสียงและภาพในเส้นทางเดียว

ใช้ Agent เดิมของ ElevenLabs และเพิ่มอวตารที่มองเห็นได้ เสียงตอบเดียวกันใช้ทั้งเล่นเสียงและขยับปาก

## ขั้นตอนใช้งาน

1. ตั้งค่า Agent เดิม ทั้งฐานความรู้ คำสั่งบริการ เครื่องมือที่ได้รับอนุญาต และการส่งต่อคน อวตารไม่ได้แทนตรรกะธุรกิจ

2. รัน npm ci แล้วคัดลอก .env.example เป็น .env เก็บ PROVIDER=elevenlabs, ELEVENLABS_API_KEY, ELEVENLABS_AGENT_ID และค่า Kasamila พร้อม media descriptor ที่ตรงกันไว้ฝั่งเซิร์ฟเวอร์เท่านั้น เลือก PCM ทั้งเข้าและออก

3. รัน npm start เปิด /public/video-call.html กด Start เพื่อเปิดเสียงและอนุญาตไมโครโฟน เซิร์ฟเวอร์รับ URL ที่ลงนามจาก ElevenLabs โดยไม่ส่ง URL นี้หรือคีย์ถาวรให้เบราว์เซอร์

4. ไมโครโฟนส่งให้ Agent เท่านั้น PCM คำตอบจริงเข้า SDK Kasamila เพื่อเล่นและขยับปากร่วมกัน ไม่เพิ่มเครื่องเล่นเสียงอีกตัว กล้องเสริมเป็นตัวอย่างในเครื่อง ไม่ใช่ WebRTC ระหว่างคนหรือบริการ PSTN ที่เสร็จสมบูรณ์

5. เมื่อพูดแทรกให้ทิ้งเสียงเก่า การล้างคิวด้วยมือไม่รับประกันหยุดสร้างเสียงบนแพลตฟอร์ม End ปิดการเชื่อมต่อ destroy อวตารและขอจบ Runtime ที่ได้รับอนุญาต ความเงียบไม่หยุดค่าใช้จ่าย ต้องตรวจคำยืนยัน

```bash
cd examples/realtime-integrations
npm ci
cp .env.example .env
# Backend-only configuration: see linked guide
npm start
```

## ขอบเขตและตรวจรับ

นี่คือตัวอย่างที่รันได้ ไม่ใช่การรับรองแพลตฟอร์มหรือรับประกันความแม่นยำหน่วยเสียง เพิ่มล็อกอิน สิทธิ์ ความยินยอม HTTPS/WSS และทดสอบบทสนทนาจริง

## โค้ดและโปรโตคอล

- [kasamila-dev / SDK 2.1.0](https://github.com/kasamila/kasamila-dev/tree/main/examples/realtime-integrations)
- [โค้ดและโปรโตคอล](https://github.com/kasamila/kasamila-dev/tree/main/examples/realtime-integrations/voice-platforms/README.en.md)
- [ElevenLabs WebSocket](https://elevenlabs.io/docs/eleven-agents/api-reference/eleven-agents/websocket)

## อ่าน Markdown / AI

- [Markdown](https://www.kasamila.com/portal/content/blog/elevenlabs-kasamila-video-call-customer-service.md?lang=th)
- [HTML](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=th)
- [JSON](https://www.kasamila.com/api/v1/portal/content/blog/elevenlabs-kasamila-video-call-customer-service?locale=th)

[zh](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=zh) | [en](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=en) | [fr](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=fr) | [de](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=de) | [ru](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ru) | [es](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=es) | [it](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=it) | [ar](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ar) | [ja](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ja) | [ko](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ko) | [th](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=th) | [ms](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ms) | [vi](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=vi) | [hi](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=hi) | [id](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=id)
