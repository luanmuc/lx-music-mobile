import settingState from '@/store/setting/state'
import TrackPlayer from 'react-native-track-player'

// 播放模式 → 原生通知栏按钮整数
// 0=顺序 1=列表循环 2=单曲循环 3=随机（none 视为顺序）
const MODE_TO_NATIVE: Record<string, number> = {
  list: 0,
  listLoop: 1,
  singleLoop: 2,
  random: 3,
  none: 0,
}

/**
 * 把当前播放模式同步给原生，通知栏按钮图标随后跟着换
 * @param mode 不传则读设置里的当前值
 */
export const syncNotificationRepeatMode = (mode?: string) => {
  const current = mode ?? settingState.setting['player.togglePlayMethod']
  const tp = TrackPlayer as unknown as {
    setNotificationRepeatMode?: (n: number) => Promise<unknown>
  }
  void tp.setNotificationRepeatMode?.(MODE_TO_NATIVE[current] ?? 1)?.catch(() => {})
}
