# 上游合并指南（Upstream Merge Guide）

本仓库 `luanmuc/lx-music-mobile` 是 [lyswhut/lx-music-mobile](https://github.com/lyswhut/lx-music-mobile) 的定制 fork。
本文档说明如何把原版（上游）后续更新合并进来，以及冲突处理策略。

## 仓库关系

- 上游：`https://github.com/lyswhut/lx-music-mobile.git`（remote 名 `upstream`）
- 分叉点：`fb848072`（原版 v1.9.1，即原版当前最新）
- 定制基线：分叉点之上有 69+ 个定制提交（下载功能重写、内置音源、共存包、权限适配、默认设置预设等）

## 合并流程

```bash
# 1. 拉取上游最新代码
git fetch upstream master

# 2. 合并到本地 master
git merge upstream/master

# 3. 解决冲突（见下方策略），提交
git add .
git commit -m "merge: 合并上游更新"

# 4. 全量语法检查
# 483 个 TS/TSX 文件语法检查（无 node_modules 时用 typescript transpileModule 逐文件检查）

# 5. 推送触发云编译
git push origin master
```

## 高冲突区（本仓库深度定制的文件）

以下文件与原版差异大，合并时大概率冲突，**冲突时以本仓库为准**：

| 文件 | 说明 | 冲突处理 |
|---|---|---|
| `src/core/downloadManager.ts` | 本仓库全新编写（原版 v1.9.1 无下载管理器） | 以本仓库为准；原版新功能人工评估后手动移植 |
| `src/screens/Home/Views/Download/index.tsx` | 原版为半成品 `index.js`，本仓库重写 | 以本仓库为准 |
| `src/store/download/{state,action,hook}.ts` | 本仓库新建 | 以本仓库为准 |
| `src/components/OnlineList/QualitySelect.tsx` | 本仓库新建（完整音质选择） | 以本仓库为准 |
| `src/core/init/userApi/index.ts` | 内置音源自动导入（QuickJS 引擎 + assets 兜底） | 以本仓库为准 |
| `src/app.ts` | 启动权限分版本引导 | 以本仓库为准 |
| `src/utils/tools.ts` | 权限返回值语义（GRANTED→true / NEVER_ASK_AGAIN→null / 其他→false） | 以本仓库为准 |
| `src/config/constant.ts` | FileProvider authority、底部菜单含下载页、默认首页排行榜 | 以本仓库为准 |
| `src/config/defaultSetting.ts` | 按用户截图预设的默认值 | 以本仓库为准 |
| `android/app/src/main/...` | 原生模块（UtilsModule 分享/打开文件）、FileProvider 配置、图标、应用名 | 以本仓库为准，注意 `applicationId` 为 `com.luanmuc.lxmusic` |

## 一般文件冲突策略

- **UI/主题类**（screens 样式、components）：保持原版风格（用户明确要求 UI 与原版一致），只保留本仓库的功能性改动
- **播放器核心**（`src/core/player/*`）：功能逻辑以原版为准，冲突时逐个人工判断；本仓库仅在 `playInfo.ts` 有下载列表播放适配
- **音乐 SDK**（`src/utils/musicSdk/*`）：原版更新直接合入（未定制）
- **语言文件**：合入原版新增键，保留本仓库的 `nav_download` 等定制键

## 合并后必查清单

1. 全量语法检查 0 错误
2. `APP_PROVIDER_NAME`（constant.ts）与 AndroidManifest 的 `${applicationId}.provider`、原生 shareFile/openFile 传参一致
3. 内置音源兜底逻辑仍在（`has_imported_builtin_source` 标记 + 名称含「豆包定制」检测）
4. 权限三分支（<30 / 30-32 / >=33）未被上游覆盖
5. 下载列表播放（`getList('download')` 返回已完成任务）未被上游覆盖
6. package.json 的 author/homepage/bugs 仍指向 `luanmuc`

## 已适配的原版更新类型

- **版本升级**：原版发新 tag 时，合并后 bump 版本号，云编译自动发布新 tag
- **音源**：不依赖原版，每次云编译自动从 `luanmuc/lx-music-source` 拉取最新内置音源
- **依赖升级**：package.json 依赖随原版更新合入，云编译验证

---

## 定制功能清单（fork 特有）

| 功能 | 核心文件 | 说明 |
|---|---|---|
| 下载管理器（全新编写） | `src/core/downloadManager.ts` | 批量下载、暂停/继续/重试、并发控制、WiFi专属、自动重试、音频标签写入、分享/打开文件 |
| 下载页面 UI | `src/screens/Home/Views/Download/index.tsx` | 下载中/已完成分组、进度条、速度显示 |
| 下载状态管理 | `src/store/download/` | state + action + hook 三件套 |
| 音质选择弹窗 | `src/components/OnlineList/QualitySelect.tsx` | 下载前选择音质，只显示歌曲实际支持的音质 |
| 内置音源自动导入 | `src/core/init/userApi/index.ts` | CI 每次编译从 luanmuc/lx-music-source 拉取最新音源，启动时自动导入/更新 |
| 共存包 | `android/app/build.gradle` | applicationId = `com.luanmuc.lxmusic`，可与原版共存 |
| 权限分版本引导 | `src/app.ts` + `src/utils/tools.ts` | <10 普通存储 / 11-12 全文件访问 / ≥13 READ_MEDIA_AUDIO |
| 底部播放栏加高 | `src/components/player/PlayerBar/` | 封面60px、按钮52px、上下边距加大 |
| 上一曲按钮（竖屏） | `src/components/player/PlayerBar/components/ControlBtn.tsx` | 竖屏也显示上一曲（原版只有横屏显示） |
| 播放列表按钮（三横杠） | `src/screens/PlayDetail/*/CommentBtn.tsx` | 图标用 `menu`，点开后可选择播放歌曲 |
| 点击整列表播放 | `src/components/OnlineList/List.tsx` | `list.isClickPlayList` 默认 true，点击歌曲把整个列表设为临时播放列表 |
| 进度条默认不可拖动 | `src/config/defaultSetting.ts` | `common.allowProgressBarSeek` 默认 false，设置里可开 |

---

## 设置迁移规则（改默认值时必读）

**问题**：改了 `defaultSetting.ts` 的默认值后，老用户本地存的旧设置会覆盖新默认值，导致新功能不生效，必须清数据才行。

**正确流程**（每次改默认值都要做）：

1. 改 `src/config/defaultSetting.ts` 里的默认值
2. 把 `defaultSetting.version` 往上加一位（当前是 `2.1`，下次改默认值 → `2.2`）
3. 在 `src/config/migrateSetting.ts` 末尾加迁移块：
   ```ts
   if (compareVer(setting.version as string, '2.2') < 0) {
     setting['xxx.newSetting'] = true  // 强制覆盖老用户的旧值
   }
   ```
4. 这样老用户升级后自动应用新默认值，不需要清数据

**注意**：
- 新增的设置项（之前不存在的）不需要迁移，`mergeSetting` 会自动用默认值填充
- 迁移块只执行一次（版本号判断，迁移后版本号更新）
- 不要覆盖用户手动改过的设置——如果是产品行为变更必须强制改，就写进迁移块；如果只是新默认值给新用户用，就不用迁移

---

## 代码地图（快速定位）

| 要改什么 | 去哪里 |
|---|---|
| 新增底部菜单项 | `src/config/constant.ts` → `NAV_MENUS` |
| 修改默认设置 | `src/config/defaultSetting.ts` + 加迁移块 |
| 下载功能逻辑 | `src/core/downloadManager.ts` |
| 下载页面 UI | `src/screens/Home/Views/Download/index.tsx` |
| 播放栏 UI | `src/components/player/PlayerBar/` |
| 播放器核心逻辑 | `src/core/player/player.ts` |
| 在线列表点击行为 | `src/components/OnlineList/List.tsx` → `handlePress` |
| 音源 SDK（酷我等） | `src/utils/musicSdk/{kw,kg,mg,tx,wy,bd}/` |
| 内置音源导入 | `src/core/init/userApi/index.ts` |
| 权限请求 | `src/utils/tools.ts` → `requestStoragePermission` |
| 启动权限引导 | `src/app.ts` |
| 新增设置项 UI | `src/screens/Home/Views/Setting/settings/` |
| 国际化 | `src/lang/{zh-cn,zh-tw,en-us}.json` |
| Android 原生 | `android/app/src/main/` |
| CI 编译配置 | `.github/workflows/release.yml` |

---

## 多账号协作说明

本仓库由多个豆包账号共同开发。新账号接手时：

1. 先读本文件（`MERGE_GUIDE.md`）了解定制情况
2. 克隆后看 `git log --oneline -30` 了解最近改了什么
3. 改代码前先确认是否在「高冲突区」列表里
4. 改完默认值必须走「设置迁移规则」流程
5. 推送后 CI 自动编译，去 Actions 页面确认编译成功再通知用户
