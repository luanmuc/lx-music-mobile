import { memo } from 'react'
import { StyleSheet, View } from 'react-native'

import Progress from '@/components/player/Progress'
import Status from './Status'
import { useProgress, usePlayQuality, usePlaySource, usePlayMusicInfo } from '@/store/player/hook'
import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'
import Text from '@/components/common/Text'
import { useI18n } from '@/lang'
import PlayQualityTag from '@/components/PlayQualityTag'
import { useBufferProgress } from '@/plugins/player'
import { getPlayQualityLabel } from '@/core/music/utils'

// const FONT_SIZE = 13

const PlayTimeCurrent = ({ timeStr }: { timeStr: string }) => {
  const theme = useTheme()
  // console.log(timeStr)
  return <Text color={theme['c-500']}>{timeStr}</Text>
}

const PlayTimeMax = memo(({ timeStr }: { timeStr: string }) => {
  const theme = useTheme()
  return <Text color={theme['c-500']}>{timeStr}</Text>
})

export default () => {
  const t = useI18n()
  const { maxPlayTimeStr, nowPlayTimeStr, progress, maxPlayTime } = useProgress()
  const buffered = useBufferProgress()
  const playQuality = usePlayQuality()
  const qualityLabel = getPlayQualityLabel(playQuality)
  // v25.9：实际交付链接的子源（平台名 + 子源名；子源未知时仅平台名）
  const playSource = usePlaySource()
  const playMusicInfo = usePlayMusicInfo()
  const src = (playMusicInfo?.musicInfo as any)?.source
  const platformName = src && src != 'local' ? t(`source_real_${src}` as any) : ''
  const sourceLabel = (playSource?.name && platformName && playSource.name != platformName)
    ? `${platformName} · ${playSource.name}`
    : (playSource?.name || platformName || '')
  // console.log('render playInfo')

  return (
    <View style={styles.container}>
      <View style={styles.status} >
        {
          qualityLabel
            ? <PlayQualityTag label={qualityLabel} prefix={t('quality_tag')} size={11} />
            : null
        }
        {
          sourceLabel
            ? <View style={styles.sourceGap}><PlayQualityTag label={sourceLabel} prefix={t('source_tag')} size={11} /></View>
            : null
        }
        <Status />
      </View>
      <View style={{ flexGrow: 0, flexShrink: 0, flexDirection: 'row' }} >
        <PlayTimeCurrent timeStr={nowPlayTimeStr} />
        <Text color={theme['c-500']}> / </Text>
        <PlayTimeMax timeStr={maxPlayTimeStr} />
      </View>
      <View style={[StyleSheet.absoluteFill, styles.progress]}><Progress progress={progress} duration={maxPlayTime} buffered={buffered} /></View>
    </View>
  )
}


const styles = createStyle({
  container: {
    // marginLeft: 15,
    marginVertical: 5,
    height: 26,
    // flex: 1,
    paddingVertical: 2,
    paddingHorizontal: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progress: {
    flexGrow: 1,
    flexShrink: 0,
    flexDirection: 'column',
    justifyContent: 'center',
  },
  info: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    // alignItems: 'center',
    // backgroundColor: '#ccc',
  },
  status: {
    flexGrow: 1,
    flexShrink: 1,
    paddingRight: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sourceGap: {
    marginLeft: 6,
  },
})
// const styles = createStyle({
//   container: {
//     flex: 1,
//     // height: 16,
//     // flexGrow: 0,
//     // flexShrink: 0,
//     // flexDirection: 'column',
//     // justifyContent: 'center',
//     // alignItems: 'center',
//     // marginBottom: -1,
//     // backgroundColor: '#ccc',
//     // overflow: 'hidden',
//     // height:
//     // position: 'absolute',
//     // width: '100%',
//     // top: 0,
//     paddingVertical: 2,
//     paddingHorizontal: 5,
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//   },
//   progress: {
//     paddingVertical: 2,
//     zIndex: 100,
//   },
//   status: {
//     flexGrow: 1,
//     flexShrink: 1,
//     paddingRight: 5,
//   },
// })
