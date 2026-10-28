# AGENTS.md — 多账号/多智能体协作规范

> 本仓库由**多个豆包账号共同开发**。此文件供 GitHub Copilot / 豆包 / 任何智能体读取，避免互相踩踏。
> **核心原则：master 直推即发版，只推已验证的改动；核心逻辑与高冲突区改动先走实证验证链。**

## 项目一句话

洛雪音乐（lx-music-mobile）**定制版** App：基于上游 lyswhut 原版 v1.9.1（fork 点 `fb848072`）重建的共存包（`com.luanmuc.lxmusic`），内置豆包定制聚合音源（云编译时从 `luanmuc/lx-music-source` 自动拉取）。

## 目录结构

```
README.md                   用户视角：定制功能一览/默认设置差异/文档索引
MERGE_GUIDE.md              开发协作：高冲突区/设置迁移规则/代码地图（合并上游前必读）
FAQ.md                      定制版常见问题
CUSTOM_CHANGELOG.md         b1~b23 定制历史（每次迭代在顶部补记）
docs/RELEASE_SOP.md         发布流程/版本号规则/测试清单（push 即发版）
docs/DEV_CONVENTIONS.md     多账号开发规范详情（分工/提交/评审裁决）
docs/DEV_SETUP.md           开发环境搭建
docs/DOWNLOAD_DESIGN.md     下载管理器技术设计（改下载代码前必读）
docs/MUSIC_SOURCE_GUIDE.md  音源体系与 QuickJS 契约
docs/KNOWN_ISSUES.md        已知缺陷/限制（编号化管理）
docs/UPSTREAM_LIFECYCLE.md  上游依赖生命周期管理（增/活/衰/替）
scripts/                    工具（check_ts_syntax.js / gen_change_log.py）
publish/                    CI 生成的版本信息（勿手改，构建时自动覆盖）
```

## 常用命令

```bash
# 语法检查（508 个 TS/TSX，每次改动后必跑）
node scripts/check_ts_syntax.js

# 提交 + 推送（push 即触发云编译发版 v1.9.1-bN）
git add <文件> && git commit -m "<type>(<scope>): <中文描述>" && git push origin master
```

## 协作规则（多账号直推 master）

1. **小改动**（≤1 个缺陷、风险低、不碰高冲突区）：可直接 master 提交，但必须过语法检查 + 推送前 checklist。
2. **功能改动 / 高冲突区改动**（播放器 / 下载器 / 设置默认值 / 音源体系 / CI）：先本地验证并走实证验证链，确认无回归再直推（仓库无 PR 流程，靠验证链 + 发布后验证兜底）。
3. **提交信息**：Conventional Commits 风格 + 中文描述；一次提交一个主题，不混入无关改动。
4. **每次改动必须更新**：`CUSTOM_CHANGELOG.md` 顶部 + 涉及的功能文档（下载→DOWNLOAD_DESIGN、音源→MUSIC_SOURCE_GUIDE、CI→RELEASE_SOP）。
5. **改默认值必须走设置迁移机制**（见 `MERGE_GUIDE.md`），禁止静默改值，README「默认设置差异」表同步更新。
6. **合并上游**：按 `MERGE_GUIDE.md` 流程；高冲突区文件以本仓库为准人工评估；播放器核心以原版为准最小适配。
7. **禁止**：把令牌/密钥写入提交或文档；提交 node_modules/构建产物；未验证就宣称"应该能用"。

## 实证开发流程（强制）

> **铁律：没有实证依据的改动不进代码；没有走完验证链的改动不进 master。**

### 验证链（从轻到重，逐级通过）

| 层级 | 验证内容 | 方法 | 能发现 |
|---|---|---|---|
| L0 静态 | 语法/结构 | `node scripts/check_ts_syntax.js`（508 文件 0 错误）+ `git diff` 自查 | 语法错误、调试残留 |
| L1 逻辑 | 行为/状态流 | 代码走查、必要时补单测 | 逻辑缺陷、状态机错误 |
| L2 接口 | 依赖/音源 | curl/实测（音源接口、上游 API、npm 包） | 接口失效、协议不匹配 |
| L3 真机 | 端到端 | 装包实测（下载/播放/权限/更新） | 宿主差异、集成问题 |
| L4 回归 | 全量 | `docs/RELEASE_SOP.md` 发布前测试清单 | 回归破坏 |

### 任务类型分流

- **依据不足** → 标记「调研/实测」，先取证（读代码/读上游/实测），结论留档后再实现；
- **依据充足** → 「实现」，走验证链。

### 禁止项

- 凭"看着没问题 / 别人说能用"合入核心改动；
- 把"上次的经验"当"这次的依据"（上游/接口/依赖会失效）；
- 验证失败后带病合入、或静默降级交付标准。

### 证据链留档（提交说明 + 文档）

- **依据**：实测日期 / 对象 / 结果，或上游提交/文档链接；
- **验证**：跑过 L0-L4 哪些层、结果；
- **结论**：可用 / 不可用 / 降级 + 原因。

## 发布

- push master 即触发云编译发版（`v1.9.1-bN`）；`publish/**`、`npm-version-info/**` 不触发。
- 完整流程、发布后验证清单与回滚方法见 `docs/RELEASE_SOP.md`。
- 音源版本独立发布，由 CI 构建时拉取（见 `docs/MUSIC_SOURCE_GUIDE.md`）。
