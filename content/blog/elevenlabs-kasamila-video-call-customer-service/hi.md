---
title: "ElevenLabs + Kasamila: एक ऑडियो पथ से आवाज़ और दृश्य वाला वीडियो ग्राहक समर्थन"
summary: "मौजूदा ElevenLabs Agent रखें और दिखने वाला अवतार जोड़ें; वही उत्तर ऑडियो प्लेबैक और मुँह की गति चलाता है।"
lang: hi
slug: elevenlabs-kasamila-video-call-customer-service
---

# ElevenLabs + Kasamila: एक ऑडियो पथ से आवाज़ और दृश्य वाला वीडियो ग्राहक समर्थन

मौजूदा ElevenLabs Agent रखें और दिखने वाला अवतार जोड़ें; वही उत्तर ऑडियो प्लेबैक और मुँह की गति चलाता है।

## कार्यान्वयन

1. मौजूदा Agent में ज्ञान आधार, सेवा निर्देश, अधिकृत टूल और मानव सहायता का मार्ग रखें। अवतार व्यावसायिक तर्क का विकल्प नहीं है।

2. npm ci चलाएँ और .env.example को .env में कॉपी करें। PROVIDER=elevenlabs, ELEVENLABS_API_KEY, ELEVENLABS_AGENT_ID तथा Kasamila सेटिंग और मेल खाता मीडिया विवरण केवल सर्वर पर रखें। इनपुट और आउटपुट PCM चुनें।

3. npm start के बाद /public/video-call.html खोलें। Start ऑडियो सक्रिय करता और माइक्रोफ़ोन अनुमति माँगता है। सर्वर हस्ताक्षरित ElevenLabs URL लेता है; वह URL और स्थायी कुंजियाँ ब्राउज़र में नहीं जातीं।

4. माइक्रोफ़ोन केवल Agent को जाता है। वास्तविक उत्तर PCM को वही Kasamila SDK बजाता और मुँह चलाता है; दूसरा प्लेयर न जोड़ें। वैकल्पिक कैमरा स्थानीय पूर्वावलोकन है, पूर्ण मानव WebRTC कॉल या PSTN सेवा नहीं।

5. बीच में बोलने से पुराना प्लेबैक हटता है। कतार हाथ से साफ़ करना दूर की जनरेशन रोकने की गारंटी नहीं। End कनेक्शन बंद करता, अवतार destroy करता और अधिकृत Runtime समाप्ति माँगता है। मौन बिलिंग नहीं रोकता; पुष्टि देखें।

```bash
cd examples/realtime-integrations
npm ci
cp .env.example .env
# Backend-only configuration: see linked guide
npm start
```

## सीमाएँ और स्वीकृति

चलने वाला उदाहरण प्रदाता प्रमाणन या ध्वनिम सटीकता की गारंटी नहीं है। लॉगिन, अनुमति, सहमति और HTTPS/WSS जोड़ें; वास्तविक बातचीत और बाधा जाँचें।

## कोड और प्रोटोकॉल

- [kasamila-dev / SDK 2.1.0](https://github.com/kasamila/kasamila-dev/tree/main/examples/realtime-integrations)
- [कोड और प्रोटोकॉल](https://github.com/kasamila/kasamila-dev/tree/main/examples/realtime-integrations/voice-platforms/README.en.md)
- [ElevenLabs WebSocket](https://elevenlabs.io/docs/eleven-agents/api-reference/eleven-agents/websocket)

## Markdown / AI पठन

- [Markdown](https://www.kasamila.com/portal/content/blog/elevenlabs-kasamila-video-call-customer-service.md?lang=hi)
- [HTML](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=hi)
- [JSON](https://www.kasamila.com/api/v1/portal/content/blog/elevenlabs-kasamila-video-call-customer-service?locale=hi)

[zh](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=zh) | [en](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=en) | [fr](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=fr) | [de](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=de) | [ru](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ru) | [es](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=es) | [it](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=it) | [ar](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ar) | [ja](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ja) | [ko](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ko) | [th](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=th) | [ms](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=ms) | [vi](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=vi) | [hi](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=hi) | [id](https://www.kasamila.com/portal/blog/elevenlabs-kasamila-video-call-customer-service?lang=id)
