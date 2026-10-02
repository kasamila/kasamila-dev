---
title: "OBS + Kasamila + Streamlabs: một thành phần người dẫn số cho livestream"
summary: "Nguồn trong suốt, đầu vào âm thanh, hàng đợi, ngắt, cảnh và kết thúc rõ ràng trong một thành phần."
lang: vi
slug: obs-kasamila-streamlabs-avatar-livestream
---

# OBS + Kasamila + Streamlabs: một thành phần người dẫn số cho livestream

Nguồn trong suốt, đầu vào âm thanh, hàng đợi, ngắt, cảnh và kết thúc rõ ràng trong một thành phần.

## Triển khai

1. Khởi động relay bằng một Agent hoặc cầu PCM xác thực. Đặt KASAMILA_OUTPUT_MODE=transparent và packed-matte HLS của mẫu trong suốt; độ mờ CSS không thay thế được.

2. Mở /public/studio.html, tạo phòng và sao chép URL tạm. Thêm vào Browser Source của OBS hoặc Streamlabs Desktop; chúng là hai lựa chọn chủ khác nhau.

3. Qua Interact bấm Enable audio trước Start trong studio. Mic được thu tại studio và chỉ phản hồi điều khiển avatar. Không thu lặp cùng âm thanh từ trình duyệt và desktop.

4. FIFO cho bốn tệp hoàn chỉnh, mỗi tệp tối đa 3 MiB và 30 giây. Interrupt bỏ mục cũ. Giải trí, trò chuyện, thương mại và game là bố cục của cùng host. OBS WebSocket v5 tùy chọn đổi Program Scene thật, không khẳng định RPC tương tự cho Streamlabs Desktop.

5. Sự kiện Streamlabs tùy chọn là bản tóm tắt để người vận hành duyệt, không tự biến lời nhắn quyên góp thành lệnh hay lời nói. Ẩn, vô hiệu, mất kết nối hoặc End kết thúc phiên; hiện lại không tự bật tính phí. Kiểm tra xác nhận; máy hỏng vẫn phụ thuộc hết hạn thuê.

```bash
cd examples/realtime-integrations
npm ci
cp .env.example .env
# Backend-only configuration: see linked guide
npm start
```

## Giới hạn và nghiệm thu

Một host không phải bốn sản phẩm nghiệp vụ hoàn chỉnh. Thêm kiểm tra Origin, hạn mức và kiểm duyệt; thử độ trong suốt, hàng đợi, chuyển cảnh và kết thúc thật.

## Mã và giao thức

- [kasamila-dev / SDK 2.1.0](https://github.com/kasamila/kasamila-dev/tree/main/examples/realtime-integrations)
- [Mã và giao thức](https://github.com/kasamila/kasamila-dev/tree/main/examples/realtime-integrations/obs-streamlabs/README.en.md)
- [OBS Browser](https://github.com/obsproject/obs-browser)
- [Streamlabs Socket API](https://dev.streamlabs.com/docs/socket-api)

## Đọc Markdown / AI

- [Markdown](https://www.kasamila.com/portal/content/blog/obs-kasamila-streamlabs-avatar-livestream.md?lang=vi)
- [HTML](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=vi)
- [JSON](https://www.kasamila.com/api/v1/portal/content/blog/obs-kasamila-streamlabs-avatar-livestream?locale=vi)

[zh](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=zh) | [en](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=en) | [fr](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=fr) | [de](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=de) | [ru](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ru) | [es](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=es) | [it](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=it) | [ar](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ar) | [ja](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ja) | [ko](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ko) | [th](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=th) | [ms](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ms) | [vi](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=vi) | [hi](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=hi) | [id](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=id)
