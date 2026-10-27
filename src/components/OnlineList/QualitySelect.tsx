import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import { TouchableOpacity, View } from 'react-native'
import Popup, { type PopupType } from '@/components/common/Popup'
import Button from '@/components/common/Button'
import Text from '@/components/common/Text'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { FULL_QUALITYS_LIST } from '@/core/music/utils'

export const QUALITY_NAMES: Record<string, string> = {
  flac24bit: 'Hi-Res 无损',
  flac: '无损',
  '320k': '320K',
  '128k': '128K',
  '192k': '192K',
  ape: 'APE',
  wav: 'WAV',
}

export interface QualitySelectType {
  show: (musicInfo: LX.Music.MusicInfoOnline) => void
}
interface Props {
  onConfirm: (musicInfo: LX.Music.MusicInfoOnline, quality: LX.Quality) => void
}

export default forwardRef<QualitySelectType, Props>(({ onConfirm }, ref) => {
  const theme = useTheme()
  const [visible, setVisible] = useState(false)
  const popupRef = useRef<PopupType>(null)
  const musicInfoRef = useRef<LX.Music.MusicInfoOnline | null>(null)
  const [quality, setQuality] = useState<LX.Quality>('flac24bit')

  useImperativeHandle(ref, () => ({
    show(musicInfo) {
      musicInfoRef.current = musicInfo
      // 获取当前歌曲实际支持的音质列表
      const supportedQualitys = (musicInfo.meta?._qualitys || {}) as Record<string, boolean>
      // 按高到低排列，只保留实际支持的（含 192k/ape/wav 等完整音质）
      const available = FULL_QUALITYS_LIST.filter(q => supportedQualitys[q])
      // 默认选最高的可用音质
      setQuality(available[0] || '128k')
      setVisible(true)
      requestAnimationFrame(() => {
        popupRef.current?.setVisible(true)
      })
    },
  }))

  const handleConfirm = () => {
    if (!musicInfoRef.current) return
    onConfirm(musicInfoRef.current, quality)
    popupRef.current?.setVisible(false)
    setVisible(false)
  }

  const handleHide = () => {
    setVisible(false)
  }

  return (
    visible
      ? (
          <Popup
            ref={popupRef}
            title="选择下载音质"
            onHide={handleHide}
            bgHide
            closeBtn
          >
            <View style={styles.content}>
              <Text size={13} color={theme['c-font-label']} style={styles.tip}>默认下载最高音质，源不支持时将自动使用可用音质</Text>
              {
                // 只显示当前歌曲实际支持的音质（完整音质列表）
                (() => {
                  const musicInfo = musicInfoRef.current
                  if (!musicInfo) return null
                  const supported = (musicInfo.meta?._qualitys || {}) as Record<string, boolean>
                  const availableList = FULL_QUALITYS_LIST.filter(q => supported[q])
                  return availableList.map((q) => {
                    const isActive = quality == q
                    return (
                      <TouchableOpacity
                        key={q}
                        style={styles.item}
                        onPress={() => { setQuality(q) }}
                      >
                        <Text
                          size={14}
                          style={styles.itemText}
                          color={isActive ? theme['c-primary'] : theme['c-font']}
                        >{QUALITY_NAMES[q] ?? q}</Text>
                        {
                          isActive
                            ? <Text size={14} color={theme['c-primary']}>✓</Text>
                            : null
                        }
                      </TouchableOpacity>
                    )
                  })
                })()
              }
              <View style={styles.footer}>
                <Button
                  style={styles.footerBtn}
                  onPress={() => {
                    popupRef.current?.setVisible(false)
                    setVisible(false)
                  }}
                >
                  <Text color={theme['c-font-label']} size={14}>取消</Text>
                </Button>
                <Button style={styles.footerBtn} onPress={handleConfirm}>
                  <Text color={theme['c-primary-font']} size={14}>开始下载</Text>
                </Button>
              </View>
            </View>
          </Popup>
        )
      : null
  )
})

const styles = createStyle({
  content: {
    minWidth: 260,
    paddingLeft: 15,
    paddingRight: 15,
    paddingTop: 10,
    paddingBottom: 15,
  },
  tip: {
    marginBottom: 8,
    lineHeight: 18,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 9,
    paddingBottom: 9,
    paddingLeft: 10,
    paddingRight: 10,
  },
  itemText: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  footerBtn: {
    marginLeft: 10,
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 7,
    paddingBottom: 7,
  },
})
