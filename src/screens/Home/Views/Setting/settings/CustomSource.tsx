import { memo } from 'react'
import { ScrollView } from 'react-native'

import Section from '../components/Section'
import Source from './Basic/Source'
import SourceName from './Basic/SourceName'
import { useI18n } from '@/lang'

// 自定义音源：首页直接展开（不做二级分组）
export default memo(() => {
  const t = useI18n()

  return (
    <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps={'always'}>
      <Section title={t('setting_custom_source')}>
        <Source />
        <SourceName />
      </Section>
    </ScrollView>
  )
})
