---
title: "ElevenLabs + Kasamila: chăm sóc khách hàng qua video với âm thanh và hình ảnh thống nhất"
summary: "Giữ Agent ElevenLabs hiện có, thêm avatar nhìn thấy được; cùng âm thanh trả lời dùng để phát và điều khiển miệng."
lang: vi
slug: elevenlabs-kasamila-video-call-customer-service
---

# ElevenLabs + Kasamila: chăm sóc khách hàng qua video với âm thanh và hình ảnh thống nhất

Giữ Agent ElevenLabs hiện có, thêm avatar nhìn thấy được; cùng âm thanh trả lời dùng để phát và điều khiển miệng.

## Triển khai

1. Cấu hình Agent hiện có với cơ sở tri thức, hướng dẫn dịch vụ, công cụ được phép và chuyển tiếp con người. Avatar không thay thế logic nghiệp vụ.

2. Chạy npm ci và sao chép .env.example thành .env. Chỉ đặt PROVIDER=elevenlabs, ELEVENLABS_API_KEY, ELEVENLABS_AGENT_ID cùng cấu hình Kasamila và mô tả media khớp trên máy chủ. Chọn PCM đầu vào và đầu ra.

3. Chạy npm start, mở /public/video-call.html. Start mở âm thanh và yêu cầu mic. Máy chủ lấy URL ElevenLabs đã ký; URL đó và khóa vĩnh viễn không được gửi tới trình duyệt.

4. Mic chỉ đến Agent. PCM phản hồi thật được cùng SDK Kasamila phát và điều khiển miệng, không thêm trình phát thứ hai. Camera tùy chọn chỉ xem tại máy; đây không phải cuộc gọi WebRTC giữa người hoặc dịch vụ PSTN hoàn chỉnh.

5. Nói chen loại bỏ phần phát cũ. Xóa hàng đợi thủ công không đảm bảo dừng sinh âm thanh từ xa. End đóng kết nối, destroy avatar và yêu cầu kết thúc Runtime có quyền. Im lặng không ngừng tính phí; cần kiểm tra xác nhận.

```bash
cd examples/realtime-integrations
npm ci
cp .env.example .env
# Backend-only configuration: see linked guide
npm start
```

## Giới hạn và nghiệm thu

Mẫu chạy được không phải chứng nhận nhà cung cấp hoặc bảo đảm độ chính xác âm vị. Bổ sung đăng nhập, quyền, đồng ý và HTTPS/WSS; kiểm thử hội thoại thật.

## Mã và giao thức

- [kasamila-dev / SDK 2.1.0](https://github.com/kasamila/kasamila-dev/tree/main/examples/realtime-integrations)
- [Mã và giao thức](https://github.com/kasamila/kasamila-dev/tree/main/examples/realtime-integrations/voice-platforms/README.en.md)
- [ElevenLabs WebSocket](https://elevenlabs.io/docs/eleven-agents/api-reference/eleven-agents/websocket)

## Đọc Markdown / AI

- [Markdown](https://www.kasamila.com/portal/content/blog/elevenlabs-kasamila-video-call-customer-service.md?lang=vi)
- [HTML](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=vi)
- [JSON](https://www.kasamila.com/api/v1/portal/content/blog/elevenlabs-kasamila-video-call-customer-service?locale=vi)

[zh](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=zh) | [en](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=en) | [fr](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=fr) | [de](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=de) | [ru](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ru) | [es](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=es) | [it](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=it) | [ar](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ar) | [ja](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ja) | [ko](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ko) | [th](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=th) | [ms](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ms) | [vi](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=vi) | [hi](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=hi) | [id](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=id)
