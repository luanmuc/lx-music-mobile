// 歌词时间轴偏移（借鉴 MusicFree setLyricOffset）
// 范围 -2s ~ +2s，步进 100ms，滑杆调整即时生效
import { useState } from 'react'

import { View } from 'react-native'
import { useTheme } from '@/store/theme/hook'
import Text from '@/components/common/Text'
import { useSettingValue } from '@/store/setting/hook'
import Slider, { type SliderProps } from '@/components/common/Slider'
import { updateSetting } from '@/core/common'
import { useI18n } from '@/lang'
import styles from './style'
import { play as lrcReplay } from '@/core/lyric'
import playerState from '@/store/player/state'
import ButtonPrimary from '@/components/common/ButtonPrimary'
import settingState from '@/store/setting/state'

const MIN_VALUE = -2000 // ms
const MAX_VALUE = 2000

export default () => {
  const theme = useTheme()
  const lrcOffset = Math.trunc((useSettingValue('player.lrcOffset') ?? 0) * 1000)
  const [sliderSize, setSliderSize] = useState(lrcOffset)
  const [isSliding, setSliding] = useState(false)
  const t = useI18n()

  const handleSlidingStart: SliderProps['onSlidingStart'] = value => {
    setSliding(true)
  }
  const handleValueChange: SliderProps['onValueChange'] = value => {
    value = Math.trunc(value)
    setSliderSize(value)
  }
  const handleSlidingComplete: SliderProps['onSlidingComplete'] = value => {
    setSliding(false)
    value = Math.trunc(value)
    const offset = value / 1000
    if (lrcOffset == value) return
    updateSetting({ 'player.lrcOffset': offset })
    // 立即按新偏移重新对齐当前歌词
    if (playerState.isPlay) lrcReplay()
  }
  const handleReset = () => {
    if ((settingState.setting['player.lrcOffset'] ?? 0) == 0) return
    setSliderSize(0)
    updateSetting({ 'player.lrcOffset': 0 })
    if (playerState.isPlay) lrcReplay()
  }

  return (
    <View style={styles.container}>
      <Text>{t('play_detail_setting_lrc_offset')}</Text>
      <View style={styles.content}>
        <Text style={styles.label} color={theme['c-font-label']}>{`${(isSliding ? sliderSize : lrcOffset) / 1000 > 0 ? '+' : ''}${((isSliding ? sliderSize : lrcOffset) / 1000).toFixed(2)}s`}</Text>
        <Slider
          minimumValue={MIN_VALUE}
          maximumValue={MAX_VALUE}
          onSlidingComplete={handleSlidingComplete}
          onValueChange={handleValueChange}
          onSlidingStart={handleSlidingStart}
          step={100}
          value={lrcOffset}
        />
      </View>
      <ButtonPrimary onPress={handleReset}>{t('play_detail_setting_lrc_offset_reset')}</ButtonPrimary>
    </View>
  )
}
