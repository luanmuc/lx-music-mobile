import { memo } from 'react'
import { View } from 'react-native'
import { createStyle } from '@/utils/tools'
import { usePlayQuality } from '@/store/player/hook'
import QualitySwitch from './QualitySwitch'
import SourceSwitch from './SourceSwitch'

// 播放页进度条上方的音质/音源显示条：两个胶囊并排（仅显示当前实际音质与当前平台，切换功能已按用户要求移除）
export default memo(() => {
  const playQuality = usePlayQuality()

  return (
    <View style={styles.bar}>
      <QualitySwitch quality={playQuality} />
      <SourceSwitch />
    </View>
  )
})

const styles = createStyle({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    marginTop: 6,
    marginBottom: 10,
  },
})
