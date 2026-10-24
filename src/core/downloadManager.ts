import { Platform, Linking, Share, Alert, Vibration } from 'react-native'
import RNFS from 'react-native-fs'
import { LIST_IDS, storageDataPrefix } from '@/config/constant'
import { getData, saveData } from '@/plugins/storage'
import downloadActions from '@/store/download/action'
import downloadState from '@/store/download/state'
import settingState from '@/store/setting/state'
import { getMusicUrl as getOnlineMusicUrl } from '@/core/music/online'
import { getDownloadQuality, FULL_QUALITYS_LIST } from '@/core/music/utils'
import { toast, requestStoragePermission } from '@/utils/tools'
import { existsFile, moveFile, unlink } from '@/utils/fs'
import { playList } from '@/core/player/player'
import { shareFile as nativeShareFile, getWIFIIPV4Address, openFileInFileManager, writeAudioTag } from '@/utils/nativeModules/utils'

const DOWNLOAD_STORAGE_KEY = storageDataPrefix.downloadList

// 并发下载控制：记录正在下载的任务数
let activeDownloadCount = 0
// 记录正在下载的 jobId -> taskId，用于暂停
const activeJobs = new Map<number, string>()

const MAX_RETRY_COUNT = 3

const save = () => {
  void saveData(DOWNLOAD_STORAGE_KEY, downloadState.list)
}

// 失败原因中文提示（借鉴 MusicFree DownloadFailReason 文案）
const FAIL_REASON_TEXT: Record<LX.Download.DownloadErrorReason, string> = {
  network: '网络错误',
  cellular: '非 WiFi 环境',
  noSource: '获取下载链接失败',
  noWrite: '无写入权限（请在系统设置中允许存储权限后重试）',
  noSpace: '存储空间不足',
  unknown: '未知错误',
}

const failTask = (task: LX.Download.ListItem, err: any, failReason: LX.Download.DownloadErrorReason = 'unknown') => {
  const reasonText = FAIL_REASON_TEXT[failReason] ?? '未知错误'
  const errMsg = (err as Error)?.message ?? ''
  const errorText = errMsg && !errMsg.includes(reasonText) ? `${reasonText}：${errMsg}` : reasonText
  downloadActions.updateItem({
    ...task,
    status: 'error',
    statusText: `下载失败：${errorText}`,
    error: errorText,
    errorCode: failReason,
  } as any)
  save()
  // 下载失败立即提示原因（含"权限/链接/空间"等具体原因），避免只显示"重试"让用户无从下手
  toast(`下载失败：${errorText}`, 'long')
}

// 格式化下载速度
const formatSpeed = (bytesPerSec: number): string => {
  if (!isFinite(bytesPerSec) || bytesPerSec <= 0) return ''
  if (bytesPerSec >= 1024 * 1024) return `${(bytesPerSec / 1024 / 1024).toFixed(2)} MB/s`
  return `${Math.round(bytesPerSec / 1024)} KB/s`
}

// 安全震动：部分机型/系统缺少 VIBRATE 权限或震动机不可用时，
// vibrate 可能抛 SecurityException，必须兜底，避免下载完成时崩溃
const safeVibrate = (duration: number = 200) => {
  try {
    Vibration.vibrate(duration)
  } catch (e) {
    // 忽略震动失败
  }
}

// 存储空间检查（借鉴 MusicFree checkStorage）：剩余空间低于阈值时拒绝下载，避免写满磁盘
const MIN_FREE_SPACE = 100 * 1024 * 1024 // 100MB
const checkFreeSpace = async(): Promise<boolean> => {
  try {
    const info = await RNFS.getFSInfo()
    const freeSpace = info?.freeSpace
    // 部分机型/ROM 的 getFSInfo 返回 0 或异常值，此时不应误判为空间不足阻断下载
    if (freeSpace == null || !isFinite(freeSpace) || freeSpace <= 0) return true
    return freeSpace >= MIN_FREE_SPACE
  } catch (e) {
    // 获取失败不阻断下载
    return true
  }
}

// 是否处于 WiFi 环境（Android 原生探测，非 Android 恒为 true）
const isWifiConnected = async(): Promise<boolean> => {
  if (Platform.OS !== 'android') return true
  try {
    const ip = await getWIFIIPV4Address()
    return !!ip && ip !== '0.0.0.0'
  } catch (e) {
    return true
  }
}

// 获取下载目录（公共下载目录或用户自定义目录）
const getDownloadDir = async(): Promise<string> => {
  const customDir = settingState.setting['download.dir']
  if (customDir) {
    await RNFS.mkdir(customDir)
    return customDir
  }

  const sdkInt = Number(Platform.Version)

  // Android 10 及以下：申请普通存储权限后可直接写公共目录
  if (Platform.OS === 'android' && sdkInt < 30) {
    const granted = await requestStoragePermission()
    if (granted !== true) throw new Error('未获得存储权限，无法下载')
  }

  // Android 11+：向公共下载目录直接写入必须拥有"所有文件访问"权限
  // （READ_MEDIA_AUDIO 等媒体权限只读，不能授权写入公共目录）
  // 先尝试创建目录，失败则弹窗引导用户去设置页开启全文件访问
  const dir = `${RNFS.DownloadDirectoryPath}/lx-music`
  try {
    await RNFS.mkdir(dir)
    return dir
  } catch (e) {
    if (Platform.OS === 'android' && sdkInt >= 30) {
      const wantOpen = await new Promise<boolean>((resolve) => {
        Alert.alert(
          '需要开启所有文件访问权限',
          'Android 11 及以上系统把歌曲下载到公共下载目录，需要开启"所有文件访问"权限（仅用于读写下载的歌曲文件）。\n\n点击「去开启」会跳转到设置页，找到「落雪音乐」打开开关即可。',
          [
            { text: '取消', onPress: () => resolve(false) },
            { text: '去开启', onPress: () => resolve(true) },
          ]
        )
      })
      if (wantOpen) Linking.openSettings()
      throw new Error('需要开启所有文件访问权限')
    }
    throw e
  }
}

const invalidFileNameChars = /[\\/:*?"<>|]+/g
const buildFileName = (musicInfo: LX.Music.MusicInfoOnline, url: string, quality: LX.Quality): string => {
  const name = `${musicInfo.name} - ${musicInfo.singer}`.replace(invalidFileNameChars, '_').slice(0, 80)
  const extMatch = url.match(/\.(flac|mp3|m4a|aac|wav|ogg)(?:\?|$)/i)
  const ext = extMatch ? extMatch[1].toLowerCase() : 'mp3'
  // 文件名带音质标识，避免同一首歌不同音质互相覆盖
  const qualityTag = quality && quality !== '128k' ? ` [${quality}]` : ''
  return `${name}${qualityTag}.${ext}`
}

// 是否已选择"全部替换"已存在的文件（本次会话内生效，借鉴 Spotube ReplaceDownloadedDialog）
let replaceAllDownloads = false

/**
 * 文件已存在时询问用户如何处理（借鉴 Spotube）
 * @returns 'replace' 替换后重新下载 | 'skip' 跳过并标记为已完成
 */
const confirmReplaceFile = (name: string): Promise<'replace' | 'skip'> => {
  if (replaceAllDownloads) return Promise.resolve('replace')
  return new Promise((resolve) => {
    Alert.alert('文件已存在', `《${name}》已下载过，是否替换？`, [
      { text: '跳过', style: 'cancel', onPress: () => resolve('skip') },
      { text: '全部替换', onPress: () => { replaceAllDownloads = true; resolve('replace') } },
      { text: '替换', onPress: () => resolve('replace') },
    ])
  })
}

// 下载完成后写入音频标签（借鉴 Spotube 写元数据；失败不影响下载结果）
const writeAudioTagAsync = async(filePath: string, musicInfo: LX.Music.MusicInfoOnline) => {
  try {
    // 封面：下载到临时文件后随标签写入
    let coverPath = ''
    const picUrl = (musicInfo.meta as any)?.picUrl
    if (picUrl) {
      const tmpCover = `${RNFS.TemporaryDirectoryPath}/lx-cover-${Date.now()}.jpg`
      try {
        const job = RNFS.downloadFile({ fromUrl: picUrl, toFile: tmpCover })
        const res = await job.promise
        if (res.statusCode === 200 || res.statusCode === 206) coverPath = tmpCover
      } catch (e) {
        // 封面下载失败则跳过封面，只写文本标签
      }
    }
    await writeAudioTag(
      filePath,
      musicInfo.name ?? '',
      musicInfo.singer ?? '',
      (musicInfo.meta as any)?.albumName ?? '',
      coverPath,
    )
    if (coverPath) {
      try { RNFS.unlink(coverPath) } catch (e) {}
    }
  } catch (e) {
    // 标签写入失败不影响下载
  }
}

const runDownload = (task: LX.Download.ListItem): Promise<void> => {
  const { url, filePath } = task.metadata
  if (!url || !filePath) return Promise.reject(new Error('缺少下载地址'))
  // 缓存路径：先下载到 .part，完成后原子移动到正式路径。
  // 中断/失败只留下缓存残件，正式目录永远是完整文件，不会出现半成品（借鉴 MusicFree）
  const partPath = `${filePath}.part`

  return new Promise<void>((resolve, reject) => {
    // 清理上一次中断留下的缓存残件
    try { RNFS.unlink(partPath) } catch (e) {}

    let lastProgress = 0
    let lastBytes = 0
    let lastTime = Date.now()
    // 是否已把总大小持久化（只写一次，供重启后校验文件完整度）
    let hasPersistedTotal = false

    const job = RNFS.downloadFile({
      fromUrl: url,
      toFile: partPath,
      background: false,
      discretionary: false,
      progressDivider: 1024 * 10, // 每 10KB 回调一次进度
      progress: (res) => {
        // 任务已被暂停时忽略进度回调，避免把状态改回"下载中"
        const current = downloadState.list.find(t => t.id === task.id)
        if (!current || current.status === 'pause') return

        // 兼容不同版本 react-native-fs 的字段名
        const currentBytes = res.bytesWritten ?? res.totalBytesWritten ?? 0
        const totalBytes = res.contentLength ?? res.totalBytesExpectedToWrite ?? 0
        const progress = totalBytes > 0 ? currentBytes / totalBytes : 0

        // 首次拿到总大小即持久化一次：重启恢复任务时可据此判断文件是否完整，
        // 避免下载中断残留的部分文件被误判为"已完成"
        // 注意：updateItem 是整体替换而非 merge，必须以当前任务为底重建状态，避免状态回退
        if (!hasPersistedTotal && totalBytes > 0) {
          hasPersistedTotal = true
          downloadActions.updateItem({
            ...current,
            status: 'run',
            statusText: '下载中',
            progress: progress > 0 ? progress : current.progress,
            downloaded: currentBytes,
            total: totalBytes,
          } as any)
          save()
        }

        // 计算下载速度
        const now = Date.now()
        const elapsed = (now - lastTime) / 1000
        let speed = ''
        if (elapsed > 0) {
          const bytesDelta = currentBytes - lastBytes
          speed = formatSpeed(bytesDelta / elapsed)
          lastBytes = currentBytes
          lastTime = now
        }

        // 每 5% 更新一次状态，避免太频繁
        if (progress - lastProgress < 0.05) return
        lastProgress = progress

        downloadActions.updateItem({
          ...task,
          status: 'run',
          statusText: '下载中',
          progress,
          downloaded: currentBytes,
          total: totalBytes,
          speed,
        } as any)
      },
    })

    activeJobs.set(job.jobId, task.id)

    job.promise.then(async (result) => {
      activeJobs.delete(job.jobId)
      if (result.statusCode !== 200 && result.statusCode !== 206) {
        // 下载失败，删除缓存残件（正式路径不受影响）
        try { RNFS.unlink(partPath) } catch (e) {}
        reject(new Error(`下载失败 (HTTP ${result.statusCode})`))
        return
      }

      // 下载成功：把缓存文件原子移动到正式路径
      try {
        await moveFile(partPath, filePath)
      } catch (e) {
        try { RNFS.unlink(partPath) } catch (err) {}
        reject(new Error('保存文件失败'))
        return
      }

      // 写音频标签（异步，失败不影响下载结果）
      void writeAudioTagAsync(filePath, task.metadata.musicInfo)

      // 下载成功，更新状态
      const bytesWritten = result.bytesWritten ?? 0
      downloadActions.updateItem({
        ...task,
        isComplate: true,
        status: 'completed',
        statusText: '已完成',
        progress: 1,
        downloaded: bytesWritten,
        total: bytesWritten,
        speed: '',
      } as any)
      save()
      // 下载完成提醒（可在设置里开关）
      const showNotify = settingState.setting['download.notifyComplete'] !== false
      if (showNotify) {
        toast(`下载完成：${task.metadata.musicInfo.name}`)
        safeVibrate()
      }
      resolve()
    }).catch((err) => {
      activeJobs.delete(job.jobId)
      // 判断是否被用户主动暂停：暂停时保留状态，删除缓存残件，不当作失败
      const current = downloadState.list.find(t => t.id === task.id)
      if (current && current.status === 'pause') {
        try { RNFS.unlink(partPath) } catch (e) {}
        resolve()
        return
      }
      // 下载失败，删除缓存残件（正式路径不受影响）
      try { RNFS.unlink(partPath) } catch (e) {}
      reject(err)
    })
  })
}

const runTask = async(task: LX.Download.ListItem) => {
  activeDownloadCount++
  downloadActions.updateItem({ ...task, status: 'run', statusText: '获取歌曲信息...' } as any)

  try {
    // 仅 WiFi 下载：非 WiFi 环境下暂停任务，等待用户切换网络后继续
    if (Platform.OS === 'android' && settingState.setting['download.onlyWifi']) {
      if (!(await isWifiConnected())) {
        downloadActions.updateItem({
          ...task,
          status: 'pause',
          statusText: '非WiFi环境，已暂停',
        } as any)
        save()
        return
      }
    }

    // 自动检测歌曲实际支持的最高音质
    const actualQuality = getDownloadQuality(task.metadata.quality, task.metadata.musicInfo)

    // 获取下载url（借鉴 MusicFree：目标音质拿不到链接时按音质序列向下降级尝试）
    const qualityIndex = FULL_QUALITYS_LIST.indexOf(actualQuality)
    const candidateQualities = qualityIndex >= 0 ? FULL_QUALITYS_LIST.slice(qualityIndex) : [actualQuality]
    let url: string | null = null
    let usedQuality: LX.Quality = actualQuality
    let lastUrlError: Error | null = null
    for (const quality of candidateQualities) {
      try {
        const u = await getOnlineMusicUrl({
          musicInfo: task.metadata.musicInfo,
          quality,
          isRefresh: true,
        })
        if (u) {
          url = u
          usedQuality = quality
          break
        }
      } catch (e) {
        // 该音质获取失败，继续向下降级；记录最后一个错误便于排查
        lastUrlError = e as Error
      }
    }
    if (!url) throw new Error(`获取下载链接失败${lastUrlError ? `：${lastUrlError.message}` : ''}`)

    // 准备目录和文件名
    const dir = await getDownloadDir()
    // 存储空间检查（借鉴 MusicFree）：空间不足直接失败，不进入下载
    if (!(await checkFreeSpace())) throw new Error('存储空间不足')
    const fileName = buildFileName(task.metadata.musicInfo, url, usedQuality)
    const filePath = `${dir}/${fileName}`

    // 检查文件是否已存在且是完整文件（借鉴 lx-music-desktop 的判定：
    // 已知预期大小（total>0）时须完整；未知时以 size>100 为有效文件，更小的视为残件）
    if (await existsFile(filePath)) {
      try {
        const stat = await RNFS.stat(filePath)
        const expectedTotal = task.total > 0 ? task.total : null
        const isComplete = expectedTotal ? stat.size >= expectedTotal : stat.size > 100
        if (isComplete) {
          // 借鉴 Spotube：完整文件已存在时让用户选择替换/跳过（不直接覆盖）
          const action = await confirmReplaceFile(task.metadata.musicInfo.name)
          if (action === 'skip') {
            downloadActions.updateItem({
              ...task,
              isComplate: true,
              status: 'completed',
              statusText: '已完成',
              progress: 1,
              downloaded: stat.size,
              total: stat.size,
              metadata: { ...task.metadata, url, fileName, filePath, quality: usedQuality },
            } as any)
            save()
            const showNotify = settingState.setting['download.notifyComplete'] !== false
            if (showNotify) {
              toast(`已存在：${task.metadata.musicInfo.name}`)
              safeVibrate()
            }
            return
          }
          // 用户选择替换：删除旧文件后重新下载
          try { await RNFS.unlink(filePath) } catch (e) {}
        } else {
          // 残件/部分文件：删除后重新下载
          try { await RNFS.unlink(filePath) } catch (e) {}
        }
      } catch (e) {
        // stat 失败按文件不存在处理，继续下载
      }
    }

    // 开始真正下载
    await runDownload({ ...task, metadata: { ...task.metadata, url, fileName, filePath, quality: usedQuality } })
  } catch (err) {
    // 权限类错误不自动重试：用户未授权时重试只会反复弹权限弹窗，直接标记失败等待用户处理后手动重试
    const errorMsg = (err as Error)?.message ?? ''
    const isPermissionError = errorMsg.includes('权限') || errorMsg.includes('访问')
    // 失败原因分类（借鉴 MusicFree DownloadFailReason），供 UI 显示与日志排查
    const failReason: LX.Download.DownloadErrorReason = isPermissionError ? 'noWrite'
      : errorMsg.includes('存储空间') || errorMsg.includes('空间不足') ? 'noSpace'
      : errorMsg.includes('链接') || errorMsg.includes('noSource') || /HTTP 4\d\d/.test(errorMsg) ? 'noSource'
      : errorMsg.includes('网络') || errorMsg.includes('ENOTFOUND') || errorMsg.includes('timeout') || errorMsg.includes('EAI_AGAIN') || /HTTP \d\d\d/.test(errorMsg) ? 'network'
      : 'unknown'
    const retryCount = task.retryCount ?? 0
    if (!isPermissionError && settingState.setting['download.autoRetry'] && retryCount < MAX_RETRY_COUNT) {
      downloadActions.updateItem({
        ...task,
        retryCount: retryCount + 1,
        status: 'waiting',
        statusText: `等待重试 (${retryCount + 1}/${MAX_RETRY_COUNT})`,
        error: errorMsg || '下载失败',
        errorCode: failReason,
      } as any)
      save()
    } else {
      failTask(task, err, failReason)
    }
  } finally {
    activeDownloadCount--
    void startNext()
  }
}

const startNext = async() => {
  // 按设置的并发数启动下载任务
  const maxTask = Math.max(1, settingState.setting['download.maxTask'] || 1)
  while (activeDownloadCount < maxTask) {
    const task = downloadState.list.find(t => !t.isComplate && t.status === 'waiting')
    if (!task) break
    void runTask(task)
  }
}

/**
 * 添加下载任务
 */
export const startDownload = async(musicInfo: LX.Music.MusicInfoOnline, quality: LX.Quality = 'flac24bit') => {
  const taskId = musicInfo.id
  const exists = downloadState.list.find(t => t.id === taskId)
  if (exists) {
    if (exists.isComplate) {
      toast('该歌曲已下载完成')
    } else {
      toast('该歌曲已在下载队列中')
    }
    return
  }

  const task: LX.Download.ListItem = {
    id: taskId,
    isComplate: false,
    status: 'waiting',
    statusText: '等待中',
    downloaded: 0,
    total: 0,
    progress: 0,
    speed: '',
    metadata: {
      musicInfo,
      url: null,
      quality,
      ext: 'mp3',
      fileName: '',
      filePath: '',
    },
  } as any

  downloadActions.addItem(task)
  save()
  void startNext()
  toast('已加入下载队列')
}

/**
 * 批量下载
 */
export const startBatchDownload = async(musicList: LX.Music.MusicInfoOnline[], quality: LX.Quality = 'flac24bit') => {
  let added = 0
  for (const musicInfo of musicList) {
    const taskId = musicInfo.id
    const exists = downloadState.list.find(t => t.id === taskId)
    if (exists) continue

    const task: LX.Download.ListItem = {
      id: taskId,
      isComplate: false,
      status: 'waiting',
      statusText: '等待中',
      downloaded: 0,
      total: 0,
      progress: 0,
      speed: '',
      metadata: {
        musicInfo,
        url: null,
        quality,
        ext: 'mp3',
        fileName: '',
        filePath: '',
      },
    } as any
    downloadActions.addItem(task)
    added++
  }
  save()
  void startNext()
  if (added > 0) toast(`已添加 ${added} 首歌曲到下载队列`)
}

/**
 * 重试下载失败的任务
 */
export const retryDownload = async(taskId: string) => {
  const task = downloadState.list.find(t => t.id === taskId)
  if (!task) return
  toast('正在重试下载...')
  downloadActions.updateItem({
    ...task,
    retryCount: 0,
    status: 'waiting',
    statusText: '等待中',
    error: '',
  } as any)
  save()
  void startNext()
}

/**
 * 暂停下载（真正停止底层下载任务）
 */
export const pauseDownload = async(taskId: string) => {
  const task = downloadState.list.find(t => t.id === taskId)
  if (!task || task.isComplate || task.status === 'pause') return

  // 先标记为暂停，再停止底层下载（runDownload 的 catch 检测到暂停状态时不会当作失败）
  downloadActions.updateItem({
    ...task,
    status: 'pause',
    statusText: '已暂停',
  } as any)
  save()

  for (const [jobId, id] of activeJobs) {
    if (id === taskId) {
      try { RNFS.stopDownload(jobId) } catch (e) {}
      activeJobs.delete(jobId)
      break
    }
  }
  toast('已暂停')
}

/**
 * 继续下载
 */
export const resumeDownload = async(taskId: string) => {
  const task = downloadState.list.find(t => t.id === taskId)
  if (!task) return
  downloadActions.updateItem({
    ...task,
    status: 'waiting',
    statusText: '等待中',
  } as any)
  save()
  void startNext()
}

// 初始化：从存储恢复下载列表
export const initDownloadList = async() => {
  const list = await getData(DOWNLOAD_STORAGE_KEY)
  if (list) {
    // 重启后：进行中（run）的任务实际已被中断，恢复为等待重新下载
    const restored = (list as LX.Download.ListItem[]).map(t => {
      if (!t.isComplate && t.status === 'run') {
        return {
          ...t,
          status: 'waiting' as const,
          statusText: '等待中',
          progress: 0,
          downloaded: 0,
        }
      }
      return t
    })
    downloadActions.setList(restored)
  }
  // 启动时继续处理等待中的任务
  void startNext()
}

/**
 * 删除下载任务（同时删除已下载的文件）
 */
export const removeDownload = async(taskId: string) => {
  const task = downloadState.list.find(t => t.id === taskId)
  if (!task) return
  // 如果正在下载，先停止
  for (const [jobId, id] of activeJobs) {
    if (id === taskId) {
      try { RNFS.stopDownload(jobId) } catch (e) {}
      activeJobs.delete(jobId)
      break
    }
  }
  // 如果已经下载完成，删除文件
  if (task.isComplate && task.metadata.filePath) {
    try { await unlink(task.metadata.filePath) } catch (e) {}
  }
  downloadActions.removeItem(taskId)
  save()
}

/**
 * 清空所有已完成的任务
 */
export const clearCompleted = async() => {
  const newList = downloadState.list.filter(t => !t.isComplate)
  // 删除已完成任务的文件
  for (const task of downloadState.list) {
    if (task.isComplate && task.metadata.filePath) {
      try { await unlink(task.metadata.filePath) } catch (e) {}
    }
  }
  downloadActions.setList(newList)
  save()
  toast('已清空已完成任务')
}

/**
 * 移动任务顺序（上移/下移）
 */
export const moveTask = async(taskId: string, direction: 'up' | 'down') => {
  const list = [...downloadState.list]
  const index = list.findIndex(t => t.id === taskId)
  if (index < 0) return
  const targetIndex = direction === 'up' ? index - 1 : index + 1
  if (targetIndex < 0 || targetIndex >= list.length) return
  // 交换位置
  [list[index], list[targetIndex]] = [list[targetIndex], list[index]]
  downloadActions.setList(list)
  save()
}

/**
 * 全部暂停
 */
export const pauseAllDownload = async() => {
  for (const task of downloadState.list) {
    if (!task.isComplate && task.status !== 'pause') {
      downloadActions.updateItem({
        ...task,
        status: 'pause',
        statusText: '已暂停',
      } as any)
    }
  }
  save()
  // 停止所有正在下载的底层任务
  for (const jobId of [...activeJobs.keys()]) {
    try { RNFS.stopDownload(jobId) } catch (e) {}
  }
  activeJobs.clear()
  toast('已全部暂停')
}

/**
 * 全部继续
 */
export const resumeAllDownload = async() => {
  for (const task of downloadState.list) {
    if (!task.isComplate && task.status === 'pause') {
      downloadActions.updateItem({
        ...task,
        status: 'waiting',
        statusText: '等待中',
      } as any)
    }
  }
  save()
  void startNext()
  toast('已继续全部下载任务')
}

/**
 * 播放已下载的歌曲
 */
export const playDownload = async(index: number) => {
  const completedList = downloadState.list.filter(t => t.isComplate)
  const task = completedList[index]
  if (!task || !task.metadata.filePath) return
  try {
    // 播放下载列表：getList('download') 返回已完成任务（ListItem 结构），
    // 播放器会通过 'progress' in musicInfo 走本地文件播放分支
    await playList(LIST_IDS.DOWNLOAD, index)
  } catch (e) {
    toast('播放失败')
  }
}

/**
 * 打开已下载的文件
 */
export const openDownloadedFile = async(taskId: string) => {
  const task = downloadState.list.find(t => t.id === taskId)
  if (!task || !task.isComplate || !task.metadata.filePath) {
    toast('文件不存在')
    return
  }
  try {
    const exists = await existsFile(task.metadata.filePath)
    if (!exists) {
      toast('文件已被删除')
      return
    }
    if (Platform.OS === 'android') {
      // Android：原生 Intent 跳转系统文件管理器，并定位到该文件
      await openFileInFileManager(task.metadata.filePath)
    } else {
      await Linking.openURL(`file://${task.metadata.filePath}`)
    }
  } catch (e) {
    toast('无法打开文件')
  }
}

/**
 * 分享已下载的文件
 */
export const shareDownloadedFile = async(taskId: string) => {
  const task = downloadState.list.find(t => t.id === taskId)
  if (!task || !task.isComplate || !task.metadata.filePath) {
    toast('文件不存在')
    return
  }
  try {
    const exists = await existsFile(task.metadata.filePath)
    if (!exists) {
      toast('文件已被删除')
      return
    }
    if (Platform.OS === 'android') {
      // Android：原生 FileProvider 分享文件（Share.share 的 url 字段安卓不支持）
      await nativeShareFile(task.metadata.filePath, '分享歌曲', task.metadata.musicInfo.name)
    } else {
      await Share.share({
        url: `file://${task.metadata.filePath}`,
        title: task.metadata.musicInfo.name,
      })
    }
  } catch (e) {
    toast('分享失败')
  }
}
