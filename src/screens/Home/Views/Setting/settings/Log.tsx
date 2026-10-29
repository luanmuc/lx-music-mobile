import { memo, useRef, useState, useEffect } from 'react'
import { View } from 'react-native'
import { getLogs, getDebugLogs, clearLogs } from '@/utils/log'

import Section from '../components/Section'
import SubTitle from '../components/SubTitle'
import Button from '../components/Button'
import { createStyle, toast } from '@/utils/tools'
import ConfirmAlert, { type ConfirmAlertType } from '@/components/common/ConfirmAlert'
import CheckBoxItem from '../components/CheckBoxItem'
import { useI18n } from '@/lang'
import Text from '@/components/common/Text'

// 独立「运行日志」页（重构版）：
// - 从「清理缓存」页提取，独立设置分组
// - 移除已停用同步功能的「记录同步日志」开关（同步功能已停用，syncSetting 已注释）
// - 保留「记录自定义源日志」（聚合音源解析/探测/健康日志）+ 查看/清空
// - 查看日志合并读 error.log（全局错误+音源日志+运行诊断）与 lx_debug_log.txt（调试日志）
export default memo(() => {
  const t = useI18n()
  const alertRef = useRef<ConfirmAlertType>(null)
  const [logText, setLogText] = useState('')
  const isUnmountedRef = useRef(true)
  const [isEnableUserApiLog, setIsEnableUserApiLog] = useState(global.lx.isEnableUserApiLog)

  const getErrorLog = () => {
    // 合并读全局错误日志（error.log，含音源日志与运行诊断）与调试日志（lx_debug_log.txt）
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
    <Section title={t('setting_log')}>
      <Text size={12} style={styles.desc}>{t('setting_log_desc')}</Text>
      <View style={styles.checkBox}>
        <CheckBoxItem check={isEnableUserApiLog} label={t('setting_other_log_user_api_log')} onChange={handleSetEnableUserApiLog} />
      </View>
      <SubTitle title={t('setting_log_view')}>
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
    </Section>
  )
})

const styles = createStyle({
  checkBox: {
    marginTop: 10,
  },
  btn: {
    marginTop: 10,
  },
  desc: {
    marginTop: 8,
    lineHeight: 20,
  },
})
