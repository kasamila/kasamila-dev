[English](integration-examples.en.md) | [简体中文](integration-examples.md)

# Kasamila 集成样例

这是公开的样例导航。登录前后使用同一份文档、博客和版本公告；Workspace 管理个人模板、Key、额度与使用记录。

## 已提供的可运行样例

- [浏览器几何模型 Runtime 样例](https://www.kasamila.com/portal/docs/sample)：服务端授权、短期 Token、浏览器 SDK、模板媒体与声音输入。
- [PCM / RTC 音频桥接底座](https://www.kasamila.com/portal/docs/audio-bridge)：可复用的远端音频输入、PCM缓冲和会话结束示例；不是四类供应商的完整适配器。
- [通用 API/SDK 接入](https://www.kasamila.com/portal/docs/runtime)
- [几何模型与媒体接入](https://www.kasamila.com/portal/docs/geometry)
- [并发配额与 Key 管理](https://www.kasamila.com/portal/docs/concurrency)
- [第三方升级指南](https://www.kasamila.com/portal/docs/third-party)

## 公开 GitHub 仓库

[kasamila/kasamila-dev](https://github.com/kasamila/kasamila-dev) 是公开文档、API/SDK 更新说明、接入样例与平台集成的统一发布入口。系统核心仍在私有仓库维护。

Gemini Realtime、GPT Live、LiveKit、Pipecat 等完整适配器属于后续计划；目前提供通用音频桥接底座，不宣称这些平台适配器已经实现或验证。

每个样例应提供 README、依赖版本、环境变量示例、启动步骤、音频格式与时钟说明、会话结束及计费说明、错误处理、许可证和最近验证日期。真实永久 Key、供应商凭据和个人模板不得进入公开仓库。

## 内容更新约定

样例仓库保存可运行代码；本站文档解释接入流程；博客讲解应用实践；版本公告说明兼容性、验证版本和升级步骤。四者互相链接，不复制维护多套指南。

本站预览免费；第三方 API/SDK Runtime 按实际运行时长计费。样例应显式结束不再使用的 Runtime 会话。
