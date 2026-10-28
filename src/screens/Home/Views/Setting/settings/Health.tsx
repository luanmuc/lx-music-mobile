import { memo, useState, useEffect, useCallback } from 'react'
import { StyleSheet, View, ScrollView } from 'react-native'

import Section from '../components/Section'
import SubTitle from '../components/SubTitle'
import Button from '../components/Button'
import { useI18n } from '@/lang'
import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'

// 音源健康快照（音源 getHealthSnapshot 聚合查询，v16.3）
interface HealthItem {
  name: string
  maxQuality: string
  enabled: boolean
  successRate: number
  avgTime: number
  state: 'closed' | 'open' | 'half-open'
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
            <ScrollView style={styles.tableWrap} nestedScrollEnabled>
              <View style={[styles.row, styles.headRow, { backgroundColor: theme['c-primary-background-active'] }]}>
                <Text size={12} style={styles.colName}>{t('health_col_source')}</Text>
                <Text size={12} style={styles.colSmall}>{t('health_col_quality')}</Text>
                <Text size={12} style={styles.colSmall}>{t('health_col_success')}</Text>
                <Text size={12} style={styles.colSmall}>{t('health_col_time')}</Text>
                <Text size={12} style={styles.colSmall}>{t('health_col_state')}</Text>
                <Text size={12} style={styles.colSmall}>{t('health_col_score')}</Text>
              </View>
              {
                items.map(([id, item]) => (
                  <View key={id} style={[styles.row, { borderBottomColor: theme['c-border-background'] }]}>
                    <Text numberOfLines={1} size={12} style={styles.colName} color={item.enabled ? theme['c-font'] : theme['c-font-label']}>{item.name}</Text>
                    <Text size={12} style={styles.colSmall}>{item.maxQuality.toUpperCase()}</Text>
                    <Text size={12} style={styles.colSmall} color={item.successRate >= 0.6 ? theme['c-font'] : '#ff4d4f'}>{(item.successRate * 100).toFixed(0)}%</Text>
                    <Text size={12} style={styles.colSmall}>{item.avgTime >= 99999 ? '-' : `${item.avgTime}ms`}</Text>
                    <Text size={12} style={styles.colSmall} color={item.enabled ? STATE_COLOR[item.state] : theme['c-font-label']}>{item.enabled ? t(`health_state_${item.state}`) : t('health_state_disabled')}</Text>
                    <Text size={12} style={styles.colSmall} color={item.healthScore >= 0.3 ? '#52c41a' : item.healthScore >= -0.5 ? theme['c-font'] : '#ff4d4f'}>{item.healthScore.toFixed(2)}</Text>
                  </View>
                ))
              }
            </ScrollView>
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
    marginBottom: 8,
  },
  btn: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  tableWrap: {
    marginTop: 4,
    maxHeight: 300,
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
