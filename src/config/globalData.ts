import { version } from '../../package.json'
import { buildNumber } from './buildNumber'
import { createAppEventHub } from '@/event/appEvent'
import { createListEventHub } from '@/event/listEvent'
import { createDislikeEventHub } from '@/event/dislikeEvent'
import { createStateEventHub } from '@/event/stateEvent'
if (process.versions == null) {
  // @ts-expect-error
  process.versions = {
    // 显示真实构建版本：如 1.9.1-b13（CI 注入 buildNumber，本地开发为空则显示 1.9.1）
    app: buildNumber ? `${version}-${buildNumber}` : version,
  }
} else process.versions.app = buildNumber ? `${version}-${buildNumber}` : version

// global.i18n = null

// let screenW = Dimensions.get('window').width
// let screenH = Dimensions.get('window').height
// if (screenW > screenH) {
//   const temp = screenW
//   screenW = screenH
//   screenH = temp
// }


global.lx = {
  fontSize: 1,
  playerStatus: {
    isInitialized: false,
    isRegisteredService: false,
    isIniting: false,
  },

  restorePlayInfo: null,
  // allList: null,
  // globalObj: null,
  // listScrollPosition: {},
  // listSort: {},

  isScreenKeepAwake: false,

  // 是否播放完后退出应用
  isPlayedStop: false,

  // prevListPlayIndex: -1,

  // syncKeyInfo: {},

  isEnableSyncLog: false,
  isEnableUserApiLog: false,

  playerTrackId: '',

  gettingUrlId: '',

  qualityList: {},
  apis: {},
  apiInitPromise: [Promise.resolve(false), true, () => {}],

  jumpMyListPosition: false,

  settingActiveId: 'basic',

  homePagerIdle: true,

  // syncKeyInfo: initValue as LX.Sync.KeyInfo,

  // windowInfo: {
  //   screenW,
  //   screenH,
  //   fontScale: PixelRatio.getFontScale(),
  //   pixelRatio: PixelRatio.get(),
  //   screenPxW: PixelRatio.getPixelSizeForLayoutSize(screenW),
  //   screenPxH: PixelRatio.getPixelSizeForLayoutSize(screenH),
  // },
}

global.app_event = createAppEventHub()
global.list_event = createListEventHub()
global.dislike_event = createDislikeEventHub()
global.state_event = createStateEventHub()
