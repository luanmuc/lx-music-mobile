# 已知缺陷与限制（KNOWN ISSUES）

> 编号化管理已知问题，改代码前先查此表；新增/修复时更新状态。
> 格式借鉴 `lx-music-source` 的 D 系列缺陷表：**编号 + 影响 + 位置 + 状态**。

| # | 缺陷/限制 | 影响 | 位置 | 状态 |
|---|---|---|---|---|
| K1 | **下载无断点续传**：暂停后重新从头下载，`.part` 残件直接删除 | 大文件/弱网下载体验差 | `core/downloadManager.ts` | ⬜ 待实现（扩展方案见 [DOWNLOAD_DESIGN.md](./DOWNLOAD_DESIGN.md) 第九节） |
| K2 | **进度条默认不可拖**（定制默认值） | 与部分用户习惯不一致 | `config/defaultSetting.ts` | ✅ 默认设计（用户可在设置中开启） |
| K3 | **flac24bit 默认优先**，但多数音源不支持该音质，依赖降级链 | 高音质偏好用户实际拿到 flac/320k | `config/defaultSetting.ts` + 音质链 | ✅ 降级机制兜底（flac24bit→flac→wav→ape→320k→192k→128k） |
| K4 | **与上游 lyswhut 分叉**（fork 点 `fb848072`；已合并至 v1.9.2），v1.9.2 之后的新功能/修复未跟踪 | 原版后续改进缺失 | 全仓库 | 🟡 已合并 v1.9.2（v1.9.2-b1），后续差异由 [UPSTREAM_LIFECYCLE.md](./UPSTREAM_LIFECYCLE.md) 管理 |
| K5 | **track-player fork 定制依赖**：通知栏按钮等改动基于 `luanmuc/react-native-track-player` 的 commit `001e2dd`（b80 自 `0f0acb4` 升级，重放上游 `d76fe8f`——注释 gapless 要求，增强音频卸载兼容性） | 上游升级需重新应用定制补丁，升级阻塞 | `package.json` + 原生层 | 🟡 观察中（b80 已执行第二次升级；下次升级仍需重放补丁，见 UPSTREAM_LIFECYCLE） |
| K6 | **内置音源由构建生成**：本仓库不内置 `assets/builtin_source.js` 静态副本（b74 起移除），每次构建 CI 从音源仓库 master 拉取最新生成；本地改同名文件会被覆盖 | 本地调试需手动放置最新脚本 | `assets/builtin_source.js`（构建生成） | ✅ 设计如此（音源唯一权威 = `luanmuc/lx-music-source`，见 [MUSIC_SOURCE_GUIDE.md](./MUSIC_SOURCE_GUIDE.md)） |
| K7 | **音源依赖第三方接口**：部分平台接口不稳/IP 封禁（酷我 CDN 系、溯音咪咕） | 个别平台播放失败 | 音源仓库 `lx-source.js` | 🟡 跟踪中（音源仓库缺陷表 D 系列 + 健康探测自愈；mg 真源恢复已判否（音源 v26 系列实证），走跨平台兜底） |
| K8 | **公共目录写入依赖"所有文件访问"授权**：各 ROM 判定口径不一（部分设备授权后仍判定失败） | 日志/下载公共目录不可写 | `utils/log.ts` + 下载权限矩阵 | ✅ b71 双通道根治：公共目录可用→写公共；不可用→自动降级应用私有目录（日志永不丢弃）；下载仍需公共目录时保留引导弹窗（见 [DOWNLOAD_DESIGN.md](./DOWNLOAD_DESIGN.md) 第六节） |
| K9 | **播放页音源标签不显示子源名**（历史多轮修复未达根因层） | 播放页只显示平台名（「酷我音乐」），不显示「· 溯音酷我」 | `user-api-preload.js`（b72）+ `core/music/index.ts`（b73） | ✅ b72/b73 修复（VM 桥 preload 丢 subSource + index.ts 丢 onSource，两处透传补齐）；回归用例已入音源 v26.3（冒烟覆盖） |
| K10 | **播放卡死**：`Property 'logger' doesn't exist`（logger 导入链断裂） | 所有在线歌点播后播放栏 00:00 卡死 | `core/player/player.ts` | ✅ b71 修复（`import { logger } from '@/utils/logger'`） |
| K11 | **日志权限误判**：系统「所有文件访问」判定与真实写能力不一致 → 反复提示去开启 | 有权限仍提示；无日志可看 | `utils/log.ts` | ✅ b71 双通道根治（真实写测试为准 + 私有目录兜底 + 移除强制提示） |
| K12 | **音频卸载默认关闭**（同步上游 v1.9.2 `025d7822`/`b3afb18c`）：默认值 `true→false`，设置版本 2.2→2.3，老用户升级自动关闭 | 部分设备卸载模式异常（杂音/播放失败）的历史问题缓解；个别省电敏感用户需手动重开 | `config/defaultSetting.ts` + `config/setting.ts`（v2.3 迁移） | ✅ 默认设计（跟随上游方案 A，用户可在设置中手动开启） |
| K13 | **逐字歌词未实现**：App 端无 yrc/ylrc 逐字歌词解析能力，只能显示逐行滚动歌词 | 高音质偏好用户期待逐字歌词体验缺失 | `core/lyric.ts`（仅逐行） | ⬜ 待实现（v29.1 计划，见 ITERATION_ROADMAP） |
| K14 | **健康面板 error 残留**：首次加载时音源未就绪误报"未检测到支持健康查询的音源"，后续静默轮询成功后 error 不自动清除 | 有数据但仍显示错误提示，误导用户 | `Health.tsx` loadHealth | ✅ 修复（2026-11-04：所有成功路径都 setError('') 清空） |
| K15 | **静默轮询失败打扰用户**：每 30 秒后台刷新失败就弹错误提示 | 用户正在看页面，突然弹出错误，体验差 | `Health.tsx` loadHealth | ✅ 修复（2026-11-04：silent 模式下不 setError、不 setSnapshot(null)） |
| K16 | **平台降级提示条显示英文 ID**：wy/kw/tx/mg/kg 没翻译成中文，用户看不懂 | 提示条显示"⚠ wy 平台级降级"，不直观 | `Health.tsx` 平台降级条 | ✅ 修复（2026-11-04：加 PLATFORM_NAMES 映射，显示"网易/酷我/QQ/咪咕/酷狗"） |
| K17 | **预加载脚本 supportActions 白名单过滤新 action**：音源侧新增 config/trend action 后，预加载脚本的白名单只有 6 个 action，把新 action 过滤掉了 | 音源传了 8 个 action，App 端只收到 6 个，配置/趋势按钮不生效 | `android/app/src/main/assets/script/user-api-preload.js` supportActions | ✅ 修复（2026-11-04 b19：白名单加 config/trend） |
| K18 | **预加载脚本 handleRequest 缺 config/trend case**：白名单放行后，handleRequest 的 switch 也没处理这两个 action，result 是 undefined | 点配置/趋势按钮报错 "Cannot read property 'data' of undefined" | `android/app/src/main/assets/script/user-api-preload.js` handleRequest switch | ✅ 修复（2026-11-04 b20：加 config/trend case，统一返回 `{ source, action, data: response }`） |
| K19 | **配置/趋势弹窗背景透明**：modalContent 用 `theme['c-bg-1']` 动态背景色，实际渲染透明，能看到后面的健康面板内容 | 弹窗内容叠在健康面板上面，没有白色背景和遮罩 | `Health.tsx` modalContent 样式 | ✅ 修复（2026-11-04 b20：改为明确 `backgroundColor: '#fff'` + `width: '100%'`） |

## 维护规则

- 新发现缺陷：追加编号（K9、K10…），写明影响与位置，状态默认 ⬜；
- 修复后：状态改 ✅，在 `CUSTOM_CHANGELOG.md` 顶部补记，如涉及文档同步更新；
- 长期跟踪项：状态 🟡，链接到对应管理文档（UPSTREAM_LIFECYCLE / MUSIC_SOURCE_GUIDE / DOWNLOAD_DESIGN）。
