// LastFM Scrobbling 配置（借鉴 MusicFree/Spotube）：
// 开关 + API key + 用户名 + 密码（仅用于向 LastFM 获取 session，不落盘密码之外的敏感信息）
import { memo } from 'react'
import { View } from 'react-native'

import InputItem from '../../components/InputItem'
import CheckBoxItem from '../../components/CheckBoxItem'
import { createStyle } from '@/utils/tools'
import { useSettingValue } from '@/store/setting/hook'
import { updateSetting } from '@/core/common'
import { initLastfm } from '@/core/lastfm'

export default memo(() => {
  const enabled = useSettingValue('lastfm.enabled')
  const apiKey = useSettingValue('lastfm.apiKey')
  const username = useSettingValue('lastfm.username')
  const password = useSettingValue('lastfm.password')

  const setEnabled = (checked: boolean) => {
    updateSetting({ 'lastfm.enabled': checked })
    if (checked) void initLastfm()
  }

  return (
    <View style={styles.content}>
      <CheckBoxItem
        check={enabled}
        onChange={setEnabled}
        label="LastFM 记录（Scrobble）"
        helpDesc="在 last.fm 创建 API 账号后填写下方信息，播放歌曲将自动记录到 LastFM"
      />
      <InputItem
        value={apiKey ?? ''}
        label="API Key"
        placeholder="https://www.last.fm/api/account/create"
        onChanged={(value, callback) => {
          callback(value)
          updateSetting({ 'lastfm.apiKey': value })
        }}
      />
      <InputItem
        value={username ?? ''}
        label="用户名"
        placeholder="LastFM 用户名"
        onChanged={(value, callback) => {
          callback(value)
          updateSetting({ 'lastfm.username': value })
        }}
      />
      <InputItem
        value={password ?? ''}
        label="密码"
        placeholder="LastFM 密码（仅用于登录获取 session）"
        onChanged={(value, callback) => {
          callback(value)
          updateSetting({ 'lastfm.password': value })
        }}
      />
    </View>
  )
})

const styles = createStyle({
  content: {
    marginTop: 5,
  },
})
