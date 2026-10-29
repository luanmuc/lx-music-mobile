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
type LogCategory = keyof typeof LOG_FILES

// 权限状态缓存：init 与「运行日志」页打开时刷新；写入用缓存值（避免高频 native 调用）
let hasPermission: boolean | null = null
export const checkLogPermission = async(): Promise<boolean> => {
  try {
    hasPermission = await isExternalStorageManager()
  } catch {
    hasPermission = false
  }
  return hasPermission
}
const ensureLogsDir = async() => {
  try {
    if (!await RNFS.exists(LOGS_DIR)) {
      await RNFS.mkdir(LOGS_DIR)
    }
  } catch {}
  return LOGS_DIR
}

const writeLog = async(category: LogCategory, msg: string) => {
  // 无权限不写日志（不降级私有目录；查看页会提示开启权限）
  if (hasPermission == null) await checkLogPermission()
  if (!hasPermission) return
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

// 启动缓冲：init 前产生的日志先暂存，权限检查完成后一次性写入
const tempLog: Array<{ category: LogCategory, time: string, text: string }> = []
export const init = async() => {
  try {
    await checkLogPermission()
    if (hasPermission) {
      if (!await RNFS.exists(LOGS_DIR)) await RNFS.mkdir(LOGS_DIR)
    }
    // 冲刷启动缓冲
    if (tempLog.length) {
      const items = tempLog.splice(0)
      for (const item of items) {
        await writeLog(item.category, `${item.time} ${item.text}`)
      }
    }
  } catch (e) {}
}

export const getLogsDir = () => LOGS_DIR

// 合并读取 4 类日志，分段展示（==== 分类 ====）
export const getLogs = async(): Promise<string> => {
  if (hasPermission == null) await checkLogPermission()
  if (!hasPermission) return ''
  const parts: string[] = []
  const order: Array<[LogCategory, string]> = [
    ['error', '全局错误'],
    ['source', '音源日志'],
    ['diagnose', '运行诊断'],
    ['debug', '调试日志'],
  ]
  for (const [category, label] of order) {
    const path = LOGS_DIR + '/' + LOG_FILES[category].name
    try {
      if (await RNFS.exists(path)) {
        const text = await RNFS.readFile(path, 'utf8')
        if (text.trim()) {
          parts.push('==== ' + label + ' ====\n' + text.trim())
        }
      }
    } catch {}
  }
  return parts.join('\n\n')
}

// 清空全部日志（4 类）
export const clearLogs = async() => {
  if (hasPermission == null) await checkLogPermission()
  if (!hasPermission) return
  for (const file of Object.values(LOG_FILES)) {
    try {
      const path = LOGS_DIR + '/' + file.name
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
    this.diagnose(...msgs)
  },
  warn(...msgs: any[]) {
    this.diagnose(...msgs)
  },
}
