import { useEffect, useMemo, useRef, useState } from 'react'
import { TouchableOpacity, View } from 'react-native'
// import { useLayout } from '@/utils/hooks'
import { createStyle } from '@/utils/tools'
import { usePlayerMusicInfo } from '@/store/player/hook'
import { useWindowSize } from '@/utils/hooks'
import { NAV_SHEAR_NATIVE_IDS } from '@/config/constant'
import { useNavigationComponentDidAppear } from '@/navigation'
import { HEADER_HEIGHT } from './components/Header'
import Image from '@/components/common/Image'
import ImageFullScreen from '@/components/common/ImageFullScreen'
import { useStatusbarHeight } from '@/store/common/hook'
import commonState from '@/store/common/state'
import { downloadFile, mkdir, temporaryDirectoryPath } from '@/utils/fs'
import { saveImageToGallery } from '@/utils/nativeModules/utils'
import { toast } from '@/utils/tools'
import { useI18n } from '@/lang'
import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'
import { getSourceName } from '@/components/player/SourceName'
import playerState from '@/store/player/state'
import MusicToggleModal, { type MusicToggleModalType } from '@/screens/Home/Views/Mylist/MusicList/MusicToggleModal'


// 长按封面保存到相册（借鉴 MusicFree）
const savePicToGallery = async(url: string, t: ReturnType<typeof useI18n>) => {
  try {
    let localPath: string
    if (url.startsWith('/')) localPath = url
    else if (url.startsWith('file://')) localPath = url.replace('file://', '')
    else {
      const dir = `${temporaryDirectoryPath}/cover/`
      await mkdir(dir)
      localPath = `${dir}${Date.now()}.jpg`
      const job = downloadFile(url, localPath)
      const res = await job.promise
      if (res.statusCode != 200) throw new Error(`下载封面失败：HTTP ${res.statusCode}`)
    }
    await saveImageToGallery(localPath)
    toast(t('pic_saved'))
  } catch (err) {
    console.log('保存封面失败', err)
    toast(t('pic_save_failed'))
  }
}


export default ({ componentId }: { componentId: string }) => {
  const musicInfo = usePlayerMusicInfo()
  const { width: winWidth, height: winHeight } = useWindowSize()
  const statusBarHeight = useStatusbarHeight()
  const t = useI18n()
  const theme = useTheme()
  const musicToggleRef = useRef<MusicToggleModalType>(null)

  // 当前播放歌曲的完整信息（含 source/meta），用于判断是否在线歌曲并取平台名
  const curInfo = playerState.playMusicInfo.musicInfo
  const isOnline = !!curInfo && !('progress' in curInfo)
  const sourceName = isOnline ? getSourceName((curInfo as LX.Music.MusicInfoOnline).source) : ''

  const openToggleSource = () => {
    if (!isOnline || !curInfo) return
    musicToggleRef.current?.show({
      musicInfo: curInfo as LX.Music.MusicInfo,
      listId: playerState.playMusicInfo.listId ?? '',
    })
  }

  const [animated, setAnimated] = useState(!!commonState.componentIds.playDetail)
  const [pic, setPic] = useState(musicInfo.pic)
  useEffect(() => {
    if (animated) setPic(musicInfo.pic)
  }, [musicInfo.pic, animated])

  useNavigationComponentDidAppear(componentId, () => {
    setAnimated(true)
  })
  // console.log('render pic')

  const style = useMemo(() => {
    const imgWidth = Math.min(winWidth * 0.8, (winHeight - statusBarHeight - HEADER_HEIGHT) * 0.5)
    return {
      width: imgWidth,
      height: imgWidth,
      borderRadius: 2,
    }
  }, [statusBarHeight, winHeight, winWidth])

  return (
    <View style={styles.container}>
      <View style={{ ...styles.content, elevation: animated ? 3 : 0 }}>
        <ImageFullScreen pic={pic}>
          <Image url={pic} nativeID={NAV_SHEAR_NATIVE_IDS.playDetail_pic} style={style} onLongPress={pic ? () => void savePicToGallery(pic, t) : undefined} />
        </ImageFullScreen>
      </View>
      {/* 当前播放源（平台）标签：点击弹出换源面板 */}
      {isOnline ? (
        <TouchableOpacity style={styles.sourceTag} onPress={openToggleSource} activeOpacity={0.6}>
          <Text size={12} color={theme['c-primary-font-active']}>{sourceName}</Text>
          <Text size={12} color={theme['c-primary-font-active']} style={styles.sourceTagArrow}>▾</Text>
        </TouchableOpacity>
      ) : null}
      <MusicToggleModal ref={musicToggleRef} />
    </View>
  )
}

const styles = createStyle({
  container: {
    flexGrow: 1,
    flexShrink: 1,
    justifyContent: 'center',
    alignItems: 'center',
    // backgroundColor: 'rgba(0,0,0,0.1)',
  },
  content: {
    // elevation: 3,
    backgroundColor: 'rgba(0,0,0,0)',
    borderRadius: 4,
  },
  sourceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sourceTagArrow: {
    marginLeft: 4,
  },
})
