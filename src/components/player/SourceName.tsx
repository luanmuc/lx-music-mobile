import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'

// 音源 id → 显示名（与 src/utils/musicSdk/index.js 的 sources 定义保持一致）
const SOURCE_NAMES: Record<string, string> = {
  kw: '酷我音乐',
  kg: '酷狗音乐',
  tx: 'QQ音乐',
  wy: '网易音乐',
  mg: '咪咕音乐',
}

export const getSourceName = (source: string): string => SOURCE_NAMES[source] || source || ''

export default ({ source }: { source: string }) => {
  const theme = useTheme()
  const name = getSourceName(source)
  if (!name) return null
  return <Text size={10} color={theme['c-font-label']} style={{ opacity: 0.75, marginLeft: 4 }}>{name}</Text>
}
