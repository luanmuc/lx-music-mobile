import { updateSetting } from '@/core/common'
import { useI18n } from '@/lang'
import { createStyle, toast } from '@/utils/tools'
import { memo } from 'react'
import { View } from 'react-native'
import { useSettingValue } from '@/store/setting/hook'


import CheckBoxItem from '../../components/CheckBoxItem'

export default memo(() => {
  const t = useI18n()
  // 仅在开启音频焦点处理时才有意义，关闭时置灰
  const isHandleAudioFocus = useSettingValue('player.isHandleAudioFocus')
  const isAutoResume = useSettingValue('player.autoResumeAfterInterrupt')
  const setAutoResume = (value: boolean) => {
    updateSetting({ 'player.autoResumeAfterInterrupt': value })
    toast(t('setting_play_handle_audio_focus_tip'))
  }

  return (
    <View style={styles.content}>
      <CheckBoxItem
        check={isAutoResume}
        onChange={setAutoResume}
        label={t('setting_play_auto_resume_after_interrupt')}
        disabled={!isHandleAudioFocus}
      />
    </View>
  )
})


const styles = createStyle({
  content: {
    marginTop: 5,
    paddingLeft: 18,
  },
})
