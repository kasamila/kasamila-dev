---
title: "ElevenLabs + Kasamila: 음성과 화면을 하나로 연결하는 영상 고객 상담"
summary: "기존 ElevenLabs Agent를 유지하면서 보이는 아바타를 추가합니다. 재생과 입 움직임은 같은 응답 오디오를 사용합니다."
lang: ko
slug: elevenlabs-kasamila-video-call-customer-service
---

# ElevenLabs + Kasamila: 음성과 화면을 하나로 연결하는 영상 고객 상담

기존 ElevenLabs Agent를 유지하면서 보이는 아바타를 추가합니다. 재생과 입 움직임은 같은 응답 오디오를 사용합니다.

## 구현 절차

1. 기존 Agent의 지식 기반, 상담 지침, 승인된 도구와 사람에게 넘기는 절차를 설정합니다. 아바타는 업무 로직을 대체하지 않습니다.

2. npm ci 실행 후 .env.example을 .env로 복사합니다. PROVIDER=elevenlabs, ELEVENLABS_API_KEY, ELEVENLABS_AGENT_ID 및 Kasamila 설정과 정확한 미디어 설명자를 서버에만 저장하고 입출력은 PCM으로 선택합니다.

3. npm start 후 /public/video-call.html을 엽니다. Start로 오디오와 마이크를 허용합니다. 서명된 ElevenLabs URL은 서버에서 발급받으며 URL과 영구 키를 브라우저에 전달하지 않습니다.

4. 마이크는 Agent에만 전달됩니다. 실제 응답 PCM을 Kasamila SDK가 재생하고 입 움직임에도 사용하므로 두 번째 플레이어를 추가하지 않습니다. 선택 카메라는 로컬 미리보기이며 사람 간 WebRTC 또는 PSTN 완성 서비스가 아닙니다.

5. 끼어들기는 오래된 재생을 폐기합니다. 수동 큐 비우기가 원격 생성 중단을 보장하지는 않습니다. End는 연결 종료, 아바타 destroy와 승인된 Runtime 종료를 요청합니다. 무음은 과금 종료가 아니므로 확인이 필요합니다.

```bash
cd examples/realtime-integrations
npm ci
cp .env.example .env
# Backend-only configuration: see linked guide
npm start
```

## 범위와 검증

실행 가능한 예제이지 공급자 인증이나 음소 정확도 보장이 아닙니다. 로그인, 권한, 동의와 HTTPS/WSS를 추가하고 실제 계정의 대화와 중단을 검증하세요.

## 코드와 프로토콜

- [kasamila-dev / SDK 2.1.0](https://github.com/kasamila/kasamila-dev/tree/main/examples/realtime-integrations)
- [코드와 프로토콜](https://github.com/kasamila/kasamila-dev/tree/main/examples/realtime-integrations/voice-platforms/README.en.md)
- [ElevenLabs WebSocket](https://elevenlabs.io/docs/eleven-agents/api-reference/eleven-agents/websocket)

## Markdown / AI 읽기

- [Markdown](https://www.kasamila.com/portal/content/blog/elevenlabs-kasamila-video-call-customer-service.md?lang=ko)
- [HTML](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ko)
- [JSON](https://www.kasamila.com/api/v1/portal/content/blog/elevenlabs-kasamila-video-call-customer-service?locale=ko)

[zh](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=zh) | [en](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=en) | [fr](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=fr) | [de](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=de) | [ru](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ru) | [es](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=es) | [it](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=it) | [ar](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ar) | [ja](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ja) | [ko](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ko) | [th](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=th) | [ms](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ms) | [vi](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=vi) | [hi](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=hi) | [id](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=id)
