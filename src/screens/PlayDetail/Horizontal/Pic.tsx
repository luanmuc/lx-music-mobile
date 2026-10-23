import { memo, useEffect, useState } from 'react'
import { View } from 'react-native'
// import { useLayout } from '@/utils/hooks'
import { usePlayerMusicInfo } from '@/store/player/hook'
import { useWindowSize } from '@/utils/hooks'
import { useNavigationComponentDidAppear } from '@/navigation'
import { NAV_SHEAR_NATIVE_IDS } from '@/config/constant'
import { createStyle } from '@/utils/tools'
import { HEADER_HEIGHT } from './components/Header'
import { BTN_WIDTH } from './MoreBtn/Btn'
import { marginLeft } from './constant'
import Image from '@/components/common/Image'
import ImageFullScreen from '@/components/common/ImageFullScreen'
import { useStatusbarHeight } from '@/store/common/hook'
import commonState from '@/store/common/state'
import { downloadFile, mkdir, temporaryDirectoryPath } from '@/utils/fs'
import { saveImageToGallery } from '@/utils/nativeModules/utils'
import { toast } from '@/utils/tools'
import { useI18n } from '@/lang'


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

export default memo(({ componentId }: { componentId: string }) => {
  const musicInfo = usePlayerMusicInfo()
  const { width: winWidth, height: winHeight } = useWindowSize()
  const statusBarHeight = useStatusbarHeight()
  const t = useI18n()

  const [animated, setAnimated] = useState(!!commonState.componentIds.playDetail)
  const [pic, setPic] = useState(musicInfo.pic)
  useEffect(() => {
    if (animated) setPic(musicInfo.pic)
  }, [musicInfo.pic, animated])

  useNavigationComponentDidAppear(componentId, () => {
    setAnimated(true)
  })

  let imgWidth = Math.min((winWidth * 0.45 - marginLeft - BTN_WIDTH) * 0.76, (winHeight - statusBarHeight - HEADER_HEIGHT) * 0.62)
  imgWidth -= imgWidth * (global.lx.fontSize - 1) * 0.3
  let contentHeight = (winHeight - statusBarHeight - HEADER_HEIGHT) * 0.66
  contentHeight -= contentHeight * (global.lx.fontSize - 1) * 0.2

  return (
    <View style={{ ...styles.container, height: contentHeight }}>
      <View style={{ ...styles.content, elevation: animated ? 3 : 0 }}>
        <ImageFullScreen pic={pic}>
          <Image url={pic} nativeID={NAV_SHEAR_NATIVE_IDS.playDetail_pic} onLongPress={pic ? () => void savePicToGallery(pic, t) : undefined} style={{
            width: imgWidth,
            height: imgWidth,
            borderRadius: 2,
          }} />
        </ImageFullScreen>
      </View>
    </View>
  )
})

const styles = createStyle({
  container: {
    flexShrink: 1,
    flexGrow: 0,
    justifyContent: 'center',
    alignItems: 'center',
    // backgroundColor: 'rgba(0,0,0,0.1)',
    overflow: 'hidden',
  },
  content: {
    // elevation: 3,
    backgroundColor: 'rgba(0,0,0,0)',
    borderRadius: 4,
  },
})
