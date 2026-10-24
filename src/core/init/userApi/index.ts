import { type InitParams, onScriptAction, sendAction, type ResponseParams, type UpdateInfoParams, type RequestParams } from '@/utils/nativeModules/userApi'
import { log, setUserApiList, setUserApiStatus } from '@/core/userApi'
import settingState from '@/store/setting/state'
import BackgroundTimer from 'react-native-background-timer'
import RNFS from 'react-native-fs'
import { fetchData } from './request'
import { getUserApiList, addUserApi, removeUserApi } from '@/utils/data'
import { getData, saveData } from '@/plugins/storage'
import { confirmDialog, openUrl, tipDialog } from '@/utils/tools'
import { storageDataPrefix } from '@/config/constant'


export default async(setting: LX.AppSetting) => {
  const userApiRequestMap = new Map<string, { resolve: (value: ResponseParams['result']) => void, reject: (error: Error) => void, timeout: number }>()
  const scriptRequestMap = new Map<string, { request: Promise<any>, abort: () => void }>()

  const cancelRequest = (requestKey: string, message: string) => {
    const target = scriptRequestMap.get(requestKey)
    if (!target) return
    scriptRequestMap.delete(requestKey)
    target.abort()
  }
  const sendScriptRequest = (requestKey: string, url: string, options: RequestParams['options']) => {
    let req = fetchData(url, options)
    req.request.then(response => {
      // console.log(response)
      sendAction('response', {
        error: null,
        requestKey,
        response,
      })
    }).catch(err => {
      sendAction('response', {
        error: err.message,
        requestKey,
        response: null,
      })
    }).finally(() => {
      scriptRequestMap.delete(requestKey)
    })
    scriptRequestMap.set(requestKey, req)
  }
  const sendUserApiRequest = async(data: LX.UserApi.UserApiRequestParams) => {
    const handleApiUpdate = () => {
      const target = userApiRequestMap.get(data.requestKey)
      if (!target) return
      userApiRequestMap.delete(data.requestKey)
      BackgroundTimer.clearTimeout(target.timeout)
      target.reject(new Error('request failed'))
    }
    const requestPromise = new Promise<ResponseParams['result']>((resolve, reject) => {
      userApiRequestMap.set(data.requestKey, {
        resolve,
        reject,
        timeout: BackgroundTimer.setTimeout(() => {
          const target = userApiRequestMap.get(data.requestKey)
          if (!target) return
          userApiRequestMap.delete(data.requestKey)
          target.reject(new Error('request timeout'))
        }, 20_000),
      })
      sendAction('request', data)
    }).finally(() => {
      global.state_event.off('apiSourceUpdated', handleApiUpdate)
    })
    global.state_event.on('apiSourceUpdated', handleApiUpdate)
    return requestPromise
  }
  const handleUserApiResponse = ({ status, result, requestKey, errorMessage }: ResponseParams) => {
    const target = userApiRequestMap.get(requestKey)
    if (!target) return
    userApiRequestMap.delete(requestKey)
    BackgroundTimer.clearTimeout(target.timeout)
    if (status) target.resolve(result)
    else target.reject(new Error(errorMessage ?? 'failed'))
  }
  const handleStateChange = ({ status, errorMessage, info }: InitParams) => {
    // console.log(status, message, info)
    setUserApiStatus(status, errorMessage)
    if (!info || info.id !== settingState.setting['common.apiSource']) return
    if (status) {
      if (info.sources) {
        let apis: any = {}
        let qualitys: LX.QualityList = {}
        for (const [source, { actions, type, qualitys: sourceQualitys }] of Object.entries(info.sources)) {
          if (type != 'music') continue
          apis[source as LX.Source] = {}
          for (const action of actions) {
            switch (action) {
              case 'musicUrl':
                apis[source].getMusicUrl = (songInfo: LX.Music.MusicInfo, type: LX.Quality) => {
                  const requestKey = `request__${Math.random().toString().substring(2)}`
                  return {
                    canceleFn() {
                      // userApiRequestCancel(requestKey)
                    },
                    promise: sendUserApiRequest({
                      requestKey,
                      data: {
                        source,
                        action: 'musicUrl',
                        info: {
                          type,
                          musicInfo: songInfo,
                        },
                      },
                      // eslint-disable-next-line @typescript-eslint/promise-function-async
                    }).then(res => {
                      // 音源返回实际交付音质（res.data.type，v11.13+）；旧音源无该字段时回退请求音质
                      return { type: (res.data as { type?: LX.Quality })?.type ?? type, url: (res.data as { url: string }).url }
                    }).catch(err => {
                      console.log(err.message)
                      throw err
                    }),
                  }
                }
                break
              case 'lyric':
                apis[source].getLyric = (songInfo: LX.Music.MusicInfo) => {
                  const requestKey = `request__${Math.random().toString().substring(2)}`
                  return {
                    canceleFn() {
                      // userApiRequestCancel(requestKey)
                    },
                    promise: sendUserApiRequest({
                      requestKey,
                      data: {
                        source,
                        action: 'lyric',
                        info: {
                          type,
                          musicInfo: songInfo,
                        },
                      },
                      // eslint-disable-next-line @typescript-eslint/promise-function-async
                    }).then(res => {
                      // console.log(res)
                      return res.data
                    }).catch(async err => {
                      console.log(err.message)
                      return Promise.reject(err)
                    }),
                  }
                }
                break
              case 'pic':
                apis[source].getPic = (songInfo: LX.Music.MusicInfo) => {
                  const requestKey = `request__${Math.random().toString().substring(2)}`
                  return {
                    canceleFn() {
                      // userApiRequestCancel(requestKey)
                    },
                    promise: sendUserApiRequest({
                      requestKey,
                      data: {
                        source,
                        action: 'pic',
                        info: {
                          type,
                          musicInfo: songInfo,
                        },
                      },
                      // eslint-disable-next-line @typescript-eslint/promise-function-async
                    }).then(res => {
                      // console.log(res)
                      return res.data
                    }).catch(async err => {
                      console.log(err.message)
                      return Promise.reject(err)
                    }),
                  }
                }
                break
              default:
                break
            }
          }
          qualitys[source as LX.Source] = sourceQualitys
        }
        global.lx.qualityList = qualitys
        global.lx.apis = apis
        global.state_event.apiSourceUpdated(settingState.setting['common.apiSource'])
      }
    } else {
      if (errorMessage) {
        void tipDialog({
          message: `${global.i18n.t('user_api__init_failed_alert', { name: info.name })}\n${errorMessage}`,
          // selection: true,
          btnText: global.i18n.t('ok'),
        })
      }
    }
    if (!global.lx.apiInitPromise[1]) global.lx.apiInitPromise[2](status)
  }
  const showUpdateAlert = ({ name, log, updateUrl }: UpdateInfoParams) => {
    if (updateUrl) {
      void confirmDialog({
        message: `${global.i18n.t('user_api_update_alert', { name })}\n${log}`,
        // selection: true,
        // showCancel: true,
        confirmButtonText: global.i18n.t('user_api_update_alert_open_url'),
        cancelButtonText: global.i18n.t('close'),
      }).then(confirm => {
        if (!confirm) return
        setTimeout(() => {
          void openUrl(updateUrl)
        }, 300)
      })
    } else {
      void tipDialog({
        message: `${global.i18n.t('user_api_update_alert', { name })}\n${log}`,
        // selection: true,
        btnText: global.i18n.t('ok'),
      })
    }
  }

  onScriptAction((event) => {
    // console.log('script actuon: ', event)
    switch (event.action) {
      case 'init':
        if ((event as unknown as { errorMessage?: string }).errorMessage) event.data.errorMessage = (event as unknown as { errorMessage: string }).errorMessage
        handleStateChange(event.data)
        break
      case 'response':
        handleUserApiResponse(event.data)
        break
      case 'request':
        sendScriptRequest(event.data.requestKey, event.data.url, event.data.options)
        break
      case 'cancelRequest':
        cancelRequest(event.data, 'request canceled')
        break
      case 'showUpdateAlert':
        showUpdateAlert(event.data)
        break
      case 'log':
        switch ((event as unknown as { type: keyof typeof log }).type) {
          case 'log':
          case 'info':
            log.info((event as unknown as { log: string }).log)
            break
          case 'error':
            log.error((event as unknown as { log: string }).log)
            break
          case 'warn':
            log.warn((event as unknown as { log: string }).log)
            break
          default:
            break
        }
        break
      default:
        break
    }
  })

  // 自动导入内置音源：首次导入 + 内置版本更新时自动升级
  // 内置音源脚本随 App 构建更新（CI 每次拉音源仓库最新版），但用户数据里已导入的脚本不会
  // 自动更新——通过对比"内置脚本版本"与"已导入版本"（存储标记），新版则重新导入替换。
  const userApiList = await getUserApiList()
  const builtinSourceKey = 'has_imported_builtin_source'
  const builtinVersionKey = 'imported_builtin_source_version'
  const hasImportedBuiltin = await getData<boolean>(builtinSourceKey)
  const importedVersion = (await getData<string>(builtinVersionKey)) || ''
  const BUILTIN_NAME = '豆包定制'
  const builtinExists = userApiList.some(api => api.name.includes(BUILTIN_NAME))

  // 读取内置脚本并解析聚合源版本号（logInfo 里的 v11.13 形式；匹配失败则仅首次导入）
  let needImport = !hasImportedBuiltin || !builtinExists
  let builtinVer = ''
  try {
    const probeScript = await RNFS.readFileAssets('builtin_source.js', 'utf8')
    const m = probeScript.match(/聚合音源\s*v(\d+(?:\.\d+)*)/)
    builtinVer = m ? m[1] : ''
    if (builtinVer && builtinVer != importedVersion) needImport = true
  } catch (e) {
    console.warn('Failed to read builtin source version:', e)
  }

  if (needImport) {
    try {
      // RN 的 fetch 基于 OkHttp，不支持 file:// 协议，读取内置 assets 必须用 react-native-fs
      const script = await RNFS.readFileAssets('builtin_source.js', 'utf8')
      if (script && script.length > 1000) {
        // 已有旧版内置源时先删除，避免重复添加多个豆包定制源
        let oldIds: string[] = []
        if (builtinExists) {
          oldIds = userApiList.filter(api => api.name.includes(BUILTIN_NAME)).map(api => api.id)
          try { await removeUserApi(oldIds) } catch (e) { console.warn('Failed to remove old builtin source:', e) }
          for (const id of oldIds) {
            const idx = userApiList.findIndex(api => api.id === id)
            if (idx >= 0) userApiList.splice(idx, 1)
          }
        }
        const newApi = await addUserApi(script)
        if (!userApiList.some(api => api.id === newApi.id)) {
          userApiList.push(newApi)
          // 仅当当前正使用旧内置源（或未选音源）时切换到新内置源；
          // 用户手动选择的其它音源保持不变，不被升级覆盖
          const curSource = setting['common.apiSource'] as string | undefined
          const usingOldBuiltin = !curSource || oldIds.includes(curSource)
          if (usingOldBuiltin) {
            setting['common.apiSource'] = newApi.id
            // 持久化 apiSource，避免仅内存生效导致重启后选中状态丢失
            try {
              const stored = await getData<Partial<LX.AppSetting>>(storageDataPrefix.setting)
              if (stored) {
                stored['common.apiSource'] = newApi.id
                await saveData(storageDataPrefix.setting, stored)
              }
            } catch (e) {
              console.warn('Failed to persist apiSource:', e)
            }
          }
        }
        // 标记已导入过，并记录导入的版本（用于下次对比）
        await saveData(builtinSourceKey, true)
        if (builtinVer) await saveData(builtinVersionKey, builtinVer)
        console.log('builtin source imported/updated:', newApi.name, builtinVer || '')
      }
    } catch (e) {
      console.warn('Failed to load builtin source:', e)
    }
  }
  setUserApiList(userApiList)
}
