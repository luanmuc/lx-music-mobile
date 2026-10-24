import { memo } from 'react'
import { View } from 'react-native'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import Text from '@/components/common/Text'
import { getSourceName } from './SourceName'
import playerState from '@/store/player/state'

// 播放页音源标识：只显示当前歌曲走的平台（换源功能已按用户要求移除）
export default memo(() => {
  const theme = useTheme()

  // 当前播放歌曲的完整信息（含 source/meta），用于判断是否在线歌曲并取平台名
  const curInfo = playerState.playMusicInfo.musicInfo
  const isOnline = !!curInfo && !('progress' in curInfo)
  const sourceName = isOnline ? getSourceName((curInfo as LX.Music.MusicInfoOnline).source) : ''

  return (
    <View style={styles.wrap}>
      <View style={[styles.btn, { backgroundColor: theme['c-primary-alpha-900'], opacity: isOnline ? 1 : 0.5 }]}>
        <Text size={14} color={theme['c-primary-font-active']}>{isOnline ? sourceName : '--'}</Text>
      </View>
    </View>
  )
})

const styles = createStyle({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
})
