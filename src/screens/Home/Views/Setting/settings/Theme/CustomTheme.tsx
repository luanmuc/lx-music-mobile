// 自定义主题取色（借鉴 lx-music-desktop 自定义主题）：
// 选主色 → 自动生成整套主题色（createThemeColors）→ 保存为自定义主题并应用
import { useState } from 'react'
import { Modal, View, TextInput, TouchableOpacity, StyleSheet } from 'react-native'
import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'
import { setTheme } from '@/core/theme'
import { getAllThemes, saveTheme } from '@/theme/themes'
import { createThemeColors } from '@/theme/themes/utils'
import { useI18n } from '@/lang'
import ButtonPrimary from '@/components/common/ButtonPrimary'

const PRESET_COLORS = [
  { name: '绿', value: '#4daf7c' },
  { name: '蓝', value: '#4a8fe0' },
  { name: '紫', value: '#8e6fd8' },
  { name: '红', value: '#e0555a' },
  { name: '橙', value: '#e0904a' },
  { name: '青', value: '#3fc4bd' },
  { name: '粉', value: '#e07ab5' },
  { name: '黄', value: '#d8c14a' },
]

export default () => {
  const theme = useTheme()
  const t = useI18n()
  const [visible, setVisible] = useState(false)
  const [color, setColor] = useState('#4daf7c')
  const [isDark, setIsDark] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleCreate = async() => {
    if (saving) return
    const colorMatch = color.trim().match(/^#([0-9a-fA-F]{6})$/)
    if (!colorMatch) return
    setSaving(true)
    try {
      const rgba = `rgb(${[1, 3, 5].map(i => parseInt(colorMatch[1].slice(i - 1, i + 1), 16)).join(', ')})`
      const themeColors = createThemeColors(rgba, null, isDark)
      const newTheme: LX.Theme = {
        id: `custom_${Date.now()}`,
        name: '自定义主题',
        isDark,
        isCustom: true,
        config: {
          themeColors,
          extInfo: {
            'c-app-background': 'var(c-primary-light-600-alpha-700)',
            'c-main-background': isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 1)',
            'bg-image': '',
            'bg-image-position': 'center',
            'bg-image-size': 'cover',
            'c-badge-primary': 'var(c-primary)',
            'c-badge-secondary': '#4baed5',
            'c-badge-tertiary': '#e7aa36',
          },
        },
      }
      await saveTheme(newTheme)
      setTheme(newTheme.id)
      setVisible(false)
    } catch (e) {
      console.error('[CustomTheme]', e)
    }
    setSaving(false)
  }

  const themeItemStyle = (item: typeof PRESET_COLORS[number]) => {
    const isActive = color.toUpperCase() === item.value.toUpperCase()
    return {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: item.value,
      borderWidth: isActive ? 3 : 0,
      borderColor: isActive ? '#fff' : 'transparent',
    }
  }

  return (
    <>
      <TouchableOpacity style={styles.entry} onPress={() => setVisible(true)}>
        <Text color={theme['c-font-label']}>自定义主题（选择主色自动生成）</Text>
      </TouchableOpacity>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.mask}>
          <View style={styles.card}>
            <Text style={styles.title}>自定义主题</Text>
            <View style={styles.palette}>
              {PRESET_COLORS.map(item => (
                <TouchableOpacity key={item.value} onPress={() => setColor(item.value)} style={themeItemStyle(item)} />
              ))}
            </View>
            <TextInput
              style={[styles.input, { color: theme['c-font-label'] }]}
              value={color}
              onChangeText={setColor}
              placeholder="#4daf7c"
              placeholderTextColor="#888"
              maxLength={7}
              autoCapitalize="none"
            />
            <View style={styles.darkRow}>
              <TouchableOpacity style={[styles.darkBtn, !isDark && styles.darkBtnActive]} onPress={() => setIsDark(false)}>
                <Text color={theme['c-font-label']} size={13}>浅色</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.darkBtn, isDark && styles.darkBtnActive]} onPress={() => setIsDark(true)}>
                <Text color={theme['c-font-label']} size={13}>深色</Text>
              </TouchableOpacity>
            </View>
            <ButtonPrimary onPress={() => void handleCreate()}>
              {saving ? '生成中…' : '生成并应用'}
            </ButtonPrimary>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setVisible(false)}>
              <Text color={theme['c-500']}>关闭</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  entry: {
    paddingVertical: 10,
  },
  mask: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#1c1e21',
    borderRadius: 10,
    padding: 16,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 14,
  },
  palette: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 14,
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 6,
    paddingHorizontal: 10,
    fontSize: 14,
    marginBottom: 12,
  },
  darkRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  darkBtn: {
    flex: 1,
    height: 36,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  darkBtnActive: {
    borderColor: '#7aa2f7',
  },
  closeBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
})
