import { memo, useState, useEffect, useCallback, useRef } from 'react'
import { StyleSheet, View } from 'react-native'

import Section from '../components/Section'
import SubTitle from '../components/SubTitle'
import Button from '../components/Button'
import { useI18n } from '@/lang'
import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'

// 音源健康快照（音源 getHealthSnapshot 聚合查询；v16.4：无样本 successRate/avgTime 为 null + 样本计数；v16.5：sleeping 休眠字段）
interface HealthItem {
  name: string
  maxQuality: string
  enabled: boolean
  successRate: number | null
  avgTime: number | null
  state: 'closed' | 'open' | 'half-open'
  reqCount: number
  probeCount: number
  sleeping: boolean
  healthScore: number
}
type HealthSnapshot = Record<string, HealthItem>

// 音源熔断器语义：closed=正常放行、open=熔断(冷却中)、half-open=半开试探
const STATE_COLOR: Record<HealthItem['state'], string> = {
  closed: '#52c41a',
  'half-open': '#faad14',
  open: '#ff4d4f',
}

// 获取当前音源的健康查询器（任一声明对应 action 的源均可，聚合结果与源无关）
const getQuerier = (fn: 'getHealth' | 'toggle' | 'probe'): ((...args: any[]) => { promise: Promise<any> }) | null => {
  const apis = (global as any).lx?.apis as Record<string, any> | undefined
  if (!apis) return null
  const sourceId = Object.keys(apis).find(id => typeof apis[id]?.[fn] === 'function')
  return sourceId ? apis[sourceId][fn] : null
}

// 无样本（未产生任何请求/探测）判定
const hasSample = (item: HealthItem) => (item.reqCount ?? 0) > 0 || (item.probeCount ?? 0) > 0

export default memo(() => {
  const t = useI18n()
  const theme = useTheme()
  const [snapshot, setSnapshot] = useState<HealthSnapshot | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [togglingId, setTogglingId] = useState('')
  const [probeInfo, setProbeInfo] = useState('')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadHealth = useCallback(async(silent = false) => {
    if (!silent) setLoading(true)
    setError('')
    try {
      const querier = getQuerier('getHealth')
      if (!querier) {
        setError(t('health_no_source'))
        setSnapshot(null)
        return
      }
      const { promise } = querier()
      const data = await promise
      setSnapshot(data as HealthSnapshot)
    } catch (e: any) {
      console.log(e)
      setError(String(e?.message || t('health_load_failed')))
    } finally {
      if (!silent) setLoading(false)
    }
  }, [t])

  // v16.5：面板停留自动刷新（30s 静默轮询），卸载清理
  useEffect(() => {
    void loadHealth()
    timerRef.current = setInterval(() => { void loadHealth(true) }, 30000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [loadHealth])

  // 手动探测：触发一轮健康探测（并发 ~6s）
  const runProbe = useCallback(async() => {
    const querier = getQuerier('probe')
    if (!querier) {
      setError(t('health_no_source'))
      return
    }
    setProbeInfo(t('health_probing'))
    try {
      const { promise } = querier()
      const res = await promise
      if (res?.running) {
        setProbeInfo(t('health_probe_running'))
      } else if (res) {
        const time = new Date(res.doneAt)
        const hh = String(time.getHours()).padStart(2, '0')
        const mm = String(time.getMinutes()).padStart(2, '0')
        setProbeInfo(`${t('health_probe_done_at')} ${hh}:${mm} · ${res.active?.length ?? 0}${t('health_probe_active')} · ${res.sleeping?.length ?? 0}${t('health_probe_sleeping')}`)
      }
    } catch (e: any) {
      setProbeInfo('')
      setError(String(e?.message || t('health_load_failed')))
      return
    }
    void loadHealth(true)
  }, [t, loadHealth])

  // v16.5：行内开关——点击状态胶囊切换该源启用/停用（停用带 manualOff 锁定，探测不自动复活）
  const toggleSource = useCallback(async(item: HealthItem, id: string) => {
    if (togglingId) return
    const querier = getQuerier('toggle')
    if (!querier) {
      setError(t('health_no_source'))
      return
    }
    setTogglingId(id)
    try {
      const { promise } = querier(id, !item.enabled)
      await promise
      await loadHealth(true)
    } catch (e: any) {
      setError(String(e?.message || t('health_toggle_failed')))
    } finally {
      setTogglingId('')
    }
  }, [t, loadHealth, togglingId])

  const items = snapshot ? Object.entries(snapshot).sort((a, b) => a[1].healthScore - b[1].healthScore) : []

  // 聚合摘要：正常/熔断/半开/待采样/休眠/已关
  let summary: Record<'ok' | 'open' | 'half' | 'idle' | 'sleep' | 'off', number> = { ok: 0, open: 0, half: 0, idle: 0, sleep: 0, off: 0 }
  if (items.length) {
    summary = items.reduce((acc, [, it]) => {
      const sampled = hasSample(it)
      if (!it.enabled) {
        if (it.sleeping) acc.sleep++
        else acc.off++
      } else if (!sampled) {
        acc.idle++
      } else if (it.state === 'closed') {
        acc.ok++
      } else if (it.state === 'open') {
        acc.open++
      } else {
        acc.half++
      }
      return acc
    }, summary)
  }

  return (
    <Section title={t('setting_health')}>
      <SubTitle title={t('health_desc')}>
        <View style={styles.btnRow}>
          <Button onPress={() => void loadHealth()} disabled={loading}>{loading ? t('health_loading') : t('health_refresh')}</Button>
          <View style={styles.btnGap} />
          <Button onPress={() => void runProbe()}>{t('health_probe')}</Button>
        </View>
        {
          probeInfo ? (
            <View style={styles.desc}>
              <Text size={12} color={theme['c-font-label']}>{probeInfo}</Text>
            </View>
          ) : null
        }
        {
          error ? (
            <View style={styles.desc}>
              <Text size={13} color={theme['c-font-label']}>{error}</Text>
            </View>
          ) : null
        }
        {
          items.length ? (
            <View style={[styles.summary, { backgroundColor: theme['c-primary-background-active'] }]}>
              <Text size={12} color={theme['c-font-label']}>{t('health_summary')}</Text>
              <View style={styles.summaryItems}>
                <Text size={12} color="#52c41a">● {summary.ok}{t('health_sum_ok')}</Text>
                <Text size={12} color="#ff4d4f">● {summary.open}{t('health_sum_open')}</Text>
                <Text size={12} color="#faad14">● {summary.half}{t('health_sum_half')}</Text>
                <Text size={12} color={theme['c-font-label']}>○ {summary.idle}{t('health_sum_idle')}</Text>
                <Text size={12} color="#8c8c8c">○ {summary.sleep}{t('health_sum_sleep')}</Text>
                <Text size={12} color={theme['c-font-label']}>○ {summary.off}{t('health_sum_off')}</Text>
              </View>
            </View>
          ) : null
        }
        {
          snapshot && items.length ? (
            <View style={styles.tableWrap}>
              <View style={[styles.row, styles.headRow, { backgroundColor: theme['c-primary-background-active'] }]}>
                <Text size={12} style={styles.colName}>{t('health_col_source')}</Text>
                <Text size={12} style={styles.colSmall}>{t('health_col_quality')}</Text>
                <Text size={12} style={styles.colSmall}>{t('health_col_success')}</Text>
                <Text size={12} style={styles.colSmall}>{t('health_col_time')}</Text>
                <Text size={12} style={styles.colSmall}>{t('health_col_state')}</Text>
                <Text size={12} style={styles.colSmall}>{t('health_col_score')}</Text>
              </View>
              {
                // v16.4：全部行直接渲染，表格随音源数量自动撑高（整页滚动，不再 maxHeight 截断）
                // v16.5：状态胶囊可点按开关源
                items.map(([id, item]) => {
                  const sampled = hasSample(item)
                  const rateText = item.successRate == null ? '-' : `${(item.successRate * 100).toFixed(0)}%`
                  const timeText = item.avgTime == null ? '-' : `${Math.round(item.avgTime)}ms`
                  let stateText: string
                  let stateColor: string
                  if (!item.enabled) {
                    if (item.sleeping) { stateText = t('health_state_sleeping'); stateColor = '#8c8c8c' }
                    else { stateText = t('health_state_disabled'); stateColor = theme['c-font-label'] }
                  } else if (!sampled) {
                    stateText = t('health_state_idle'); stateColor = theme['c-font-label']
                  } else {
                    stateText = t(`health_state_${item.state}`); stateColor = STATE_COLOR[item.state]
                  }
                  const scoreText = !sampled ? '-' : item.healthScore.toFixed(2)
                  const scoreColor = !sampled ? theme['c-font-label']
                    : item.healthScore >= 0.3 ? '#52c41a' : item.healthScore >= -0.5 ? theme['c-font'] : '#ff4d4f'
                  const rateColor = !sampled || item.successRate == null ? theme['c-font-label']
                    : item.successRate >= 0.6 ? theme['c-font'] : '#ff4d4f'
                  return (
                    <View key={id} style={[styles.row, { borderBottomColor: theme['c-border-background'] }]}>
                      <Text numberOfLines={1} size={12} style={styles.colName} color={item.enabled ? theme['c-font'] : theme['c-font-label']}>{item.name}</Text>
                      <Text size={12} style={styles.colSmall}>{item.maxQuality.toUpperCase()}</Text>
                      <Text size={12} style={styles.colSmall} color={rateColor}>{rateText}</Text>
                      <Text size={12} style={styles.colSmall} color={sampled ? theme['c-font'] : theme['c-font-label']}>{timeText}</Text>
                      <View style={styles.colSmall}>
                        <View
                          style={[styles.stateChip, { borderColor: stateColor, opacity: togglingId === id ? 0.5 : 1 }]}
                          onTouchEnd={() => { void toggleSource(item, id) }}
                        >
                          <Text size={10} color={stateColor}>{togglingId === id ? '…' : stateText}</Text>
                        </View>
                      </View>
                      <Text size={12} style={styles.colSmall} color={scoreColor}>{scoreText}</Text>
                    </View>
                  )
                })
              }
            </View>
          ) : null
        }
        {
          snapshot && items.length ? (
            <View style={styles.desc}>
              <Text size={12} color={theme['c-font-label']}>{t('health_footnote')}</Text>
            </View>
          ) : null
        }
        {
          snapshot && !items.length && !error ? (
            <View style={styles.desc}>
              <Text size={13} color={theme['c-font-label']}>{t('health_no_source')}</Text>
            </View>
          ) : null
        }
      </SubTitle>
    </Section>
  )
})

const styles = StyleSheet.create({
  desc: {
    marginTop: 10,
    marginBottom: 8,
  },
  btnRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  btnGap: {
    width: 12,
  },
  summary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginBottom: 4,
  },
  summaryItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tableWrap: {
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headRow: {
    paddingVertical: 5,
    borderRadius: 4,
  },
  colName: {
    flex: 1,
    minWidth: 0,
    paddingRight: 4,
  },
  colSmall: {
    width: 58,
    alignItems: 'center',
  },
  stateChip: {
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
})
