import { updateSetting } from '@/core/common'
import { useI18n } from '@/lang'
import { createStyle } from '@/utils/tools'
import { memo } from 'react'
import { View } from 'react-native'
import { useSettingValue } from '@/store/setting/hook'


import CheckBoxItem from '../../components/CheckBoxItem'

export default memo(() => {
  const t = useI18n()
  const keepScreenAwake = useSettingValue('player.keepScreenAwake')
  const setKeepScreenAwake = (keepScreenAwake: boolean) => {
    updateSetting({ 'player.keepScreenAwake': keepScreenAwake })
  }

  return (
    <View style={styles.content}>
      <CheckBoxItem check={keepScreenAwake} label={t('setting_player_keep_screen_awake')} onChange={setKeepScreenAwake} />
    </View>
  )
})


const styles = createStyle({
  content: {
    marginTop: 5,
  },
})
