import { memo, useRef } from 'react'
import { TouchableOpacity, View } from 'react-native'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import Text from '@/components/common/Text'
import { getSourceName } from './SourceName'
import playerState from '@/store/player/state'
import MusicToggleModal, { type MusicToggleModalType } from '@/screens/Home/Views/Mylist/MusicList/MusicToggleModal'

// 播放页音源切换按钮：显示当前平台名，点击弹出换源面板（全平台同曲）
export default memo(() => {
  const theme = useTheme()
  const musicToggleRef = useRef<MusicToggleModalType>(null)

  // 当前播放歌曲的完整信息（含 source/meta），用于判断是否在线歌曲并取平台名
  const curInfo = playerState.playMusicInfo.musicInfo
  const isOnline = !!curInfo && !('progress' in curInfo)
  const sourceName = isOnline ? getSourceName((curInfo as LX.Music.MusicInfoOnline).source) : ''

  const openToggleSource = () => {
    if (!isOnline || !curInfo) return
    musicToggleRef.current?.show({
      musicInfo: curInfo as LX.Music.MusicInfo,
      listId: playerState.playMusicInfo.listId ?? '',
    })
  }

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        onPress={openToggleSource}
        hitSlop={styles.hitSlop}
        style={[styles.btn, { backgroundColor: theme['c-primary-alpha-900'], opacity: isOnline ? 1 : 0.5 }]}
        activeOpacity={0.6}
      >
        <Text size={14} color={theme['c-primary-font-active']}>{isOnline ? sourceName : '--'}</Text>
        <Text size={14} color={theme['c-primary-font-active']} style={styles.arrow}>▾</Text>
      </TouchableOpacity>
      <MusicToggleModal ref={musicToggleRef} />
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
  arrow: {
    marginLeft: 4,
  },
  hitSlop: { top: 6, bottom: 6, left: 6, right: 6 },
})
