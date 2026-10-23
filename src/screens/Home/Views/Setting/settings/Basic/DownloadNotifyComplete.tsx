import { updateSetting } from '@/core/common'
import { createStyle } from '@/utils/tools'
import { memo } from 'react'
import { View } from 'react-native'
import { useSettingValue } from '@/store/setting/hook'
import CheckBoxItem from '../../components/CheckBoxItem'

export default memo(() => {
  const notifyComplete = useSettingValue('download.notifyComplete')
  const setNotifyComplete = (value: boolean) => {
    updateSetting({ 'download.notifyComplete': value })
  }

  return (
    <View style={styles.content}>
      <CheckBoxItem check={notifyComplete} label="下载完成通知提醒" onChange={setNotifyComplete} />
    </View>
  )
})

const styles = createStyle({
  content: {
    marginTop: 5,
  },
})
