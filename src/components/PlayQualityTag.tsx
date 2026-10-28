import { memo } from 'react'
import { View } from 'react-native'
import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'
import Text from '@/components/common/Text'

/**
 * 音质胶囊标签
 * 主色细边框 + 半透明底色 + 主色文字，可选项：左侧显示「音质」说明文字
 * @param label 音质标签（FLAC / 320K 等）
 * @param showLabel 是否显示「音质」前缀（播放页空间充足时显示，底部播放栏不显示）
 * @param size 字体大小
 */
const PlayQualityTag = ({ label, showLabel = false, size = 10 }: {
  label: string
  showLabel?: boolean
  size?: number
}) => {
  const theme = useTheme()
  if (!label) return null
  return (
    <View style={[styles.container, { borderColor: theme['c-primary-alpha-300'], backgroundColor: theme['c-primary-alpha-900'] }]}>
      {
        showLabel
          ? <Text size={size} color={theme['c-primary-light-100']} style={styles.labelText}>音质</Text>
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
