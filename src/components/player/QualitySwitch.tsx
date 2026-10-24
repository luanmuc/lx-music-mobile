import { memo } from 'react'
import { View } from 'react-native'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import Text from '@/components/common/Text'

const QUALITY_NAMES: Record<string, string> = {
  flac24bit: 'Hi-Res',
  flac: '无损',
  wav: 'WAV',
  ape: 'APE',
  '320k': '320K',
  '192k': '192K',
  '128k': '128K',
}

// 播放页音质标识：只显示当前实际音质（切换音质功能已按用户要求移除）
export default memo(({ quality }: { quality: string }) => {
  const theme = useTheme()
  const label = quality ? (QUALITY_NAMES[quality] ?? quality) : '--'

  return (
    <View style={styles.wrap}>
      <View style={[styles.btn, { backgroundColor: theme['c-primary-alpha-900'], opacity: quality ? 1 : 0.5 }]}>
        <Text size={14} color={theme['c-primary-font-active']}>{label}</Text>
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
