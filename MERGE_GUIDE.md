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
