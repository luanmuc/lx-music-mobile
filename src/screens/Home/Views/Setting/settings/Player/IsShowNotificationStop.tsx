import { updateSetting } from '@/core/common'
import { useI18n } from '@/lang'
import { createStyle } from '@/utils/tools'
import { memo } from 'react'
import { View } from 'react-native'
import { useSettingValue } from '@/store/setting/hook'
import { updateOptions } from '@/plugins/player'


import CheckBoxItem from '../../components/CheckBoxItem'

export default memo(() => {
  const t = useI18n()
  const showNotificationStop = useSettingValue('player.showNotificationStop')
  const setShowNotificationStop = (showNotificationStop: boolean) => {
    updateSetting({ 'player.showNotificationStop': showNotificationStop })
    void updateOptions() // 立即刷新通知栏按钮
  }

  return (
    <View style={styles.content}>
      <CheckBoxItem check={showNotificationStop} label={t('setting_player_show_notification_stop')} onChange={setShowNotificationStop} />
    </View>
  )
})


const styles = createStyle({
  content: {
    marginTop: 5,
  },
})
