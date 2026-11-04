import { memo, useCallback, useMemo, useRef, useState } from 'react'

import { View } from 'react-native'

import SubTitle from '../../components/SubTitle'
import CheckBox from '@/components/common/CheckBox'
import { createStyle, toast } from '@/utils/tools'
import { setApiSource } from '@/core/apiSource'
import { useI18n } from '@/lang'
import apiSourceInfo from '@/utils/musicSdk/api-source-info'
import { useSettingValue } from '@/store/setting/hook'
import { useStatus, useUserApiList } from '@/store/userApi'
import Button from '../../components/Button'
import UserApiEditModal, { type UserApiEditModalType } from './UserApiEditModal'
import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'
import { httpFetch } from '@/utils/request'
import { importUserApi, removeUserApi } from '@/core/userApi'
import { getUserApiScript } from '@/utils/data'

const apiSourceList = apiSourceInfo.map(api => ({
  id: api.id,
  name: api.name,
  disabled: api.disabled,
}))

const useActive = (id: string) => {
  const activeLangId = useSettingValue('common.apiSource')
  const isActive = useMemo(() => activeLangId == id, [activeLangId, id])
  return isActive
}

const Item = ({ id, name, desc, statusLabel, change }: {
  id: string
  name: string
  desc?: string
  statusLabel?: string
  change: (id: string) => void
}) => {
  const isActive = useActive(id)
  const theme = useTheme()
  // const [toggleCheckBox, setToggleCheckBox] = useState(false)
  return (
    <CheckBox marginBottom={5} check={isActive} onChange={() => { change(id) }} need>
      <Text style={styles.sourceLabel}>
        {name}
        {
          desc ? <Text style={styles.sourceDesc} color={theme['c-500']} size={13}>  {desc}</Text> : null
        }
        {
          statusLabel ? <Text style={styles.sourceStatus} size={13}>  {statusLabel}</Text> : null
        }
      </Text>
    </CheckBox>
  )
}

export default memo(() => {
  const t = useI18n()
  const list = useMemo(() => apiSourceList.map(s => ({
    // @ts-expect-error
    name: t(`setting_basic_source_${s.id}`) || s.name,
    id: s.id,
  })), [t])
  const setApiSourceId = useCallback((id: string) => {
    setApiSource(id)
  }, [])
  const userApiListRaw = useUserApiList()
  const apiStatus = useStatus()
  const apiSourceSetting = useSettingValue('common.apiSource')
  const userApiList = useMemo(() => {
    const getApiStatus = () => {
      let status
      if (apiStatus.status) status = t('setting_basic_source_status_success')
      else if (apiStatus.message == 'initing') status = t('setting_basic_source_status_initing')
      else status = t('setting_basic_source_status_failed')

      return status
    }
    return userApiListRaw.map(api => {
      const statusLabel = api.id == apiSourceSetting ? `[${getApiStatus()}]` : ''
      return {
        id: api.id,
        name: api.name,
        label: `${api.name}${statusLabel}`,
        desc: [/^\d/.test(api.version) ? `v${api.version}` : api.version].filter(Boolean).join(', '),
        statusLabel,
        // status: apiStatus.status,
        // message: apiStatus.message,
        // disabled: false,
      }
    })
  }, [userApiListRaw, apiStatus, apiSourceSetting, t])

  const modalRef = useRef<UserApiEditModalType>(null)
  const handleShow = () => {
    modalRef.current?.show()
  }

  // 更新音源：从 jsDelivr CDN 拉取 master 最新 lx-source.js（直接更新，不做版本号比对）
  const [updating, setUpdating] = useState(false)
  const handleUpdateSource = useCallback(async() => {
    if (updating) return
    setUpdating(true)
    toast('正在拉取最新音源...')
    try {
      // 加时间戳绕过 jsDelivr CDN 缓存，确保拉到的是 master 最新版
      const url = `https://cdn.jsdelivr.net/gh/luanmuc/backend-api@master/lx-source.js?t=${Date.now()}`
      // 15 秒超时控制
      const fetchPromise = httpFetch(url).promise.then(resp => resp.body) as string
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('拉取超时（15秒），请检查网络')), 15000)
      )
      const script = await Promise.race([fetchPromise, timeoutPromise]) as string
      if (script.length > 9_000_000) {
        toast('音源文件过大', 'long')
        return
      }

      // 提取版本号仅用于展示，不做比对
      const versionMatch = script.match(/@version\s+(\S+)/)
      const version = versionMatch ? versionMatch[1] : '未知'

      // 先导新的，成功了再删旧的（避免导失败全没了）
      const newApiInfo = await importUserApi(script)

      // 删掉所有"豆包定制"开头的旧音源（不删刚导入的那个）
      const oldIds = userApiListRaw
        .filter(api => api.name.includes('豆包定制') && api.id !== newApiInfo.id)
        .map(api => api.id)
      if (oldIds.length) {
        await removeUserApi(oldIds)
      }

      // 自动切换到新导入的音源
      await setApiSource(newApiInfo.id)

      toast(`已更新到最新版 v${version}，重启 App 生效`, 'long')
    } catch (err: any) {
      toast(`更新失败：${err.message}`, 'long')
    } finally {
      setUpdating(false)
    }
  }, [updating, userApiListRaw])

  return (
    <SubTitle title={t('setting_basic_source')}>
      <View style={styles.list}>
        {
          list.map(({ id, name }) => <Item name={name} id={id} key={id} change={setApiSourceId} />)
        }
        {
          userApiList.map(({ id, name, desc, statusLabel }) => <Item name={name} desc={desc} statusLabel={statusLabel} id={id} key={id} change={setApiSourceId} />)
        }
      </View>
      <View style={styles.btn}>
        <Button onPress={handleShow}>{t('setting_basic_source_user_api_btn')}</Button>
        <View style={{ width: 10 }} />
        <Button onPress={handleUpdateSource} disabled={updating}>
          {updating ? '更新中...' : '更新音源'}
        </Button>
      </View>
      <UserApiEditModal ref={modalRef} />
    </SubTitle>
  )
})

const styles = createStyle({
  list: {
    flexGrow: 0,
    flexShrink: 1,
    // flexDirection: 'row',
    // flexWrap: 'wrap',
  },
  btn: {
    marginTop: 10,
    flexDirection: 'row',
  },
  sourceLabel: {

  },
  sourceDesc: {

  },
  sourceStatus: {

  },
})
