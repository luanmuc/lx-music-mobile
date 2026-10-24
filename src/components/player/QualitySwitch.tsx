import { memo, useRef, useState } from 'react'
import { TouchableOpacity, View, StyleSheet } from 'react-native'
import Popup, { type PopupType } from '@/components/common/Popup'
import Text from '@/components/common/Text'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { FULL_QUALITYS_LIST, TRY_QUALITYS_LIST } from '@/core/music/utils'
import { updateSetting } from '@/core/common'
import { setMusicUrl } from '@/core/player/player'
import playerState from '@/store/player/state'

const QUALITY_NAMES: Record<string, string> = {
  flac24bit: 'Hi-Res',
  flac: '无损',
  wav: 'WAV',
  ape: 'APE',
  '320k': '320K',
  '192k': '192K',
  '128k': '128K',
}

// 播放页音质切换按钮：显示当前实际音质，点击弹出音质选择，切换后按新音质重新加载当前歌曲
export default memo(({ quality }: { quality: string }) => {
  const theme = useTheme()
  const popupRef = useRef<PopupType>(null)
  const [visible, setVisible] = useState(false)
  const [list, setList] = useState<LX.Quality[]>([])
  const [selected, setSelected] = useState<LX.Quality>('128k')

  const show = () => {
    // 使用完整播放对象（含 meta），usePlayerMusicInfo 只有简化字段
    const musicInfo = playerState.playMusicInfo.musicInfo
    if (!musicInfo || 'progress' in musicInfo) return
    // 仅在线歌曲支持切换音质；本地歌曲（meta 无 _qualitys）点击无操作
    const meta = (musicInfo as LX.Music.MusicInfoOnline).meta
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

  const handleConfirm = (quality: LX.Quality = selected) => {
    const musicInfo = playerState.playMusicInfo.musicInfo
    if (!musicInfo) return
    // 更新全局播放音质设置，并按新音质重新获取/播放当前歌曲
    updateSetting({ 'player.playQuality': quality })
    void setMusicUrl(musicInfo, true)
    popupRef.current?.setVisible(false)
    setVisible(false)
  }

  const handleHide = () => {
    setVisible(false)
  }

  const label = quality ? (QUALITY_NAMES[quality] ?? quality) : '--'

  return (
    <View style={styles.wrap}>
      <TouchableOpacity onPress={show} hitSlop={styles.hitSlop} style={[styles.btn, { backgroundColor: theme['c-primary-alpha-900'] }]} activeOpacity={0.6}>
        <Text size={14} color={theme['c-primary-font-active']}>{label}</Text>
        <Text size={14} color={theme['c-primary-font-active']} style={styles.arrow}>▾</Text>
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
                          onPress={() => {
                            // 点一下即切换音质并重新加载当前歌曲（无需单独确认）
                            setSelected(q)
                            handleConfirm(q)
                          }}
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
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  arrow: {
    marginLeft: 4,
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
