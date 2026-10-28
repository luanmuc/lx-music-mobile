import { memo, useState, useEffect, useCallback } from 'react'
import { StyleSheet, View } from 'react-native'

import Section from '../components/Section'
import SubTitle from '../components/SubTitle'
import Button from '../components/Button'
import { useI18n } from '@/lang'
import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'

// 音源健康快照（音源 getHealthSnapshot 聚合查询；v16.4：无样本 successRate/avgTime 为 null + 样本计数）
interface HealthItem {
  name: string
  maxQuality: string
  enabled: boolean
  successRate: number | null
  avgTime: number | null
  state: 'closed' | 'open' | 'half-open'
  reqCount: number
  probeCount: number
  healthScore: number
}
type HealthSnapshot = Record<string, HealthItem>

const STATE_COLOR: Record<HealthItem['state'], string> = {
  open: '#52c41a',
  'half-open': '#faad14',
  closed: '#ff4d4f',
}

// 获取当前音源的健康查询器（任一声明 health action 的源均可，聚合结果与源无关）
const getHealthQuerier = (): (() => { promise: Promise<any> }) | null => {
  const apis = (global as any).lx?.apis as Record<string, any> | undefined
  if (!apis) return null
  const sourceId = Object.keys(apis).find(id => typeof apis[id]?.getHealth === 'function')
  return sourceId ? apis[sourceId].getHealth : null
}

// 无样本（未产生任何请求/探测）判定
const hasSample = (item: HealthItem) => (item.reqCount ?? 0) > 0 || (item.probeCount ?? 0) > 0

export default memo(() => {
  const t = useI18n()
  const theme = useTheme()
  const [snapshot, setSnapshot] = useState<HealthSnapshot | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadHealth = useCallback(async() => {
    setLoading(true)
    setError('')
    try {
      const querier = getHealthQuerier()
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
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void loadHealth()
  }, [loadHealth])

  const items = snapshot ? Object.entries(snapshot).sort((a, b) => a[1].healthScore - b[1].healthScore) : []

  return (
    <Section title={t('setting_health')}>
      <SubTitle title={t('health_desc')}>
        <View style={styles.btn}>
          <Button onPress={() => void loadHealth()} disabled={loading}>{loading ? t('health_loading') : t('health_refresh')}</Button>
        </View>
        {
          error ? (
            <View style={styles.desc}>
              <Text size={13} color={theme['c-font-label']}>{error}</Text>
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
                items.map(([id, item]) => {
                  const sampled = hasSample(item)
                  const rateText = item.successRate == null ? '-' : `${(item.successRate * 100).toFixed(0)}%`
                  const timeText = item.avgTime == null ? '-' : `${Math.round(item.avgTime)}ms`
                  // 无样本：状态显示「待采样」（灰）；有样本熔断才显示红色「熔断」
                  const stateText = item.enabled
                    ? sampled ? t(`health_state_${item.state}`) : t('health_state_idle')
                    : t('health_state_disabled')
                  const stateColor = item.enabled
                    ? sampled ? STATE_COLOR[item.state] : theme['c-font-label']
                    : theme['c-font-label']
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
                      <Text size={12} style={styles.colSmall} color={stateColor}>{stateText}</Text>
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
  btn: {
    flexDirection: 'row',
    marginBottom: 8,
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
    textAlign: 'center',
  },
})
