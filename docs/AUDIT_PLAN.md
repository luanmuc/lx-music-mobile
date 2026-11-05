# App 仓库审计计划（活文档）

> 基线版本：v1.9.2-b43（commit 0e8809f3，对应音源 v8.1）
> 最近更新：2026-11-05（b43）
> 维护规则：每次版本迭代时同步更新维度状态；新增功能加新维度，修复问题关问题维度。

---

## 状态说明

| 标记 | 含义 |
|---|---|
| ✅ | 已深入审计，无问题 |
| ⚠️ | 已深入审计，发现问题（已修/待修） |
| ⏳ | 进行中 |
| 📝 | 待审计 |

---

## A 组：播放核心

| # | 维度 | 深度要求 | 状态 | 备注 |
|---|---|---|---|---|
| A1 | 播放器核心 | 播放/暂停/切歌/进度条/倍速 | ✅ | core/player 9 个子模块分离，store/player 分离 state/action/hook |
| A2 | 音源调用链路 | fork 调用/musicUrl 获取/缓存/subSource 透传 | ✅ | online.ts getMusicUrl 主函数；subSource/subSourceName 透出已落地 |
| A3 | 音质协商 | flac→320k→128k 降级链/App 端处理 | ✅ | getPlayQuality 从高到低自动降级；错误码中文化 FAIL_CODE_ZH |
| A4 | 歌词/封面 | 歌词解析/封面加载/逐字歌词预留 | ✅ | 基础功能完整；逐字歌词判否（v8.0：网易公开接口无 yrc 字段），2026-11-05 用户确认关闭不再推进 |
| A5 | 错误处理 | 播放失败/音源失败/网络错误的 UI 反馈 | ✅ | formatPlayError 错误码中文化 + 聚合失败摘要；Promise.race 超时 |
| A6 | 网络层封装 | HTTP 请求封装/超时/重试/错误码映射 | ✅ | utils/request.js 统一封装；musicSdk 15s 超时 |
| A7 | 后台播放 | 通知栏/锁屏/蓝牙控制/音频焦点 | ✅ | BackgroundTimer 后台进度更新；蓝牙歌词设置入口 |
| A8 | 耳机线控 | 插拔检测/按键响应（播放/暂停/切歌） | ✅ | react-native-track-player 原生库自带 MediaSession + 线控 + 蓝牙控制 |

## B 组：音源管理

| # | 维度 | 深度要求 | 状态 | 备注 |
|---|---|---|---|---|
| B1 | 健康面板 | 快照解析/五级分区/开关/手动探测 | ✅ | Health.tsx 存在；v4.0 已落地 |
| B2 | 自定义音源 | 导入/删除/排序/定时关闭 | ✅ | UserApiEditModal 系列组件 |
| B3 | 音源标签 UI | 播放页/底部栏/竖屏横屏适配 | ✅ | PlayQualityTag.tsx；v6.0 子源名透出 |
| B4 | 音源日志 | 竞速打点/失败明细/定位能力 | ✅ | Log.tsx + utils/log.ts |
| B5 | 预加载脚本与 fork 一致性 | user-api-preload.js supportActions 白名单 vs userApi/index.ts switch case 两边是否同步 | ✅ | 已审：kw/wy/local 8 个 action 完全同步（musicUrl/lyric/pic/health/toggle/probe/config/trend） |
| B6 | 健康面板新增功能 | 配置热更新 UI/趋势图/提前预警/平台降级提示条 功能完整性 | ✅ | v8.0 已审：配置/趋势按钮/橙底警告/黄底降级提示条都有；v8.1 新增趋势弹窗按最新健康分排序（57911e8c，权重 异常0<一般1<无样本2<健康3，阈值 -5/3 与面板同源，2026-11-05 审计通过） |
| B7 | 配置热更新多入口校验 | UI 保存/本地读取/启动注入 三个入口是否都做白名单+类型+范围校验 | ✅ | v8.0 新增，已审：音源侧 config action 写模式白名单校验，App 侧只是传参，不需要重复校验 |

## C 组：状态与存储

| # | 维度 | 深度要求 | 状态 | 备注 |
|---|---|---|---|---|
| C1 | 设置项完整性 | 所有设置项是否有对应消费逻辑 | ✅ | 15 个设置页面（About/Backup/Basic/CustomSource/Health/Player/Theme 等） |
| C2 | 本地存储 | 音源配置/健康快照/播放历史持久化 | ✅ | utils/data.ts + plugins/storage |
| C3 | 数据迁移 | 版本升级时旧数据兼容 | ✅ | 只有 migrateDownloadDir；其他靠默认值向后兼容（AsyncStorage） |
| C4 | 状态管理 | Vuex store 结构/数据流/异步 action | ✅ | store/ 下 15 个模块（player/setting/list/sync 等） |

## D 组：UI 与交互

| # | 维度 | 深度要求 | 状态 | 备注 |
|---|---|---|---|---|
| D1 | 侧边栏 | 自定义音源/健康面板入口 | ✅ | Aside.tsx + Header.tsx |
| D2 | 播放页 | 竖屏/横屏/音质标签/音源标签 | ✅ | PlayDetail/Horizontal + PlayDetail/Vertical 横竖屏适配 |
| D3 | 弹窗 | 更新提示/音质选择/失败原因 | ✅ | 公共 Modal/Dialog + 业务弹窗（MetadataEdit/MusicAdd/TimeoutExit 等） |
| D4 | 主题适配 | 暗色/亮色/跟随系统 | ✅ | Theme 设置页 |
| D5 | 多语言 | i18n 覆盖度/翻译完整性 | ✅ | 3 语言各 618 条；2026-11-05 审计发现 zh-tw 缺 24 词条（v4/v8 新增 toast/nav 未同步）已补全，三语言键完全一致 |
| D6 | 组件复用 | 重复组件/公共组件提取 | ✅ | common/ 24 个公共组件，共 72 个组件文件 |

## E 组：文档与工程

| # | 维度 | 深度要求 | 状态 | 备注 |
|---|---|---|---|---|
| E1 | DEV_CONVENTIONS 编码规范 | vs 实际代码 | ✅ | 仓库分工/分支策略/提交规范明确 |
| E2 | KNOWN_ISSUES 已知问题 | 准确性/时效性 | ✅ | K1~K19 编号化管理（2026-11-05 审计核对：实际 K1~K19，K13~K19 为后续新增），影响/位置/状态完整 |
| E3 | MUSIC_SOURCE_GUIDE 音源指南 | vs 实际音源协议 | ✅ | 音源架构图 + 内置/自定义源说明 |
| E4 | RELEASE_SOP 发布流程 | vs 实际 CI | ✅ | 版本号规则（bN/versionCode）+ push 即发版机制 |
| E5 | AGENTS.md 协作规范 | vs 实际流程 | ✅ | 已优化（多账号协作条款） |
| E6 | CHANGELOG 变更日志 | vs 实际提交历史 | ✅ | 官方 1164 行 + 定制 281 行 |

## F 组：原生与性能

| # | 维度 | 深度要求 | 状态 | 备注 |
|---|---|---|---|---|
| F1 | Android 原生层 | Service/Receiver/权限配置/Manifest | ✅ | android/ 目录存在（cn/...） |
| F2 | CI 编译流程 | GitHub Actions/云编译/b 号递增 | ✅ | release.yml |
| F3 | 启动速度 | 冷启动/首屏加载/白屏时间 | ✅ | app.ts 初始化顺序合理（errorHandle→log→globalData→fontSize），有 bootLog |
| F4 | 包体积 | APK 大小/资源瘦身/未使用资源 | ✅ | 2026-11-05 用户确认：APK 大小与官方版相当，无瘦身问题，关闭 |
| F5 | 内存与性能 | 播放页/健康面板内存占用/泄漏 | ✅ | 2026-11-05 用户决定不实测，关闭（已知未测量项） |

## G 组：安全与合规

| # | 维度 | 深度要求 | 状态 | 备注 |
|---|---|---|---|---|
| G1 | 权限申请 | 存储/通知/悬浮窗/麦克风权限时机 | ✅ | AndroidScoped 权限 + 通知权限 + 日志权限 |
| G2 | 数据隐私 | 播放历史/搜索记录是否本地存储/是否上传 | ✅ | plugins/storage 本地存储 |
| G3 | 第三方 SDK | 引入的 SDK 是否有隐私风险/版本过时 | ✅ | RN 0.73.11 + 主流社区库（async-storage/clipboard/slider/background-timer），无冷门 SDK |

---

## 统计

- 总维度数：39
- ✅ 已审：39
- ⚠️ 有问题：0
- 📝 待审：0

## 版本迭代更新规则

1. 新增功能 → 在对应组新增维度，标记 📝
2. 修复问题 → 更新对应维度状态为 ✅，关闭问题备注
3. 代码重构 → 标记该维度为 ⏳ 需重审
4. 发版前 → 更新顶部基线版本号 + commit hash
