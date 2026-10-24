import { memo, useState, useCallback } from 'react'
import { FlatList, TouchableOpacity, View, ScrollView } from 'react-native'

import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import Text from '@/components/common/Text'
import { Icon } from '@/components/common/Icon'
import { useI18n } from '@/lang'
import { useBackHandler } from '@/utils/hooks/useBackHandler'
import { SETTING_SCREENS, type SettingScreenIds } from '../Main'
import GroupBasic from '../settings/Basic'
import GroupPlayer from '../settings/Player'
import GroupLyricDesktop from '../settings/LyricDesktop'
import GroupSearch from '../settings/Search'
import GroupList from '../settings/List'
import GroupSync from '../settings/Sync'
import GroupBackup from '../settings/Backup'
import GroupCleanCache from '../settings/CleanCache'
import GroupOther from '../settings/Other'
import GroupVersion from '../settings/Version'
import GroupAbout from '../settings/About'

// 竖屏（手机）设置页：二级结构
// 第一层：分组列表（设置首页，一眼看到全部类型）
// 第二层：点击进入对应分组，只显示该分组内容，可返回
export default memo(() => {
  const theme = useTheme()
  const t = useI18n()
  const [activeId, setActiveId] = useState<SettingScreenIds | null>(null)

  // 分组详情页时，系统返回键优先返回分组列表
  useBackHandler(useCallback(() => {
    if (activeId != null) {
      setActiveId(null)
      return true
    }
    return false
  }, [activeId]))

  const renderGroupItem = useCallback(({ item }: { item: SettingScreenIds }) => {
    return (
      <TouchableOpacity
        style={{ ...styles.listItem, borderBottomColor: theme['c-border-background'] }}
        onPress={() => setActiveId(item)}
        activeOpacity={0.6}
      >
        <Text size={15} color={theme['c-font']}>{t(`setting_${item}`)}</Text>
        <Icon style={styles.listItemIcon} color={theme['c-font-sub']} name="chevron-right" size={14} />
      </TouchableOpacity>
    )
  }, [theme, t])

  if (activeId == null) {
    // 第一层：分组列表
    return (
      <FlatList
        style={styles.list}
        data={SETTING_SCREENS}
        keyExtractor={(item) => item}
        renderItem={renderGroupItem}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: theme['c-border-background'] }} />}
      />
    )
  }

  // 第二层：分组内容 + 返回条
  return (
    <ScrollView style={styles.detail} keyboardShouldPersistTaps={'always'}>
      <TouchableOpacity style={styles.backBar} onPress={() => setActiveId(null)} activeOpacity={0.6}>
        <Icon style={styles.backIcon} color={theme['c-primary']} name="chevron-left" size={16} />
        <Text size={14} color={theme['c-primary']}>{t('back')}</Text>
      </TouchableOpacity>
      <View style={styles.detailContent}>
        <SettingGroup id={activeId} />
      </View>
    </ScrollView>
  )
})

const SettingGroup = memo(({ id }: { id: SettingScreenIds }) => {
  switch (id) {
    case 'player': return <GroupPlayer />
    case 'lyric_desktop': return <GroupLyricDesktop />
    case 'search': return <GroupSearch />
    case 'list': return <GroupList />
    case 'sync': return <GroupSync />
    case 'backup': return <GroupBackup />
    case 'clean_cache': return <GroupCleanCache />
    case 'other': return <GroupOther />
    case 'version': return <GroupVersion />
    case 'about': return <GroupAbout />
    case 'basic':
    default: return <GroupBasic />
  }
})

const styles = createStyle({
  list: {
    flex: 1,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 18,
    paddingRight: 18,
    height: 52,
    borderBottomWidth: 0.5,
  },
  listItemIcon: {
    marginLeft: 4,
  },
  detail: {
    flex: 1,
  },
  backBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
    paddingTop: 8,
    paddingBottom: 8,
  },
  backIcon: {
    marginRight: 2,
  },
  detailContent: {
    paddingLeft: 15,
    paddingRight: 15,
    paddingTop: 4,
    paddingBottom: 15,
  },
})
