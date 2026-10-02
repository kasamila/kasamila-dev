---
title: "OBS + Kasamila + Streamlabs: 공통 컴포넌트로 디지털 진행자 방송하기"
summary: "투명 브라우저 소스, 음성 입력, 큐, 중단, 장면과 명시적 종료를 하나의 호스트에서 제공합니다."
lang: ko
slug: obs-kasamila-streamlabs-avatar-livestream
---

# OBS + Kasamila + Streamlabs: 공통 컴포넌트로 디지털 진행자 방송하기

투명 브라우저 소스, 음성 입력, 큐, 중단, 장면과 명시적 종료를 하나의 호스트에서 제공합니다.

## 구현 절차

1. Agent 하나 또는 인증된 PCM bridge로 relay를 시작합니다. KASAMILA_OUTPUT_MODE=transparent와 투명 템플릿의 packed-matte HLS를 사용하며 CSS 투명도로 대체하지 않습니다.

2. /public/studio.html에서 방을 만들고 임시 URL을 복사합니다. OBS 또는 Streamlabs Desktop의 Browser Source에 넣습니다. 두 앱은 대체 호스트입니다.

3. Interact에서 Enable audio를 누른 뒤 studio에서 Start합니다. 마이크는 studio가 수집하고 Agent 응답만 아바타를 구동합니다. 브라우저와 데스크톱의 같은 음성을 이중 캡처하지 않습니다.

4. FIFO는 전체 파일 네 개, 각각 3 MiB 및 30초까지 허용합니다. Interrupt는 오래된 항목을 폐기합니다. 엔터테인먼트, 채팅, 상거래, 게임은 같은 호스트의 레이아웃입니다. 선택 OBS WebSocket v5는 실제 Program Scene을 바꾸지만 Streamlabs Desktop의 같은 RPC를 주장하지 않습니다.

5. 선택 Streamlabs 이벤트는 운영자 확인용 요약이며 후원 본문을 자동 프롬프트나 발화로 바꾸지 않습니다. 숨김, 비활성화, 연결 끊김 또는 End로 종료되고 다시 표시해도 자동 과금이 시작되지 않습니다. 종료 확인을 보관하며 장비 장애는 임대 만료에 의존합니다.

```bash
cd examples/realtime-integrations
npm ci
cp .env.example .env
# Backend-only configuration: see linked guide
npm start
```

## 범위와 검증

공통 호스트는 완성된 네 가지 업무 제품이 아닙니다. Origin 검사, 할당량과 검토를 추가하고 실제 방송에서 투명도, 큐, 전환과 종료를 시험하세요.

## 코드와 프로토콜

- [kasamila-dev / SDK 2.1.0](https://github.com/kasamila/kasamila-dev/tree/main/examples/realtime-integrations)
- [코드와 프로토콜](https://github.com/kasamila/kasamila-dev/tree/main/examples/realtime-integrations/obs-streamlabs/README.en.md)
- [OBS Browser](https://github.com/obsproject/obs-browser)
- [Streamlabs Socket API](https://dev.streamlabs.com/docs/socket-api)

## Markdown / AI 읽기

- [Markdown](https://www.kasamila.com/portal/content/blog/obs-kasamila-streamlabs-avatar-livestream.md?lang=ko)
- [HTML](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ko)
- [JSON](https://www.kasamila.com/api/v1/portal/content/blog/obs-kasamila-streamlabs-avatar-livestream?locale=ko)

[zh](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=zh) | [en](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=en) | [fr](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=fr) | [de](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=de) | [ru](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ru) | [es](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=es) | [it](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=it) | [ar](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ar) | [ja](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ja) | [ko](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ko) | [th](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=th) | [ms](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ms) | [vi](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=vi) | [hi](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=hi) | [id](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=id)
