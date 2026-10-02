[简体中文](README.md) | [English](README.en.md)

# OBS 浏览器源 + Streamlabs：可嵌入的数字人主持组件

面向直播工具商、插件开发商、互动直播服务商。同一个 AvatarHost 提供透明画面、麦克风输入、有界 FIFO 播放队列、打断、四种场景布局及明确结束会话。娱乐、聊天、电商、游戏共用底层，不开发四套重复产品。

## 设置步骤

1. 按 [语音平台指南](../voice-platforms/README.md) 启动共享 relay，选择一个语音 Agent，或使用已有认证 PCM bridge。
2. 配置 KASAMILA_OUTPUT_MODE=transparent，使用实际支持透明输出模板的 canonical **packed-matte HLS** 描述符。普通视频加 CSS 透明度或色键不等价；SDK 的 transparentCanvas 必须实际为 true。
3. 普通浏览器打开 `http://127.0.0.1:8790/public/studio.html`，创建房间。此时不创建计费 Runtime；复制有效十分钟的显示授权 URL。
4. OBS 的“来源→浏览器”粘贴 URL，例如设置 1920×1080，保留透明背景，开启“通过 OBS 控制音频”。Streamlabs Desktop 使用自己的 Browser Source 加载相同 URL。二者是可替换的宿主，不要求同时运行两个直播软件。
5. 使用浏览器源“交互 / Interact”点击 Enable audio，先解锁 CEF 声音。保持控制台开启，确认画面已连接、声音解锁后才 Start。
6. 控制台需要声音输入时允许麦克风。用户声音经房间送到所选语音 Agent，只有 Agent 回复进入数字人。OBS 内嵌浏览器不必申请麦克风。用耳机，避免浏览器音频和桌面音频重复捕获同一声音。

## 队列、打断与场景

最多排四个完整文件，每个不超过 3 MiB、30 秒、8–48k。decodeAudioData 只解码完整文件，不把任意网络 MP3/WebM 片段冒充流式解码；下混成单声道 PCM16 后进入同一播放器。播预录队列时关闭 Agent 麦克风输入；同时到达的 Agent 回复与文件会共享并可能交错同一声音入口。

PCM 待播上限五秒，溢出拒绝继续。文件按提交顺序播放，不因解码速度差异乱序。Interrupt 立即废弃旧文件、旧 PCM，不排在旧声音后面。手动清队列不等于所有上游平台停止生成或计费，详见语音指南。

娱乐 / 聊天 / 电商 / 游戏按钮切换组件布局，不另建 Runtime；不包含独立购物车、游戏规则或业务审核系统。

实际切换 **OBS Program Scene** 是可选 OBS WebSocket v5 功能：OBS 工具中开启 WebSocket，在服务端配置 OBS_WS_URL=ws://127.0.0.1:4455 与 OBS_WS_PASSWORD，控制台填写精确场景名。只允许回环地址；此 RPC 属于 OBS，不冒称 Streamlabs Desktop 具备同一控制 API。

来源隐藏、停用、断连、控制台断连、离页都会触发结束；重新显示不自动重启计费。需要跨场景连续主持时，保持单个来源实例可见并切换组件布局。保守结束策略可能中断转场，应在实际来源生命周期配置中验收。

## Streamlabs 告警与 OBS 插件

Browser Source 无需 Streamlabs Token。需要接收告警时，使用用户已授权 socket.token scope 的 STREAMLABS_SOCKET_TOKEN，仅放服务端；官方 Socket API 的事件摘要进入控制台。离线合成捐赠按钮便于不登录测试。

事件只是待人工审核的提示，不能自动播报或塞进 Agent/system 指令。示例不传捐赠正文、金额和私有 ID。操作员可编辑后送给 Dify；其他 Agent 需先接入各自支持的文本输入接口。本控制不是完整安全认证，仍须业务审核。不要让打赏文字自动变成提示词注入。

OBS 用户可以另装官方 Streamlabs Plugin for OBS 用于告警/组件。插件与 Streamlabs Desktop 是不同产品，示例不打包它们、不自动申请账号权限。Socket API 使用 Socket.IO v2 / Engine.IO v3；样例用固定官方端点的最小 WebSocket 接收器处理根 namespace JSON 告警、握手、心跳和断连，不替代通用 Socket.IO SDK，也不保留旧通用客户端依赖。发布前仍需验收实际服务兼容性。

## 嵌入与结束计费

生成的显示 URL 可用于授权 Browser Source / iframe。控制端和画面端权限分离，使用内存中的随机临时能力值，有效十分钟，不是永久 API Key；尤其控制 Key 必须保密。生产发放需登录、用户授权、Origin 校验、HTTPS/WSS、配额，不得把这个回环演示用未认证公网隧道暴露出去。

控制仅接受 start、mic、input_end、file、interrupt、scene、announcement、end；画面只能回传状态，不能控制其他房间。初始化预留防止重复启动。End 关闭语音链路、清空声音、destroy SDK 并调用授权的 Runtime 结束接口。stop、静音、隐藏像素、停止直播本身都不保证停止计费。检查结束确认；失败时通过授权控制接口终止，机器突然断电仍依赖租约到期。

## 验收

先跑 npm test，再用真实账户与 OBS/Streamlabs CEF 验证：两种背景上真正透明、只播放一次声音、队列顺序与尾音、多次抢话、麦克风拒绝、隐藏重显不自动重启、启动中断连、明确结束确认、新授权重连、媒体链接过期、长时间直播和移动控制台。离线测试不等于已完成付费平台或真实直播环境认证。

官方协议链接与审核日期见 [English references](README.en.md#acceptance-checklist)。
