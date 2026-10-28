# 内置音源指南（MUSIC SOURCE GUIDE）

本仓库的音源体系 = **六大官方平台 SDK（内置）+ 自定义源（QuickJS 脚本）**。定制版的核心差异在于内置了「豆包定制」聚合音源。

## 一、音源架构

```
musicSdk（内置官方源）  ──┐
  kw/kg/mg/tx/wy/bd/xm  │  统一接口：getMusicUrl / getLyric / getPic
                         ├─→  apis 对象（global.lx.apis）
自定义源（QuickJS 脚本）──┘   qualitys（global.lx.qualityList）
  assets/builtin_source.js   ↑
  （豆包定制聚合源）        core/music/* 通过 apis 调用，不区分来源
```

- **官方源**：`src/utils/musicSdk/{kw,kg,mg,tx,wy,bd,xm}/`，直接请求平台公开接口，随上游更新
- **自定义源**：JS 脚本在 QuickJS 线程执行（`android/.../userApi/`），与 RN 通过 `onScriptAction/sendAction` 双向通信
- **聚合源**：内置 `assets/builtin_source.js` = 「豆包定制[聚合音源]」，由**独立仓库** `luanmuc/lx-music-source` 维护

## 二、内置音源的发布链路（重要）

1. **CI 拉取**：`.github/workflows/release.yml` 每次构建时，通过 GitHub Contents API 从 `luanmuc/lx-music-source` 拉取最新脚本 → 覆盖 `assets/builtin_source.js`
2. **校验**：文件 >50KB 且包含 `@name` 声明才通过，防止拉取到损坏文件
3. **启动导入**：App 启动时 `core/init/userApi/index.ts` 读取内置脚本，与已导入版本比对（正则提取 `聚合音源 vX.Y`），版本更新则自动导入/替换，并清理旧版（含历史 bug 残留的多份「豆包定制」源）
4. **运行时**：音源脚本在 QuickJS 中运行，向 App 注册 `musicUrl/lyric/pic` 等 actions，App 侧统一调用

> ⚠️ **禁止在本仓库直接改 `assets/builtin_source.js`**：它每次构建都会被覆盖。改音源请到 [luanmuc/lx-music-source](https://github.com/luanmuc/lx-music-source)。

## 三、自定义源脚本契约（QuickJS）

音源脚本需要声明：

| 声明 | 说明 |
|---|---|
| `name` | 音源名称（含「豆包定制」会被内置导入逻辑识别/清理） |
| `version` | 版本号（`vX.Y` 格式，用于启动时版本比对） |
| `actions` | 提供的接口：`musicUrl`（取播放链接）、`lyric`（歌词）、`pic`（封面） |
| `qualitys` | 该源支持的音质列表（映射到 App 的 `FULL_QUALITYS_LIST`） |
| `onScriptAction` | 处理 App 请求，返回 Promise 结果 |

脚本内可调用 App 提供的 `request`（HTTP 请求，带 UA/防爬头）、`logInfo` 等能力。

App 侧入口：`src/core/init/userApi/index.ts`；原生 QuickJS 引擎：`android/app/src/main/java/cn/toside/music/mobile/userApi/`。

## 四、聚合源内部结构（豆包定制 v11.11）

当前内置聚合源含多个后端，按需路由与降级：

- 后端：溯音酷我 / 星海 / 酷我官方 / 长青 / 念心 / 网易云 outer / GDAPI 等
- 特性：音质校验（探测歌曲实际可用音质）、双音质分域探测、探测歌曲池轮换、失败兜底降级、URL 有效期处理
- 音质优先级：`flac24bit → flac → wav → ape → 320k → 192k → 128k`（与 App 端 `core/music/utils.ts` 的 `FULL_QUALITYS_LIST` 对齐）

## 五、如何测试音源

1. **本地替换**：手动用最新脚本覆盖 `assets/builtin_source.js`，`npm run dev` 跑 debug 包
2. **看日志**：设置 → 开启调试日志；或 `adb logcat | grep -i userApi`
3. **验证项**：搜索正常？播放返回的 URL 能播？音质降级链正确？歌词/封面正常？
4. **发布**：推到 `luanmuc/lx-music-source`，下次云编译自动带入

## 六、音源相关 FAQ

- **为什么音源不放在本仓库**：音源迭代频繁、与 App 发版解耦；App 每次构建自动拉最新，音源修复当天即可随新构建生效
- **为什么 App 里有多份「豆包定制」**：历史 bug 曾导致重复导入，当前版本启动时会自动清理旧的多余源
- **某首歌没音质可选**：聚合源对该歌探测到的实际音质有限，属正常；选择更低的音质即可
