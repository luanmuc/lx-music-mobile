import { memo } from 'react'
import { View } from 'react-native'
import { createStyle } from '@/utils/tools'
import { usePlayQuality } from '@/store/player/hook'
import QualitySwitch from './QualitySwitch'
import SourceSwitch from './SourceSwitch'

// 播放页进度条上方的音质/音源切换栏：两个显眼按钮并排
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
