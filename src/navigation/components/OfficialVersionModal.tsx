import { View } from 'react-native'

import Button from '@/components/common/Button'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import Text from '@/components/common/Text'
import { useI18n } from '@/lang'
import { useOfficialVersionInfo } from '@/store/version/hook'
import ModalContent from './ModalContent'
import { hideModal } from '@/core/officialVersion'

// 官方上游版本更新提醒弹窗（定制版专属）：
// 仅提示"官方原版发布了新版本"，不提供下载（官方包与定制版不同源，不可直接覆盖安装）。
const OfficialVersionModal = ({ componentId }: { componentId: string }) => {
  const theme = useTheme()
  const t = useI18n()
  const official = useOfficialVersionInfo()

  const handleCancel = () => {
    hideModal(componentId)
  }

  return (
    <ModalContent>
      <View style={styles.main}>
        <Text style={styles.title}>{t('official_modal_title')}</Text>
        <Text style={styles.label}>{t('official_label_base')}v{official.base}</Text>
        <Text style={styles.label}>{t('official_label_latest')}v{official.latest}</Text>
        <Text selectable style={styles.desc}>{t('official_modal_desc', { latest: official.latest, base: official.base })}</Text>
      </View>
      <View style={styles.btns}>
        <Button style={{ ...styles.btn, backgroundColor: theme['c-button-background'] }} onPress={handleCancel}>
          <Text color={theme['c-button-font']}>{t('official_btn_ok')}</Text>
        </Button>
      </View>
    </ModalContent>
  )
}

const styles = createStyle({
  main: {
    flexShrink: 1,
    marginTop: 15,
    marginLeft: 15,
    marginRight: 15,
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    marginBottom: 4,
  },
  desc: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 10,
  },
  btns: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingBottom: 15,
    paddingLeft: 15,
    paddingRight: 15,
  },
  btn: {
    flex: 1,
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 10,
    paddingRight: 10,
    alignItems: 'center',
    borderRadius: 4,
  },
})

export default OfficialVersionModal
