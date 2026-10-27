import { updateSetting } from '@/core/common'
import { useI18n } from '@/lang'
import { createStyle } from '@/utils/tools'
import { memo } from 'react'
import { View } from 'react-native'
import { useSettingValue } from '@/store/setting/hook'


import CheckBoxItem from '../../components/CheckBoxItem'

export default memo(() => {
  const t = useI18n()
  const enableDebugLog = useSettingValue('common.enableDebugLog')
  const setEnableDebugLog = (enable: boolean) => {
    updateSetting({ 'common.enableDebugLog': enable })
  }

  return (
    <View style={styles.content}>
      <CheckBoxItem check={enableDebugLog} label={t('setting_basic_enable_debug_log')} onChange={setEnableDebugLog} />
    </View>
  )
})


const styles = createStyle({
  content: {
    marginTop: 5,
  },
})
