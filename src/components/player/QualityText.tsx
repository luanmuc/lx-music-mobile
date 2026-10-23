import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'

export const qualityLabel = (quality: string): string => {
  switch (quality) {
    case '128k':
      return '128k'
    case '192k':
      return '192k'
    case '320k':
      return '320k'
    case 'flac':
      return '无损'
    case 'flac24bit':
      return 'Hi-Res'
    case 'ape':
      return 'APE'
    case 'wav':
      return 'WAV'
    default:
      return quality
  }
}

export default ({ quality, size = 12 }: { quality: string, size?: number }) => {
  const theme = useTheme()
  if (!quality) return null
  return <Text size={size} color={theme['c-font-label']} style={{ marginLeft: 4, opacity: 0.75 }}>{qualityLabel(quality)}</Text>
}
