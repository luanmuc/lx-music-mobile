import { memo } from 'react'
import { View } from 'react-native'
import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'
import Text from '@/components/common/Text'

/**
 * 音质/音源胶囊标签（通用）
 * 主色细边框 + 半透明底色 + 主色文字，可选项：左侧显示前缀说明文字（音质/音源）
 * @param label 标签内容（FLAC / 320K / 酷我音乐·酷我官方直连 等）
 * @param prefix 前缀说明文字（播放页空间充足时显示，底部播放栏不显示）
 * @param size 字体大小
 */
const PlayQualityTag = ({ label, prefix, size = 10 }: {
  label: string
  prefix?: string
  size?: number
}) => {
  const theme = useTheme()
  if (!label) return null
  return (
    <View style={[styles.container, { borderColor: theme['c-primary-alpha-300'], backgroundColor: theme['c-primary-alpha-900'] }]}>
      {
        prefix
          ? <Text size={size} color={theme['c-primary-light-100']} style={styles.labelText}>{prefix}</Text>
          : null
      }
      <Text size={size} color={theme['c-primary']} style={styles.valueText}>{label}</Text>
    </View>
  )
}

const styles = createStyle({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  labelText: {
    marginRight: 3,
  },
  valueText: {
    fontWeight: 'bold',
  },
})

export default memo(PlayQualityTag)
