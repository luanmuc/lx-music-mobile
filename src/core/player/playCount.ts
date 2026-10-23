// 听歌统计（借鉴 MusicFree 听歌统计）：
// 累计开始播放次数、累计播放时长、今日播放次数，持久化到本地
import RNFS from 'react-native-fs'
import playerState from '@/store/player/state'

interface PlayCountData {
  playedCount: number // 累计开始播放次数
  playTime: number // 累计播放时长（秒）
  date: string // 记录日期（按天重置 dayCount）
  dayCount: number // 今日播放次数
}

const FILE = `${RNFS.DocumentDirectoryPath}/playCount.json`

let data: PlayCountData = {
  playedCount: 0,
  playTime: 0,
  date: '',
  dayCount: 0,
}

let timer: ReturnType<typeof setInterval> | null = null

const save = () => {
  void RNFS.writeFile(FILE, JSON.stringify(data)).catch(() => {
    // 写入失败忽略，统计不影响主流程
  })
}

const ensureDate = () => {
  const today = new Date().toDateString()
  if (data.date !== today) {
    data.date = today
    data.dayCount = 0
    save()
  }
}

export const initPlayCount = async() => {
  try {
    if (await RNFS.exists(FILE)) {
      const saved = JSON.parse(await RNFS.readFile(FILE))
      data = { ...data, ...saved }
    }
  } catch (e) {
    // 读取失败使用默认值
  }
  ensureDate()
  // 每 30 秒在播放中累加时长
  if (timer) return
  timer = setInterval(() => {
    if (playerState.isPlay) {
      data.playTime += 30
      save()
    }
  }, 30000)
}

export const getPlayCount = (): Readonly<PlayCountData> => data

// 每次开始播放（进入播放状态）计一次
export const addPlayCount = () => {
  ensureDate()
  data.playedCount += 1
  data.dayCount += 1
  save()
}
