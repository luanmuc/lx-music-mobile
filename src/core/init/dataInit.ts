// import { getPlayInfo } from '@/utils/data'
// import { log } from '@/utils/log'
import { init as musicSdkInit } from '@/utils/musicSdk'
import { getUserLists, setUserList } from '@/core/list'
import { setNavActiveId } from '../common'
import { getViewPrevState } from '@/utils/data'
import { bootLog } from '@/utils/bootLog'
import { getDislikeInfo, setDislikeInfo } from '@/core/dislikeList'
import { unlink } from '@/utils/fs'
import { TEMP_FILE_PATH } from '@/utils/tools'
import { getData, saveData } from '@/plugins/storage'
import { storageDataPrefix } from '@/config/constant'
import { initDownloadList } from '@/core/downloadManager'
// import { play, playList } from '../player/player'

// 默认屏蔽"开启电池优化"提示（只写一次；设置里仍保留"恢复电池优化提醒"入口）
const BATTERY_TIP_HIDDEN_KEY = '@has_set_battery_tip_hidden'

// const initPrevPlayInfo = async(appSetting: LX.AppSetting) => {
//   const info = await getPlayInfo()
//   global.lx.restorePlayInfo = null
//   if (!info?.listId || info.index < 0) return
//   const list = await getListMusics(info.listId)
//   if (!list[info.index]) return
//   global.lx.restorePlayInfo = info
//   await playList(info.listId, info.index)

//   if (appSetting['player.startupAutoPlay']) setTimeout(play)
// }

export default async(appSetting: LX.AppSetting) => {
  // 首次启动默认屏蔽电池优化提示
  const hasSetBatteryTipHidden = await getData<string>(BATTERY_TIP_HIDDEN_KEY)
  if (!hasSetBatteryTipHidden) {
    await saveData(BATTERY_TIP_HIDDEN_KEY, '1')
    await saveData(storageDataPrefix.ignoringBatteryOptimizationTipEnable, '1')
  }
  // await Promise.all([
  //   initUserApi(), // 自定义API
  // ]).catch(err => log.error(err))
  void musicSdkInit() // 初始化音乐sdk
  bootLog('User list init...')
  setUserList(await getUserLists()) // 获取用户列表
  setDislikeInfo(await getDislikeInfo()) // 获取不喜欢列表
  bootLog('User list inited.')
  // 恢复上次停留的页面；新装用户默认 nav_top（排行榜）由 DEFAULT_SETTING.viewPrevState.id 保证
  setNavActiveId((await getViewPrevState()).id)
  void initDownloadList() // 恢复下载任务列表
  void unlink(TEMP_FILE_PATH)
  // await initPrevPlayInfo(appSetting).catch(err => log.error(err)) // 初始化上次的歌曲播放信息
}
