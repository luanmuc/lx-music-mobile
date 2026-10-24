import { memo } from 'react'

import Section from '../components/Section'
import Source from './Basic/Source'
import SourceName from './Basic/SourceName'
import { useI18n } from '@/lang'

// 自定义音源：首页直接展开（不做二级分组）
export default memo(() => {
  const t = useI18n()

  return (
    <Section title={t('setting_custom_source')}>
      <Source />
      <SourceName />
    </Section>
  )
})
