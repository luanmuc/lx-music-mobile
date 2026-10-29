# 发布 SOP（Release SOP）

本仓库采用 **push 即发版** 的云编译模式：任何对 `master` 的推送（`publish/**`、`npm-version-info/**` 除外）都会触发 GitHub Actions 自动编译并发布新版本。

## 一、版本号规则（必读）

| 项 | 值 | 说明 |
|---|---|---|
| `package.json` 的 `version` | **恒为 `1.9.1`** | 由 CI 注入构建号，**禁止手改** |
| 发布版本名 | `1.9.1-bN` | `N` = GitHub Actions run number（`GITHUB_RUN_NUMBER`），自动递增 |
| `versionCode` | `80 + N` | `android/app/build.gradle` 从环境变量读取 |
| Release tag | `v1.9.1-bN` | 每次构建唯一，prerelease 标记 |
| 内置音源 | 每次构建自动拉取 | 来自 `luanmuc/lx-music-source` 最新版（`?ref=master`），与代码解耦；**仓库不内置音源副本**，由构建生成 `assets/builtin_source.js` |

> 为什么禁止手改 version：`package.json` 的 version 不参与实际版本判定，改它会导致版本信息混乱（`buildNumber.ts` 与 `process.versions.app` 由 CI 注入）。要发版只需 push 代码。

## 二、发布流程（CI 自动执行）

```
push master（paths-ignore: publish/**、npm-version-info/**）
  └─ Job Android
      ├─ 拉最新内置音源（GitHub Contents API ?ref=master → 生成 assets/builtin_source.js，>50KB + @name 校验；仓库不内置副本）
      ├─ 注入 APP_VERSION_NAME=1.9.1-b<run>、versionCode=80+run、buildNumber.ts
      └─ ./gradlew assembleRelease → 5 个 ABI APK → upload-artifact
  └─ Job Release（needs: Android）
      ├─ 生成发布说明（scripts/gen_change_log.py：git log 自动生成本次变更 + APK MD5）
      ├─ softprops/action-gh-release：创建 tag v1.9.1-b<run>，上传 APK
      ├─ 更新 publish/version.json（版本+描述+最近历史）
      ├─ 更新并发布 npm 版本信息包（luanmuc-lx-music-version-info）
      └─ 提交 version.json + npm-version-info/package.json 回 master（不再触发构建）
```

## 三、发布前测试清单（改动核心代码时必做）

> 与 AGENTS.md「实证开发流程」配套：先过 L0-L4 验证链，push 前逐项自查。

1. **语法**：`node scripts/check_ts_syntax.js` 0 错误（508 个 TS/TSX）
2. **设置迁移**：若改默认值，确认已走迁移机制（见 MERGE_GUIDE），本地清 App 数据模拟老用户验证迁移生效
3. **播放**：URL 刷新不卡死、切换音源、下载列表播放、通知栏歌词/按钮
4. **下载**：并发任务、暂停/恢复、失败自动重试、仅 WiFi 开关、音质降级链、标签写入、下载目录权限
5. **音源**：搜索、播放 URL 可播、音质降级、歌词/封面、健康探测
6. **权限**：Android <10 存储权限引导、11-12 全文件访问引导、≥13 READ_MEDIA_AUDIO
7. **更新**：多源版本检查、`bN` 版本号比较、启动自动更新
8. **回归**：原版核心功能抽查（播放列表/收藏/设置页/榜单）

## 四、发布后验证清单（每次推送后必查）

在 [Actions](https://github.com/luanmuc/lx-music-mobile/actions) 页面确认：

1. ✅ `Android` Job 编译成功（5 个 APK）
2. ✅ `Release` Job 全部步骤绿
3. ✅ 新 Release 已生成：tag `v1.9.1-bN`，发布说明 = 本次真实变更，包含 5 个 APK + MD5
4. ✅ `publish/version.json` 已更新并提交回 master（最新提交为 "chore: 更新版本信息 v1.9.1-bN"）
5. ✅ npm 包 `luanmuc-lx-music-version-info` 版本已发布（若 NPM_TOKEN 失效会有 `::error::` 提示，需更换 secret）
6. ✅ 全部通过后才通知用户

## 五、回滚方法

**场景 A：编译失败（Android Job 红）**

- 若原因在最近的代码改动：`git revert <提交>` 后推送，触发下一次构建
- 若原因在 CI 配置：修复 `.github/workflows/release.yml` 或 `scripts/` 后推送
- 若原因在音源拉取：检查 `luanmuc/lx-music-source` 仓库最新脚本是否损坏（>50KB + @name 校验失败），修复后重跑

**场景 B：Release 已发但 version.json 未回写（Release Job 部分失败）**

- 手动触发 `workflow_dispatch` 重跑 `Release` Job（无需重新编译，artifacts 可复用）
- 或手动编辑 `publish/version.json` 提交（格式参考历史记录，注意版本号与已发 tag 一致）

**场景 C：发布了错误版本（用户已安装）**

1. `git revert` 出问题的提交，推送触发新构建（bN+1）
2. 在新版本发布说明中注明"回滚了 X 行为"
3. 无需删除旧 Release（保留审计记录）

## 六、npm 版本信息包机制

- 包名：`luanmuc-lx-music-version-info`（npm registry）
- 用途：App 在线更新检查的版本数据源之一（与 `publish/version.json`、jsdelivr 多源并行，取最高版本）
- 维护：CI 每次构建自动发布（`scripts/publish_npm_info.py`）；仓库内 `npm-version-info/package.json` 由 CI 更新并提交回
- 若发布失败：App 会从其它源获取版本信息，不影响更新；但需尽快更换 GitHub secret `NPM_TOKEN`

## 七、开发侧注意

- 改文档/配置（README、docs/、.github/、CUSTOM_CHANGELOG.md 等）也会触发构建发版——这是预期行为，正好让发布说明反映文档变更
- 只更新版本信息（`publish/**`、`npm-version-info/**`）不会触发构建，不会产生新版本号
- 合并上游后推送同样走本流程
