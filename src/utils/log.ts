import RNFS from 'react-native-fs'
import { isExternalStorageManager } from '@/utils/nativeModules/utils'

// ===== 日志系统（b64 重构版）=====
// 公共目录结构：Download/lx-music/{music, logs}
//   music/   → 下载音乐（downloadManager）
//   logs/    → 日志（本文件 + logger.ts 的调试日志）
// 4 类日志各产生各的文件，写前检查大小超限自动清空（保留最新日志）
// 权限策略：无"所有文件访问"权限（Android 11+）或存储权限（Android 10-）时不写任何日志（不降级私有目录），
//           由「运行日志」页提示用户开启权限

const LOG_ROOT = RNFS.DownloadDirectoryPath + '/lx-music'
const LOGS_DIR = LOG_ROOT + '/logs'

// 日志文件定义：分类 → 文件名 / 上限
const LOG_FILES = {
  error:    { name: 'error.log',        max: 1024 * 1024 }, // 全局错误 1MB
  source:   { name: 'source.log',       max: 1024 * 1024 }, // 音源日志 1MB
  diagnose: { name: 'diagnose.log',     max: 512 * 1024 },  // 运行诊断 512KB
  debug:    { name: 'lx_debug_log.txt', max: 512 * 1024 },  // 调试日志 512KB
} as const
export type LogCategory = keyof typeof LOG_FILES

// 权限状态缓存：init 与「运行日志」页打开时刷新；写入用缓存值（避免高频 native 调用）
let hasPermission: boolean | null = null
// 真实写测试标记：以真实创建文件为准（不依赖系统 API 语义差异，如各 ROM 的"所有文件访问"显示名不同）
let testedByWrite = false
// 启动缓冲：init 前产生的日志先暂存，权限可用时一次性写入（不丢早期日志）
const tempLog: Array<{ category: LogCategory, time: string, text: string }> = []
// 真实写测试：在公共日志目录创建测试文件，能写成功即视为有权限（唯一可靠标准）
// 注意 1：RNFS.mkdir 不递归——父目录 lx-music 不存在（未下载过歌/目录被清理）时须逐级创建，否则误判无权限
// 注意 2：只以"能创建"为准——删除测试文件失败（unlink 在部分 ROM 上可能延迟/受限）不影响权限结论
const testWritePermission = async(): Promise<boolean> => {
  try {
    if (!await RNFS.exists(LOG_ROOT)) await RNFS.mkdir(LOG_ROOT)
    if (!await RNFS.exists(LOGS_DIR)) await RNFS.mkdir(LOGS_DIR)
    const testPath = LOGS_DIR + '/.perm_test'
    await RNFS.writeFile(testPath, '')
    try {
      await RNFS.unlink(testPath)
    } catch {}
    return true
  } catch {
    return false
  }
}

export const checkLogPermission = async(): Promise<boolean> => {
  // 以真实写测试为准；系统 API 判断仅作快速通道（API 通过时不代表真能写，仍需写测试兜底）
  try {
    const apiGranted = await isExternalStorageManager()
    if (apiGranted) {
      hasPermission = await testWritePermission()
    } else {
      hasPermission = false
    }
    testedByWrite = true
  } catch {
    hasPermission = false
    testedByWrite = true
  }
  // 权限变为可用时冲刷启动缓冲（不丢早期日志）
  if (hasPermission && tempLog.length) {
    const items = tempLog.splice(0)
    for (const item of items) {
      await writeLog(item.category, `${item.time} ${item.text}`)
    }
  }
  return hasPermission
}
// 只读缓存（高频写入用，避免每次 native 调用）；null 表示尚未检查过
export const isLogPermissionGranted = () => hasPermission
const ensureLogsDir = async() => {
  try {
    // RNFS.mkdir 不递归，逐级创建
    if (!await RNFS.exists(LOG_ROOT)) await RNFS.mkdir(LOG_ROOT)
    if (!await RNFS.exists(LOGS_DIR)) await RNFS.mkdir(LOGS_DIR)
  } catch {}
  return LOGS_DIR
}

const writeLog = async(category: LogCategory, msg: string) => {
  // 无权限不写日志（不降级私有目录；查看页会提示开启权限）
  // 注意：hasPermission 为 null（尚未检查）时直接跳过本次写，绝不在此处触发写测试/RNFS IO——
  // 播放等热路径的日志写入只做 fire-and-forget appendFile，避免任何潜在阻塞
  if (hasPermission == null) return
  if (!hasPermission) return
  // 兜底冲刷启动缓冲（防止 checkLogPermission 未经过的路径）
  if (tempLog.length) {
    const items = tempLog.splice(0)
    for (const item of items) {
      await writeLog(item.category, `${item.time} ${item.text}`)
    }
  }
  const { name, max } = LOG_FILES[category]
  const dir = await ensureLogsDir()
  const path = dir + '/' + name
  try {
    // 写前检查大小，超限先清空再写（归零重新积累，保留最新日志）
    try {
      const stat = await RNFS.stat(path)
      if (stat.size > max) await RNFS.writeFile(path, '', 'utf8')
    } catch {} // 文件不存在则忽略
    await RNFS.appendFile(path, '\n----lx log----\n' + msg, 'utf8')
  } catch (e) {
    // 日志写入失败不影响主流程
  }
}

export const init = async() => {
  try {
    await checkLogPermission()
    if (hasPermission) {
      if (!await RNFS.exists(LOG_ROOT)) await RNFS.mkdir(LOG_ROOT)
      if (!await RNFS.exists(LOGS_DIR)) await RNFS.mkdir(LOGS_DIR)
    }
  } catch (e) {}
}

export const getLogsDir = () => LOGS_DIR

// 4 类日志的中文标签（供查看日志分段展示）
export const LOG_CATEGORY_LABELS: Record<LogCategory, string> = {
  error: '全局错误',
  source: '音源日志',
  diagnose: '运行诊断',
  debug: '调试日志',
}

// 读取日志：category 缺省读全部（分段展示）；指定则只读该类
export const getLogs = async(category?: LogCategory): Promise<string> => {
  if (hasPermission == null) await checkLogPermission()
  if (!hasPermission) return ''
  const categories: LogCategory[] = category ? [category] : (['error', 'source', 'diagnose', 'debug'] as LogCategory[])
  const parts: string[] = []
  for (const cat of categories) {
    const path = LOGS_DIR + '/' + LOG_FILES[cat].name
    try {
      if (await RNFS.exists(path)) {
        const text = await RNFS.readFile(path, 'utf8')
        if (text.trim()) {
          parts.push('==== ' + LOG_CATEGORY_LABELS[cat] + ' ====\n' + text.trim())
        }
      }
    } catch {}
  }
  return parts.join('\n\n')
}

// 清空日志：category 缺省清全部；指定则只清该类
export const clearLogs = async(category?: LogCategory) => {
  if (hasPermission == null) await checkLogPermission()
  if (!hasPermission) return
  const categories: LogCategory[] = category ? [category] : (['error', 'source', 'diagnose', 'debug'] as LogCategory[])
  for (const cat of categories) {
    try {
      const path = LOGS_DIR + '/' + LOG_FILES[cat].name
      if (await RNFS.exists(path)) await RNFS.writeFile(path, '', 'utf8')
    } catch {}
  }
}

const getTime = () => new Date().toLocaleString()

// 日志分类接口（各来源各写各的文件）：
//   log.error    → error.log    全局错误（errorHandle 异常捕获）
//   log.source   → source.log   音源日志（userApi 聚合音源）
//   log.diagnose → diagnose.log 运行诊断（播放音源标签链路等）
// 调试日志（debug）由 utils/logger.ts 走同一公共目录 lx_debug_log.txt
export const log = {
  error(...msgs: any[]) {
    const msg = msgs.map(m => typeof m == 'string' ? m : m instanceof Error ? m.stack ?? m.message : JSON.stringify(m)).join(' ')
    if (msg.startsWith('%c')) return
    tempLog.length ? tempLog.push({ category: 'error', time: getTime(), text: msg }) : void writeLog('error', `${getTime()} ERROR ${msg}`)
  },
  source(...msgs: any[]) {
    const msg = msgs.map(m => typeof m == 'string' ? m : m instanceof Error ? m.stack ?? m.message : JSON.stringify(m)).join(' ')
    if (msg.startsWith('%c')) return
    tempLog.length ? tempLog.push({ category: 'source', time: getTime(), text: msg }) : void writeLog('source', `${getTime()} LOG ${msg}`)
  },
  diagnose(...msgs: any[]) {
    const msg = msgs.map(m => typeof m == 'string' ? m : m instanceof Error ? m.stack ?? m.message : JSON.stringify(m)).join(' ')
    if (msg.startsWith('%c')) return
    tempLog.length ? tempLog.push({ category: 'diagnose', time: getTime(), text: msg }) : void writeLog('diagnose', `${getTime()} LOG ${msg}`)
  },
  // 兼容原 log.info/log.warn（各处排障日志）→ 归类到运行诊断
  info(...msgs: any[]) {
    log.diagnose(...msgs)
  },
  warn(...msgs: any[]) {
    log.diagnose(...msgs)
  },
}
