// LastFM Scrobbling（借鉴 MusicFree/Spotube scrobble）：
// 播放时上报 nowPlaying，满足条件（≥30s 或 ≥50%）后上报 scrobble。
// 需用户提供 LastFM API key（https://www.last.fm/api/account/create）与账号密码，默认关闭
import settingState from '@/store/setting/state'
import playerState from '@/store/player/state'

const API_BASE = 'https://ws.audioscrobbler.com/2.0/'

let sessionKey: string | null = null
let loggedIn = false

// 当前上报的曲目状态
let currentTrack: {
  artist: string
  title: string
  album: string
  duration: number
  timestamp: number
  scrobbled: boolean
} | null = null

const lastfmEnabled = () => !!settingState.setting['lastfm.enabled']
  && !!settingState.setting['lastfm.apiKey']
  && !!settingState.setting['lastfm.username']

const lastfmRequest = async(method: string, params: Record<string, string>): Promise<any> => {
  const form = new URLSearchParams({
    method,
    api_key: settingState.setting['lastfm.apiKey'] ?? '',
    format: 'json',
    ...params,
  })
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  })
  return res.json()
}

// 登录获取 session key（仅内存保存，不落盘）
export const initLastfm = async(): Promise<boolean> => {
  if (loggedIn || !lastfmEnabled() || !settingState.setting['lastfm.password']) return loggedIn
  try {
    const data = await lastfmRequest('auth.getMobileSession', {
      username: settingState.setting['lastfm.username']!,
      password: settingState.setting['lastfm.password']!,
    })
    if (data?.session?.key) {
      sessionKey = data.session.key
      loggedIn = true
    }
  } catch (e) {
    console.error('[lastfm] login failed', e)
  }
  return loggedIn
}

// 开始播放时上报
export const lastfmNowPlaying = async() => {
  try {
    if (!(await initLastfm())) return
    const musicInfo = playerState.playMusicInfo.musicInfo
    if (!musicInfo) return
    const artist = 'singer' in musicInfo ? musicInfo.singer : 'unknown'
    const title = musicInfo.name ?? 'unknown'
    const album = 'albumName' in musicInfo ? musicInfo.albumName ?? '' : ''
    // 曲目变化：重置上一首（未达条件的旧曲目放弃上报）
    if (currentTrack && (currentTrack.artist !== artist || currentTrack.title !== title)) {
      currentTrack = null
    }
    currentTrack = {
      artist,
      title,
      album,
      duration: Math.round(playerState.progress.maxPlayTime ?? 0),
      timestamp: Math.floor(Date.now() / 1000),
      scrobbled: false,
    }
    await lastfmRequest('track.updateNowPlaying', {
      sk: sessionKey!,
      artist,
      track: title,
      album,
      duration: String(currentTrack.duration),
    })
  } catch (e) {
    // 上报失败不影响播放
    console.error('[lastfm] nowPlaying failed', e)
  }
}

// 进度回调：满足条件后 scrobble（LastFM 规则：播放 ≥30s 或 ≥50%）
export const lastfmOnProgress = async(positionMs: number) => {
  if (!currentTrack || currentTrack.scrobbled || !loggedIn) return
  const duration = currentTrack.duration || positionMs * 2
  const ratio = duration > 0 ? positionMs / (duration * 1000) : 0
  if (positionMs < 30000 && ratio < 0.5) return
  currentTrack.scrobbled = true
  try {
    await lastfmRequest('track.scrobble', {
      sk: sessionKey!,
      artist: currentTrack.artist,
      track: currentTrack.title,
      album: currentTrack.album,
      timestamp: String(currentTrack.timestamp),
    })
  } catch (e) {
    console.error('[lastfm] scrobble failed', e)
  }
}

// 歌曲变化/停止时重置（由调用方在切换歌曲时调用）
export const lastfmResetTrack = () => {
  currentTrack = null
}
