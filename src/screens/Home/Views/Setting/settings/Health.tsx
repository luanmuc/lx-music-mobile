import { memo, useState, useEffect, useCallback, useRef } from 'react'
import { StyleSheet, View, ScrollView, TextInput, Modal } from 'react-native'

import Section from '../components/Section'
import SubTitle from '../components/SubTitle'
import Button from '../components/Button'
import { useI18n } from '@/lang'
import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'
import { saveData, getData } from '@/plugins/storage'

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
  // v25.2：真实播放请求最后使用时间戳（音源快照提供；0=从未用过）——五级分区"使用中"判定
  lastUsedAt?: number
}
type HealthSnapshot = Record<string, HealthItem>

// 音源熔断器语义：closed=正常放行、open=熔断(冷却中)、half-open=半开试探
const STATE_COLOR: Record<HealthItem['state'], string> = {
  closed: '#52c41a',
  'half-open': '#faad14',
  open: '#ff4d4f',
}

// 获取当前音源的健康查询器（任一声明对应 action 的源均可，聚合结果与源无关）
const getQuerier = (fn: 'getHealth' | 'toggle' | 'probe' | 'config'): ((...args: any[]) => { promise: Promise<any> }) | null => {
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
  // v29.3：配置编辑相关 state
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [configData, setConfigData] = useState<Record<string, any> | null>(null)
  const [configInputs, setConfigInputs] = useState<Record<string, string>>({})
  // v29.4：趋势图相关 state
  const [trendData, setTrendData] = useState<Array<{ timestamp: number, sources: Record<string, { score: number | null, successRate: number | null }> }>>([])
  const [showTrendModal, setShowTrendModal] = useState(false)
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

  // v29.3：查看音源配置（调用 config action 读模式）
  const showConfig = useCallback(async() => {
    const querier = getQuerier('config')
    if (!querier) {
      setError(t('health_no_source'))
      return
    }
    try {
      const { promise } = querier()
      const res = await promise
      setConfigData(res)
      setConfigInputs(Object.fromEntries(Object.entries(res).map(([k, v]) => [k, String(v)])))
      setShowConfigModal(true)
    } catch (e: any) {
      setError(String(e?.message || t('health_load_failed')))
    }
  }, [t])

  // v29.3：保存配置（写模式 + 本地持久化）
  const saveConfig = useCallback(async() => {
    const querier = getQuerier('config')
    const updates: Record<string, number> = {}
    for (const [k, v] of Object.entries(configInputs)) {
      const num = Number(v)
      if (!isNaN(num) && num > 0 && k in (configData || {})) {
        updates[k] = num
      }
    }
    try {
      if (Object.keys(updates).length === 0) {
        setShowConfigModal(false)
        setProbeInfo('没有修改任何参数')
        return
      }
      if (querier) {
        const { promise } = querier(updates)
        await promise
      }
      await saveData('lx_source_config', updates)
      setShowConfigModal(false)
      setProbeInfo(`配置已保存：${Object.keys(updates).length} 项已更新`)
    } catch (e: any) {
      setError(String(e?.message || '保存失败'))
    }
  }, [t, configInputs, configData])

  // v29.4：查看健康趋势（调用 trend action 读历史数据）
  const showTrend = useCallback(async() => {
    const querier = getQuerier('trend')
    if (!querier) {
      setError(t('health_no_source'))
      return
    }
    try {
      const { promise } = querier()
      const res = await promise
      setTrendData(res.history || [])
      setShowTrendModal(true)
    } catch (e: any) {
      setError(String(e?.message || t('health_load_failed')))
    }
  }, [t])

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

  // v-b47：五级分区排序——使用中(最近10分钟有真实请求) → 正常 → 待采样 → 休眠 → 已关，
  // 组内按健康分降序（同分保持定义顺序）；"异常"源(0%+负分)留在正常组内自然沉底
  const isUsing = (it: HealthItem) => !!it.lastUsedAt && (Date.now() - it.lastUsedAt) < 10 * 60 * 1000
  const groupRank = (it: HealthItem) => {
    if (!it.enabled) return it.sleeping ? 3 : 4
    if (!hasSample(it)) return 2
    return isUsing(it) ? 0 : 1
  }
  // v29.2：提取平台级降级聚合（_ 开头的特殊字段，不参与子源列表渲染）
  const platformSummary = snapshot?._platformSummary as Record<string, { degraded: boolean; activeCount: number; deadCount: number }> | undefined
  const fallbackPlatform = snapshot?._fallbackPlatform as string | undefined
  const degradedPlatforms = platformSummary ? Object.entries(platformSummary).filter(([, v]) => v.degraded).map(([k]) => k) : []

  const items = snapshot ? Object.entries(snapshot)
    .filter(([id]) => !id.startsWith('_'))  // 过滤平台聚合等特殊字段
    .sort((a, b) => {
      const g = groupRank(a[1]) - groupRank(b[1])
      return g !== 0 ? g : b[1].healthScore - a[1].healthScore
    }) : []

  // 聚合摘要：正常/熔断/半开/待采样/休眠/已关
  let summary: Record<'ok' | 'bad' | 'open' | 'half' | 'idle' | 'sleep' | 'off', number> = { ok: 0, bad: 0, open: 0, half: 0, idle: 0, sleep: 0, off: 0 }
  if (items.length) {
    summary = items.reduce((acc, [, it]) => {
      const sampled = hasSample(it)
      if (!it.enabled) {
        if (it.sleeping) acc.sleep++
        else acc.off++
      } else if (!sampled) {
        acc.idle++
      } else if (it.state === 'closed') {
        // v-b45：状态语义修正——断路器闭合但成功率 0% + 健康分<0（如上游整体不可用的源）
        // 显示"异常"而非"正常"：闭合≠真实可用
        if (it.successRate === 0 && it.healthScore < 0) acc.bad++
        else acc.ok++
      } else if (it.state === 'open') {
        acc.open++
      } else {
        acc.half++
      }
      return acc
    }, summary)
  }

  return (
    <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps={'always'}>
    <Section title={t('setting_health')}>
      <SubTitle title={t('health_desc')}>
        <View style={styles.btnRow}>
          <Button onPress={() => void loadHealth()} disabled={loading}>{loading ? t('health_loading') : t('health_refresh')}</Button>
          <View style={styles.btnGap} />
          <Button onPress={() => void runProbe()}>{t('health_probe')}</Button>
          <View style={styles.btnGap} />
          <Button onPress={() => void showConfig()}>配置</Button>
          <View style={styles.btnGap} />
          <Button onPress={() => void showTrend()}>趋势</Button>
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
          // v29.2：平台级降级提示条
          degradedPlatforms.length ? (
            <View style={[styles.summary, { backgroundColor: '#fffbe6' }]}>
              <Text size={12} color="#d48806">⚠ {degradedPlatforms.join('、')} 平台级降级</Text>
              {fallbackPlatform ? <Text size={11} color={theme['c-font-label']}>正在用 {fallbackPlatform} 平台兜底</Text> : null}
            </View>
          ) : null
        }
        {
          items.length ? (
            <View style={[styles.summary, { backgroundColor: theme['c-primary-background-active'] }]}>
              <Text size={12} color={theme['c-font-label']}>{t('health_summary')}</Text>
              <View style={styles.summaryItems}>
                <Text size={12} color="#52c41a">● {summary.ok}{t('health_sum_ok')}</Text>
                <Text size={12} color="#ff4d4f">● {summary.bad}{t('health_sum_bad')}</Text>
                <Text size={12} color="#faad14">● {summary.open}{t('health_sum_open')}</Text>
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
                  } else if (item.state === 'closed' && item.successRate === 0 && item.healthScore < 0) {
                    // v-b45：断路器闭合但成功率 0% + 健康分<0 → "异常"（上游不可用的源不再显示"正常"）
                    stateText = t('health_state_abnormal'); stateColor = '#ff4d4f'
                  } else {
                    stateText = t(`health_state_${item.state}`); stateColor = STATE_COLOR[item.state]
                  }
                  // 健康分 10 分制（音源 v27.4 起快照 ×10）：一位小数；阈值 ≥3 绿 / ≥−5 默认 / <−5 红
                  const scoreText = !sampled ? '-' : item.healthScore.toFixed(1)
                  const scoreColor = !sampled ? theme['c-font-label']
                    : item.healthScore >= 3 ? '#52c41a' : item.healthScore >= -5 ? theme['c-font'] : '#ff4d4f'
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

    {/* v29.3：配置编辑弹窗 */}
    <Modal visible={showConfigModal} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme['c-bg-1'] }]}>
          <Text size={16} color={theme['c-font-1']} style={styles.modalTitle}>音源配置（运行参数）</Text>
          <ScrollView style={styles.modalScroll}>
            {configData && Object.entries(configData)
              .filter(([key]) => !['ikunApiKey', 'lingchuanApiKey', 'xinghaiDeviceId'].includes(key))
              .map(([key, value]) => (
              <View key={key} style={styles.configRow}>
                <Text size={12} color={theme['c-font-label']} style={styles.configLabel}>{key}</Text>
                <TextInput
                  style={[styles.configInput, { borderColor: theme['c-border-1'], color: theme['c-font-1'] }]}
                  value={configInputs[key] ?? String(value)}
                  onChangeText={(text) => setConfigInputs(prev => ({ ...prev, [key]: text }))}
                  keyboardType="numeric"
                />
              </View>
            ))}
          </ScrollView>
          <View style={styles.modalBtnRow}>
            <Button onPress={() => setShowConfigModal(false)}>取消</Button>
            <View style={styles.btnGap} />
            <Button onPress={() => void saveConfig()}>保存</Button>
          </View>
        </View>
      </View>
    </Modal>

    {/* v29.4：健康趋势弹窗 */}
    <Modal visible={showTrendModal} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme['c-bg-1'] }]}>
          <Text size={16} color={theme['c-font-1']} style={styles.modalTitle}>健康趋势（最近 {trendData.length} 次探测）</Text>
          <ScrollView style={styles.modalScroll}>
            {trendData.length === 0 ? (
              <Text size={13} color={theme['c-font-label']}>暂无历史数据，完成一次探测后自动记录</Text>
            ) : (
              (() => {
                // 收集所有源 ID（跨所有历史快照）
                const allSourceIds = Array.from(new Set(
                  trendData.flatMap(entry => Object.keys(entry.sources))
                ))
                return allSourceIds.map(id => (
                  <View key={id} style={styles.trendSourceRow}>
                    <Text size={11} color={theme['c-font-label']} style={styles.trendSourceName}>{id}</Text>
                    <View style={styles.trendDots}>
                      {trendData.map((entry, idx) => {
                        const data = entry.sources[id]
                        const score = data?.score ?? null
                        let color = '#9e9e9e' // 灰色：无样本
                        if (score !== null && score >= 7) color = '#4caf50' // 绿
                        else if (score !== null && score >= 4) color = '#ff9800' // 橙
                        else if (score !== null && score < 4) color = '#f44336' // 红
                        return (
                          <View
                            key={idx}
                            style={[styles.trendDot, { backgroundColor: color }]}
                          />
                        )
                      })}
                    </View>
                  </View>
                ))
              })()
            )}
          </ScrollView>
          <View style={styles.modalBtnRow}>
            <Button onPress={() => setShowTrendModal(false)}>关闭</Button>
          </View>
        </View>
      </View>
    </Modal>
    </ScrollView>
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
  // v29.3：配置弹窗样式
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 20,
  },
  modalContent: {
    borderRadius: 10,
    padding: 16,
    maxHeight: '80%',
  },
  modalTitle: {
    marginBottom: 12,
    fontWeight: 'bold',
  },
  modalScroll: {
    marginBottom: 12,
  },
  configRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  configLabel: {
    flex: 1,
    marginRight: 8,
  },
  configInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  // v29.4：趋势图样式（每源一行圆点序列）
  trendSourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  trendSourceName: {
    width: 90,
    marginRight: 8,
  },
  trendDots: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
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
