import { memo, useRef, useState } from 'react'
import { TouchableOpacity, View, StyleSheet } from 'react-native'
import Popup, { type PopupType } from '@/components/common/Popup'
import Text from '@/components/common/Text'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { FULL_QUALITYS_LIST, TRY_QUALITYS_LIST } from '@/core/music/utils'
import { updateSetting } from '@/core/common'
import { setMusicUrl } from '@/core/player/player'
import QualityText from './QualityText'
import { usePlayerMusicInfo } from '@/store/player/hook'

const QUALITY_NAMES: Record<string, string> = {
  flac24bit: 'Hi-Res 无损',
  flac: '无损',
  wav: 'WAV',
  ape: 'APE',
  '320k': '320K',
  '192k': '192K',
  '128k': '128K',
}

// 播放页音质标签：点击弹出音质选择，切换后按新音质重新加载当前歌曲
export default memo(({ quality }: { quality: string }) => {
  const theme = useTheme()
  const musicInfo = usePlayerMusicInfo()
  const popupRef = useRef<PopupType>(null)
  const [visible, setVisible] = useState(false)
  const [list, setList] = useState<LX.Quality[]>([])
  const [selected, setSelected] = useState<LX.Quality>('128k')

  const show = () => {
    if (!musicInfo) return
    // 仅在线歌曲支持切换音质；本地歌曲（meta 无 _qualitys）点击无操作
    const meta = musicInfo.meta
    if (!meta || !('_qualitys' in meta)) return
    const supported = meta._qualitys as Record<string, boolean>
    const available = FULL_QUALITYS_LIST.filter(q => supported[q])
    const qualityList = available.length ? available : [...TRY_QUALITYS_LIST]
    setList(qualityList as LX.Quality[])
    setSelected((qualityList[0] || '128k') as LX.Quality)
    setVisible(true)
    requestAnimationFrame(() => {
      popupRef.current?.setVisible(true)
    })
  }

  const handleConfirm = () => {
    if (!musicInfo) return
    // 更新全局播放音质设置，并按新音质重新获取/播放当前歌曲
    updateSetting({ 'player.playQuality': selected })
    void setMusicUrl(musicInfo, true)
    popupRef.current?.setVisible(false)
    setVisible(false)
  }

  const handleHide = () => {
    setVisible(false)
  }

  return (
    <View style={styles.wrap}>
      <TouchableOpacity onPress={show} hitSlop={styles.hitSlop} style={styles.btn}>
        <QualityText quality={quality} />
      </TouchableOpacity>
      {
        visible
          ? (
              <Popup
                ref={popupRef}
                title="切换播放音质"
                onHide={handleHide}
                bgHide
                closeBtn
              >
                <View style={styles.content}>
                  {
                    list.map((q) => {
                      const isActive = selected == q
                      return (
                        <TouchableOpacity
                          key={q}
                          style={styles.item}
                          onPress={() => { setSelected(q) }}
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
                  }
                </View>
              </Popup>
            )
          : null
      }
    </View>
  )
})

const styles = createStyle({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hitSlop: { top: 6, bottom: 6, left: 6, right: 6 },
  content: {
    paddingLeft: 15,
    paddingRight: 15,
    paddingBottom: 15,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingBottom: 8,
  },
  itemText: {
    flex: 1,
  },
})
