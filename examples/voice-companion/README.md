# Kasamila 语音伴侣（浏览器扩展预览版）

Chrome / Edge 桌面浏览器 116+，Manifest V3。用户选择一个普通 HTTP(S) 标签页后，该页播放的声音驱动 Kasamila 数字人。不限定 ChatGPT；网页朗读、AI 语音回复和其他可捕获音频都可使用。提示音和音乐也会被捕获，扩展不识别“哪段是 AI 回复”。受保护媒体、浏览器内部页面和手机浏览器不在首版支持范围内。

## 安装与使用

1. 在 `chrome://extensions` 或 `edge://extensions` 开启开发者模式，选择“加载已解压的扩展程序”，选择此目录下的 `extension` 文件夹。
2. 将扩展固定到工具栏，在有声音的目标网页点击 Kasamila 图标。也可以使用 `Alt+Shift+K`（快捷键冲突时可在浏览器扩展快捷键设置中调整）。
3. 侧栏选择数字人，阅读并勾选音频处理同意，点击“启用数字人”。原网页的麦克风和对话操作照常使用。
4. `↗` 打开独立小窗，需要在新窗口重新启用数字人。小窗不是系统级置顶窗口。
5. 点击停止、关闭最后一个伴侣窗口、关闭/刷新来源标签页，会停止捕获。会话使用 Admin 配置的时间上限，到时需再次点击目标网页扩展图标并启用。

本包是手动加载的演示版，尚未在 Chrome Web Store / Edge Add-ons 发布或通过审核。发布商店前应完成各平台审核、用户数据披露、打断/回声/长时间使用和实际网站兼容性验证。

## 架构与权限

`选定标签页 → tabCapture → offscreen AudioWorklet → 16kHz PCM16 → 扩展侧栏 → Kasamila 同源嵌套页面 → 现有 SDK`

扩展只请求 `activeTab`、`tabCapture`、`offscreen` 和 `sidePanel`。没有内容脚本、麦克风权限、全站访问权限、远程扩展脚本或持久音频存储。捕获恢复一次原声播放，数字人的 `playback:false` 防止双声。音频包为 40ms，传输最多允许 8 个未确认包；处理停滞会停止，不堆积旧回复。来源页面导航会停止捕获。

远程 Kasamila 页面运行在独立网页 iframe 中；扩展只接受来自固定 Kasamila Origin 和对应 iframe 的有限状态/确认消息，不执行其脚本指令。内层同源 iframe 兼容已发布 SDK 的父窗口访问。Runtime Token 和供应商凭据不通过扩展消息桥传递。捕获本身并不读取 ChatGPT 或其他网站的账号、密钥、对话文字或内部接口。

## 后端与 Admin

演示默认连接 `https://kasamila.com/portal/apps/companion/embed`。这是 Kasamila 托管的公开演示服务，不是随扩展附带的无限免费推理。它受管理员开关、公开数字人选择、每次时长、并发、IP 频率和推理额度约束。

Admin → 应用演示管理：配置现有专用 Runtime Key、启用应用演示及语音伴侣，再发布数字人并勾选“用于语音伴侣”。无需 Qwen/OpenAI 等语音通道。数字人名称和形象来自 Admin，音色、人设和回复内容由源网站决定；本应用不能给第三方网页增加内容护栏。

Portal 通过现有 Runtime 服务签发官网 Origin 的短期 `ks_rt_` Token，不为任意源网站添加域名白名单。独立心跳使用 `/portal/apps/socket` 的 `kind:companion` 分支，不连接任何语音模型。连接断开、35 秒无心跳或会话到期会释放 Runtime。

自行托管需要实现同等会话签发、配额、Origin 校验、断开清理与嵌入响应头。修改扩展中的固定站点地址和 CSP 只能指向你信任的服务；**不要把永久 API Key 写进扩展或网页**。Portal 实现位于主项目 `kasamila_api/modules/portal/companion.py` 和 `web/portal/companion*`，SDK/API 无需修改。

## 验证范围

自动化验证涵盖真实 Chrome 标签页捕获、44.1/48kHz 重采样、跨帧 PCM、停止清理、来源导航/关闭、限长队列、同意和 Origin 边界，以及 15 种语言。浏览器测试使用合成音频与 SDK fixture，实际托管 Runtime 验证另行记录。没有逐个验证所有第三方网站，不保证完全无延迟；首版保持原声即时播放，口型会有捕获和推理延迟。
