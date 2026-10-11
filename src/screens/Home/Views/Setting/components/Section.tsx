import { View } from 'react-native'

import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import Text from '@/components/common/Text'


interface Props {
  title: string
  children: React.ReactNode | React.ReactNode[]
}

export default ({ title, children }: Props) => {
  const theme = useTheme()

  return (
    <View style={{ ...styles.container, backgroundColor: theme.isDark ? 'rgba(40, 40, 45, 0.6)' : 'rgba(255, 255, 255, 0.6)' }}>
      <Text style={{ ...styles.title, borderLeftColor: theme['c-primary'] }} size={16} >{title}</Text>
      <View>
        {children}
      </View>
    </View>
  )
}


const styles = createStyle({
  container: {
    marginHorizontal: 12,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  title: {
    borderLeftWidth: 5,
    paddingLeft: 12,
    marginBottom: 12,
    // lineHeight: 16,
  },
})
