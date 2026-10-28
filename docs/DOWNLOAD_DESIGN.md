# 下载管理器技术设计（DOWNLOAD DESIGN）

定制版最大定制块。本文档说明实现原理、边界与扩展点，改下载相关代码前必读。

## 一、职责范围

| 代码 | 职责 |
|---|---|
| `src/core/downloadManager.ts`（787 行） | 下载核心：任务状态机、并发、断点、音质、文件、标签、通知 |
| `src/store/download/{state,action,hook}.ts` | Redux 风格状态管理（任务列表、进度、UI 联动） |
| `src/screens/Home/Views/Download/index.tsx` | 下载页 UI（进行中/已完成/未完成分组） |
| `src/components/OnlineList/QualitySelect.tsx` | 音质选择弹窗（只显示歌曲实际支持音质） |
| `src/utils/fs.ts` → `downloadDirectoryPath` | 下载目录解析（权限矩阵） |
| 原生 `UtilsModule.writeAudioTag` | 写音频标签（title/artist/album/封面） |

## 二、任务状态机

```
waiting ──→ run ──→ completed
   ↑         │
   │         ├─→ pause ──→ (重新开始) ──→ run
   │         └─→ error ──→ (自动重试≤3次) ──→ waiting ──→ run
   └─────────── (重启恢复：run 状态回 waiting)
```

- 状态字段：`status` + `statusText`（中文提示）
- 失败分类：`network / cellular / noSource / noWrite / noSpace / unknown`，失败立即 toast 提示原因

## 三、并发控制

- 全局 `activeDownloadCount` 计数，`download.maxTask`（默认 2）限制并发
- 任务完成/失败/暂停后 `startNext()` 取队列中最早 `waiting` 任务执行
- 重试的任务重新标记 `waiting`，排队等并发位

## 四、原子下载与文件处理

1. 先下载到 `<目标>.part` 缓存文件（`progressDivider: 10KB` 回调，5% 节流更新 UI）
2. 完成后再 `moveFile` 原子移动到正式路径——中断只留残件，正式目录永远完整
3. 文件已存在处理：完整文件 → 替换/跳过/全部替换弹窗；残件 → 自动删除重下
4. 空间检查：剩余 <100MB 拒绝下载（失败原因 `noSpace`）

## 五、音质降级链

- 顺序：`flac24bit → flac → wav → ape → 320k → 192k → 128k`（`core/music/utils.ts` 的 `FULL_QUALITYS_LIST`）
- `getDownloadQuality`：按源实际支持能力降级；`getOnlineMusicUrl` 逐级尝试取播放链接
- 弹窗选择（QualitySelect）只显示歌曲 `meta._qualitys` 实际支持的音质，默认选最高

## 六、权限矩阵（getDownloadDir）

| Android 版本 | 行为 |
|---|---|
| <10 | 申请普通存储权限后直写公共目录（`/sdcard/Music/lx-music` 等） |
| 11~12 | 尝试 `mkdir`，失败弹窗引导开启「所有文件访问」（MANAGE_EXTERNAL_STORAGE） |
| ≥13 | READ_MEDIA_AUDIO 即可，写公共 Music 目录 |

权限语义（`tools.ts requestStoragePermission`）：GRANTED→`true` / NEVER_ASK_AGAIN→`null`（引导去系统设置）/ 其他→`false`。

## 七、完成处理

- 写音频标签（title/artist/album/封面，失败不影响下载成功）
- 通知：toast + 安全震动（try/catch 防 Android 12+ SecurityException）
- 文件操作：点击播放（进下载列表）、分享（FileProvider）、打开文件位置、删除

## 八、持久化与重启恢复

- 存储：AsyncStorage `@download_list`（任务列表 + 状态）
- 重启：`run` 状态任务 → `waiting`，重新排队下载；已完成任务直接可用
- 断点续传：**当前未实现**（暂停后重新从头下载），扩展点见下

## 九、扩展点（待实现）

| 扩展 | 方案 | 涉及 |
|---|---|---|
| 断点续传 | 请求加 `Range` 头续下 `.part` 文件，记录已下载字节数 | `downloadManager.ts` + 任务状态字段 |
| 下载优先级 | 任务加 `priority` 字段，`startNext` 按优先级+时间排序 | state + startNext |
| 批量音质选择 | QualitySelect 支持"应用到所有选中" | QualitySelect + action |
| 按歌单批量下载 | 歌单详情页"全部下载" | 歌单页 + action |
| 下载历史/日志 | 复用 `logger.ts` 记录每个任务的关键节点 | downloadManager + logger |

## 十、改代码注意事项

- 保持「正式目录永远完整」的原子性原则，不要在正式路径直接写流
- 新状态/新字段必须同步 `state.ts` 默认值 + `@download_list` 兼容读取（`mergeSetting` 思路）
- 修改权限逻辑时同步更新 [FAQ.md](../FAQ.md) 权限章节
