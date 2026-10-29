import RNFS from 'react-native-fs'
import settingState from '@/store/setting/state'
import { isLogPermissionGranted, checkLogPermission } from '@/utils/log'

const LOG_FILE_NAME = 'lx_debug_log.txt'
const MAX_LOG_SIZE = 512 * 1024 // 512KB，超过自动清空

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG'

// b64：调试日志跟随日志系统统一存公共目录 lx-music/logs（无权限不写，不降级私有目录）
const getLogPath = () => `${RNFS.DownloadDirectoryPath}/lx-music/logs/${LOG_FILE_NAME}`

const isEnabled = () => settingState.setting['common.enableDebugLog'] === true

const formatTime = () => {
  const d = new Date()
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${d.getMilliseconds().toString().padStart(3, '0')}`
}

const writeLog = async (level: LogLevel, tag: string, message: string, force = false) => {
  // 音源标签诊断（tag=PlaySource）强制写：不依赖"调试日志"开关，装包即可用日志定位
  if (!force && !isEnabled()) return
  try {
    // 无公共目录写权限不写（由「运行日志」页提示开启）——优先用缓存避免每次 native 调用
    let granted = isLogPermissionGranted()
    if (granted == null) granted = await checkLogPermission()
    if (!granted) return
    const line = `[${formatTime()}] [${level}] [${tag}] ${message}\n`
    const path = getLogPath()

    // 确保日志目录存在
    try {
      if (!await RNFS.exists(RNFS.DownloadDirectoryPath + '/lx-music/logs')) {
        await RNFS.mkdir(RNFS.DownloadDirectoryPath + '/lx-music/logs')
      }
    } catch {}

    // 检查文件大小，超过则清空
    try {
      const stat = await RNFS.stat(path)
      if (stat.size > MAX_LOG_SIZE) {
        await RNFS.writeFile(path, '', 'utf8')
      }
    } catch {} // 文件不存在则忽略

    await RNFS.appendFile(path, line, 'utf8')
  } catch (e) {
    // 日志写入失败不影响主流程
  }
}

export const logger = {
  info: (tag: string, message: string) => {
    void writeLog('INFO', tag, message, tag === 'PlaySource')
  },
  warn: (tag: string, message: string) => {
    void writeLog('WARN', tag, message)
  },
  error: (tag: string, message: string) => {
    void writeLog('ERROR', tag, message, tag === 'PlaySource')
  },
  debug: (tag: string, message: string) => {
    void writeLog('DEBUG', tag, message)
  },

  // 歌曲解析专用日志
  musicResolve: (source: string, musicId: string, name: string, singer: string, url: string | null, quality: string, error?: string) => {
    if (error) {
      void writeLog('ERROR', 'MusicResolve', `[${source}] ${name} - ${singer} (id=${musicId}, quality=${quality}) 解析失败: ${error}`)
    } else {
      void writeLog('INFO', 'MusicResolve', `[${source}] ${name} - ${singer} (id=${musicId}, quality=${quality}) 解析成功: ${url ? url.substring(0, 80) + '...' : '无URL'}`)
    }
  },

  // 播放器事件日志
  player: (action: string, musicName?: string, extra?: string) => {
    const msg = musicName ? `${musicName}${extra ? ' | ' + extra : ''}` : (extra || '')
    void writeLog('INFO', 'Player', `${action}${msg ? ': ' + msg : ''}`)
  },

  // 获取日志内容
  getLog: async (): Promise<string> => {
    try {
      return await RNFS.readFile(getLogPath(), 'utf8')
    } catch {
      return '（暂无日志）'
    }
  },

  // 清空日志
  clearLog: async () => {
    try {
      await RNFS.writeFile(getLogPath(), '', 'utf8')
    } catch {}
  },

  // 获取日志文件路径
  getLogPath: () => getLogPath(),
}
