---
title: "OBS + Kasamila + Streamlabs: लाइव प्रसारण के लिए एक साझा डिजिटल होस्ट"
summary: "पारदर्शी Browser Source, ऑडियो इनपुट, कतार, बाधा, दृश्य और स्पष्ट सत्र समाप्ति एक घटक में।"
lang: hi
slug: obs-kasamila-streamlabs-avatar-livestream
---

# OBS + Kasamila + Streamlabs: लाइव प्रसारण के लिए एक साझा डिजिटल होस्ट

पारदर्शी Browser Source, ऑडियो इनपुट, कतार, बाधा, दृश्य और स्पष्ट सत्र समाप्ति एक घटक में।

## कार्यान्वयन

1. एक Agent या प्रमाणित PCM bridge के साथ relay शुरू करें। KASAMILA_OUTPUT_MODE=transparent और पारदर्शी टेम्पलेट का packed-matte HLS लें; CSS opacity विकल्प नहीं है।

2. /public/studio.html में कमरा बनाकर अस्थायी URL कॉपी करें। OBS या Streamlabs Desktop के Browser Source में जोड़ें; ये वैकल्पिक होस्ट हैं।

3. Interact से Enable audio दबाएँ, फिर studio में Start करें। माइक्रोफ़ोन studio लेता है और सिर्फ़ उत्तर अवतार चलाता है। ब्राउज़र और डेस्कटॉप से वही ध्वनि दो बार कैप्चर न करें।

4. FIFO में चार पूर्ण फ़ाइलें, प्रत्येक अधिकतम 3 MiB और 30 सेकंड। Interrupt पुरानी कतार हटाता है। मनोरंजन, चैट, व्यापार और गेम एक होस्ट के लेआउट हैं। वैकल्पिक OBS WebSocket v5 वास्तविक Program Scene बदलता है; Streamlabs Desktop में वही RPC होने का दावा नहीं।

5. वैकल्पिक Streamlabs घटनाएँ संचालक समीक्षा के लिए सारांश हैं, दान संदेशों से स्वतः प्रॉम्प्ट या भाषण नहीं। छिपाने, निष्क्रिय करने, डिस्कनेक्ट या End से सत्र समाप्त; दोबारा दिखाने से बिलिंग स्वतः शुरू नहीं। पुष्टि देखें; मशीन विफल होने पर लीज़ समाप्ति लागू रहती है।

```bash
cd examples/realtime-integrations
npm ci
cp .env.example .env
# Backend-only configuration: see linked guide
npm start
```

## सीमाएँ और स्वीकृति

साझा होस्ट चार तैयार व्यापार उत्पाद नहीं है। Origin जाँच, कोटा और मॉडरेशन जोड़ें; वास्तविक पारदर्शिता, कतार, दृश्य परिवर्तन और समाप्ति जाँचें।

## कोड और प्रोटोकॉल

- [kasamila-dev / SDK 2.1.0](https://github.com/kasamila/kasamila-dev/tree/main/examples/realtime-integrations)
- [कोड और प्रोटोकॉल](https://github.com/kasamila/kasamila-dev/tree/main/examples/realtime-integrations/obs-streamlabs/README.en.md)
- [OBS Browser](https://github.com/obsproject/obs-browser)
- [Streamlabs Socket API](https://dev.streamlabs.com/docs/socket-api)

## Markdown / AI पठन

- [Markdown](https://www.kasamila.com/portal/content/blog/obs-kasamila-streamlabs-avatar-livestream.md?lang=hi)
- [HTML](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=hi)
- [JSON](https://www.kasamila.com/api/v1/portal/content/blog/obs-kasamila-streamlabs-avatar-livestream?locale=hi)

[zh](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=zh) | [en](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=en) | [fr](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=fr) | [de](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=de) | [ru](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ru) | [es](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=es) | [it](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=it) | [ar](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ar) | [ja](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ja) | [ko](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ko) | [th](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=th) | [ms](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=ms) | [vi](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=vi) | [hi](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=hi) | [id](https://www.kasamila.com/portal/blog/obs-kasamila-streamlabs-avatar-livestream?lang=id)
