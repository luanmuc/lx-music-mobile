import { memo, useRef, useState, useEffect } from 'react'
import { View } from 'react-native'
import { getLogs, clearLogs, getDebugLogs } from '@/utils/log'
// import { gzip, ungzip } from 'pako'

import SubTitle from '../../components/SubTitle'
import Button from '../../components/Button'
import { createStyle, toast } from '@/utils/tools'
import ConfirmAlert, { type ConfirmAlertType } from '@/components/common/ConfirmAlert'
import CheckBoxItem from '../../components/CheckBoxItem'
import { useI18n } from '@/lang'
import Text from '@/components/common/Text'

export default memo(() => {
  const t = useI18n()
  const alertRef = useRef<ConfirmAlertType>(null)
  const [logText, setLogText] = useState('')
  const isUnmountedRef = useRef(true)
  const [isEnableSyncErrorLog, setIsEnableSyncErrorLog] = useState(global.lx.isEnableSyncLog)
  const [isEnableUserApiLog, setIsEnableUserApiLog] = useState(global.lx.isEnableUserApiLog)

  const getErrorLog = () => {
    // 合并读全局错误日志（error.log，含音源日志）与调试日志（lx_debug_log.txt，含音源标签诊断）
    // ——原实现只读 error.log，logger 通道的诊断日志在「查看日志」里永远不可见（日志系统缺陷，已修）
    void Promise.all([getLogs(), getDebugLogs()]).then(([errLog, dbgLog]) => {
      if (isUnmountedRef.current) return
      const parts: string[] = []
      if (errLog.trim()) {
        const logArr = errLog.split(/^----lx log----\n|\n----lx log----\n|\n----lx log----$/)
        parts.push(logArr.reverse().join('\n\n').replace(/^\n+|\n+$/, ''))
      }
      if (dbgLog.trim()) {
        parts.push('==== 调试日志 ====\n' + dbgLog.trim().split('\n').reverse().join('\n'))
      }
      setLogText(parts.join('\n\n'))
    })
  }

  const openLogModal = () => {
    getErrorLog()
    alertRef.current?.setVisible(true)
  }

  const handleCleanLog = () => {
    void clearLogs().then(() => {
      toast(t('setting_other_log_tip_clean_success'))
      getErrorLog()
    })
  }

  const handleSetEnableSyncErrorLog = (enable: boolean) => {
    setIsEnableSyncErrorLog(enable)
    global.lx.isEnableSyncLog = enable
  }

  const handleSetEnableUserApiLog = (enable: boolean) => {
    setIsEnableUserApiLog(enable)
    global.lx.isEnableUserApiLog = enable
  }


  useEffect(() => {
    isUnmountedRef.current = false
    return () => {
      isUnmountedRef.current = true
    }
  }, [])

  return (
    <>
      <SubTitle title={t('setting_other_log')}>
        <View style={styles.checkBox}>
          <CheckBoxItem check={isEnableSyncErrorLog} label={t('setting_other_log_sync_log')} onChange={handleSetEnableSyncErrorLog} />
          <CheckBoxItem check={isEnableUserApiLog} label={t('setting_other_log_user_api_log')} onChange={handleSetEnableUserApiLog} />
        </View>
        <View style={styles.btn}>
          <Button onPress={openLogModal}>{t('setting_other_log_btn_show')}</Button>
        </View>
      </SubTitle>
      <ConfirmAlert
        ref={alertRef}
        cancelText={t('setting_other_log_btn_hide')}
        confirmText={t('setting_other_log_btn_clean')}
        onConfirm={handleCleanLog}
        showConfirm={!!logText}
        reverseBtn={true}
        >
        <View onStartShouldSetResponder={() => true}>
          {
            logText
              ? <Text selectable size={13}>{ logText }</Text>
              : <Text size={13}>{t('setting_other_log_tip_null')}</Text>
          }
        </View>
      </ConfirmAlert>
    </>
  )
})

const styles = createStyle({
  checkBox: {
    // paddingTop: 10,
    paddingBottom: 15,
    marginLeft: -25,
  },
  btn: {
    flexDirection: 'row',
  },
})
