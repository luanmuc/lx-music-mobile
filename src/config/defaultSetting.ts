const defaultSetting: LX.AppSetting = {
  version: '2.0',
  'common.isAutoTheme': false,
  'common.langId': null,
  'common.apiSource': '',
  'common.sourceNameType': 'real',
  'common.shareType': 'clipboard',
  'common.isAgreePact': true,
  'common.autoHidePlayBar': true,
  'common.drawerLayoutPosition': 'left',
  'common.homePageScroll': true,
  'common.allowProgressBarSeek': true,
  'common.showBackBtn': false,
  'common.showExitBtn': true,
  'common.useSystemFileSelector': true,
  'common.alwaysKeepStatusbarHeight': false,

  'player.startupAutoPlay': false,
  'player.startupPushPlayDetailScreen': false,
  'player.togglePlayMethod': 'listLoop',
  'player.playQuality': 'flac24bit',
  'player.isSavePlayTime': true,
  'player.volume': 1,
  'player.playbackRate': 1,
  'player.lrcOffset': 0, // 歌词时间轴偏移（秒，可负，借鉴 MusicFree setLyricOffset）
  'lastfm.enabled': false,
  'lastfm.apiKey': '',
  'lastfm.username': '',
  'lastfm.password': '',
  'player.cacheSize': '500',
  'player.timeoutExit': '',
  'player.timeoutExitPlayed': true,
  'player.isAutoCleanPlayedList': true,
  'player.isHandleAudioFocus': true,
  'player.isEnableAudioOffload': true,
  'player.isShowLyricTranslation': true,
  'player.isShowLyricRoma': true,
  'player.isShowNotificationImage': true,
  'player.isS2t': false,
  'player.isShowBluetoothLyric': false,
  'player.isShowBluetoothFullLyric': false,

  // 'playDetail.isZoomActiveLrc': false,
  // 'playDetail.isShowLyricProgressSetting': false,
  'playDetail.style.align': 'center',
  'playDetail.vertical.style.lrcFontSize': 210,
  'playDetail.horizontal.style.lrcFontSize': 220,
  'playDetail.isShowLyricProgressSetting': false,

  'desktopLyric.enable': true,
  'desktopLyric.isLock': true,
  'desktopLyric.width': 100,
  'desktopLyric.maxLineNum': 5,
  'desktopLyric.isSingleLine': false,
  'desktopLyric.showToggleAnima': true,
  'desktopLyric.position.x': 0,
  'desktopLyric.position.y': 0,
  'desktopLyric.textPosition.x': 'center',
  'desktopLyric.textPosition.y': 'center',
  'desktopLyric.style.fontSize': 180,
  'desktopLyric.style.opacity': 100,
  'desktopLyric.style.lyricUnplayColor': 'rgba(255, 255, 255, 1)',
  'desktopLyric.style.lyricPlayedColor': 'rgba(7, 197, 86, 1)',
  'desktopLyric.style.lyricShadowColor': 'rgba(0, 0, 0, 0.6)',

  'search.isShowHotSearch': true,
  'search.isShowHistorySearch': false,

  'list.isClickPlayList': true,
  'list.isShowSource': true,
  'list.isShowAlbumName': true,
  'list.isShowInterval': true,
  'list.isSaveScrollLocation': true,
  'list.addMusicLocationType': 'top',

  'download.fileName': '歌名 - 歌手',
  'download.onlyWifi': false,
  'download.maxTask': 2,
  'download.autoRetry': true,
  'download.notifyComplete': true,
  'download.dir': '',

  'sync.enable': false,

  // 'theme.id': 'blue_plus',
  'theme.id': 'naruto',
  'theme.lightId': 'naruto',
  'theme.darkId': 'black',
  'theme.hideBgDark': false,
  'theme.dynamicBg': false,
  'theme.fontShadow': false,
}


// 使用新年皮肤
if (new Date().getMonth() < 2) {
  defaultSetting['theme.id'] = 'happy_new_year'
  defaultSetting['desktopLyric.style.lyricPlayedColor'] = 'rgba(255, 18, 34, 1)'
}

export default defaultSetting
