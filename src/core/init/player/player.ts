import { addPlayedList, clearPlayedList } from '@/core/player/playedList'
import { pause, playNext } from '@/core/player/player'
import { setStatusText, setIsPlay } from '@/core/player/playStatus'
// import { resetPlayerMusicInfo } from '@/core/player/playInfo'
import { setStop } from '@/plugins/player'
import { delayUpdateMusicInfo } from '@/plugins/player/playList'
import TrackPlayer from 'react-native-track-player'
import playerState from '@/store/player/state'
import settingState from '@/store/setting/state'


// 通知栏播放模式图标：App 播放策略 → 原生 0=顺序 1=列表循环 2=单曲循环 3=随机
const PLAY_METHOD_TO_MODE: Record<string, number> = {
  list: 0,
  listLoop: 1,
  singleLoop: 2,
  random: 3,
}
const syncNotificationPlayMode = (method: string) => {
  void (TrackPlayer as unknown as { setNotificationRepeatMode?: (m: number) => Promise<void> })
    .setNotificationRepeatMode?.(PLAY_METHOD_TO_MODE[method] ?? 1)
}

export default async(setting: LX.AppSetting) => {
  // 冷启时把当前播放策略同步到通知栏图标（原生默认是 0=顺序，与 App 默认 listLoop 不一致）
  syncNotificationPlayMode(setting['player.togglePlayMethod'])
  const setPlayStatus = () => {
    setIsPlay(true)
  }
  const setPauseStatus = () => {
    setIsPlay(false)
    if (global.lx.isPlayedStop) void pause()
  }

  const handleEnded = () => {
    // setTimeout(() => {
    if (global.lx.isPlayedStop) {
      setStatusText(global.i18n.t('player__end'))
      return
    }
    // resetPlayerMusicInfo()
    // global.app_event.stop()
    global.app_event.setProgress(0)
    setStatusText(global.i18n.t('player__end'))
    void playNext(true)
    // })
  }

  const setStopStatus = () => {
    setIsPlay(false)
    setStatusText('')
    void setStop()
  }

  const updatePic = () => {
    if (!settingState.setting['player.isShowNotificationImage']) return
    if (playerState.playMusicInfo.musicInfo && playerState.musicInfo.pic) {
      delayUpdateMusicInfo(playerState.musicInfo)
    }
  }

  const handleConfigUpdated: typeof global.state_event.configUpdated = (keys, settings) => {
    if (keys.includes('player.togglePlayMethod')) {
      const newValue = settings['player.togglePlayMethod']
      syncNotificationPlayMode(newValue)
      if (playerState.playedList.length) clearPlayedList()
      const playMusicInfo = playerState.playMusicInfo
      if (newValue == 'random' && playMusicInfo.musicInfo && !playMusicInfo.isTempPlay) addPlayedList({ ...(playMusicInfo as LX.Player.PlayMusicInfo) })
    }
  }


  global.app_event.on('play', setPlayStatus)
  global.app_event.on('pause', setPauseStatus)
  global.app_event.on('error', setPauseStatus)
  global.app_event.on('stop', setStopStatus)
  global.app_event.on('playerEnded', handleEnded)
  global.app_event.on('picUpdated', updatePic)
  global.state_event.on('configUpdated', handleConfigUpdated)
}
