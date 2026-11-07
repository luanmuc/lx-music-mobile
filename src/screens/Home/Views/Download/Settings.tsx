import { memo, useState } from 'react'
import { View, TouchableOpacity, TextInput, ScrollView } from 'react-native'
import RNFS from 'react-native-fs'
import { AndroidScoped, getExternalStoragePaths } from 'react-native-file-system'

import Text from '@/components/common/Text'
import CheckBox from '@/components/common/CheckBox'
import { useSettingValue } from '@/store/setting/hook'
import { updateSetting } from '@/core/common'
import { useTheme } from '@/store/theme/hook'
import { createStyle, toast } from '@/utils/tools'
import { isExternalStorageManager } from '@/utils/nativeModules/utils'

const DEFAULT_DIR = `${RNFS.DownloadDirectoryPath}/lx-music/music`
const PRIVATE_DIR = `${RNFS.DocumentDirectoryPath}/downloads`
const NAME_PRESETS = ['歌名 - 歌手', '歌名', '歌手 - 歌名']
const MAX_TASK_LIMIT = 5

// SAF 选择器返回的是 content:// 树 URI，而下载走 RNFS 需要真实文件系统路径。
// 这里把 com.android.externalstorage.documents 的树 URI 还原成 /storage/... 路径；
// 云端/网盘的 provider（如 Drive）没有本地路径，返回 null 让调用方拒绝。
const treeUriToPath = async(uri: string): Promise<string | null> => {
  if (!uri.includes('com.android.externalstorage.documents')) return null
  const matched = uri.match(/\/tree\/([^/]+)$/)
  if (!matched) return null
  const docId = decodeURIComponent(matched[1])
  const sepIndex = docId.indexOf(':')
  if (sepIndex < 0) return null
  const volume = docId.slice(0, sepIndex)
  const relative = docId.slice(sepIndex + 1).replace(/^\/+/, '')
  let base: string | undefined
  if (volume == 'primary') {
    base = RNFS.ExternalStorageDirectoryPath
  } else {
    const paths = await getExternalStoragePaths()
    base = paths.find(p => p.includes(volume)) ?? `/storage/${volume}`
  }
  if (!base) return null
  return relative ? `${base}/${relative}` : base
}

const shortDir = (path: string) => {
  if (!path) return `默认（${DEFAULT_DIR}）`
  return path.replace(`${RNFS.ExternalStorageDirectoryPath}/`, '')
}

interface RowProps {
  label: string
  desc?: string
  children: React.ReactNode
}
const Row = ({ label, desc, children }: RowProps) => {
  const theme = useTheme()
  return (
    <View style={styles.row}>
      <View style={styles.rowLabel}>
        <Text size={13}>{label}</Text>
        {desc ? <Text size={11} color={theme['c-font-label']} style={styles.rowDesc}>{desc}</Text> : null}
      </View>
      <View style={styles.rowControl}>{children}</View>
    </View>
  )
}

export interface DownloadSettingsProps {
  /** 列表为空时默认展开，有任务时收起成一行摘要 */
  defaultExpanded?: boolean
}
export default memo(({ defaultExpanded = false }: DownloadSettingsProps) => {
  const theme = useTheme()
  const onlyWifi = useSettingValue('download.onlyWifi')
  const maxTask = useSettingValue('download.maxTask')
  const autoRetry = useSettingValue('download.autoRetry')
  const dir = useSettingValue('download.dir')
  const fileName = useSettingValue('download.fileName')
  const notifyComplete = useSettingValue('download.notifyComplete')

  const [expanded, setExpanded] = useState(defaultExpanded)
  const [showDirOptions, setShowDirOptions] = useState(false)
  const [showNameOptions, setShowNameOptions] = useState(false)
  const [customDir, setCustomDir] = useState('')
  const [customName, setCustomName] = useState('')

  const summary = `${dir ? '自定义目录' : '默认目录'} · 仅WiFi${onlyWifi ? '开' : '关'} · 并发${maxTask}`

  const pickDir = async() => {
    let picked: { path?: string } | null
    try {
      picked = await AndroidScoped.openDocumentTree(true)
    } catch (e) {
      toast('打开目录选择器失败')
      return
    }
    if (!picked?.path) return // 用户取消
    const path = await treeUriToPath(picked.path)
    if (!path) {
      toast('请选择手机存储里的文件夹（网盘/云端目录无法用于下载）', 'long')
      return
    }
    await applyDir(path)
  }

  const applyDir = async(value: string) => {
    if (value) {
      try {
        await RNFS.mkdir(value)
      } catch (e) {
        if (value.includes('/storage/') && !(await isExternalStorageManager())) {
          toast('该目录需要「所有文件访问」权限，请先去系统设置里开启', 'long')
        } else {
          toast('该路径无法创建，请换一个')
        }
        return
      }
      if (!(await RNFS.exists(value))) {
        toast('该路径不可用，请换一个')
        return
      }
    }
    updateSetting({ 'download.dir': value })
    setShowDirOptions(false)
    setCustomDir('')
    toast(value ? '下载目录已更新' : '已恢复默认下载目录')
  }

  const applyName = (value: string) => {
    const v = value.trim()
    if (!v) {
      toast('命名规则不能为空')
      return
    }
    if (!v.includes('歌名') && !v.includes('歌手')) {
      toast('命名规则需包含「歌名」或「歌手」')
      return
    }
    updateSetting({ 'download.fileName': v })
    setShowNameOptions(false)
    setCustomName('')
    toast('文件命名规则已更新')
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => { setExpanded(v => !v) }}
        style={{ ...styles.header, backgroundColor: theme['c-content-background'] }}
      >
        <View style={styles.headerLeft}>
          <Text size={14}>下载设置</Text>
          {
            expanded
              ? null
              : <Text size={11} color={theme['c-font-label']} numberOfLines={1} style={styles.summary}>{summary}</Text>
          }
        </View>
        <Text size={12} color={theme['c-primary']}>{expanded ? '收起 ▴' : '展开 ▾'}</Text>
      </TouchableOpacity>

      {
        expanded
          ? (
              <View style={{ ...styles.body, backgroundColor: theme['c-content-background'] }}>
                <Row label="仅 WiFi 下载" desc="移动网络下不自动开始下载">
                  <CheckBox check={onlyWifi} onChange={(v) => { updateSetting({ 'download.onlyWifi': v }) }} />
                </Row>

                <Row label="最大同时下载数" desc="1 - 5，任务多时排队">
                  <View style={styles.stepper}>
                    <TouchableOpacity
                      onPress={() => { updateSetting({ 'download.maxTask': Math.max(1, maxTask - 1) }) }}
                      style={styles.stepBtn}
                    >
                      <Text size={16} color={maxTask <= 1 ? theme['c-400'] : theme['c-primary']}>−</Text>
                    </TouchableOpacity>
                    <Text size={14} style={styles.stepValue}>{maxTask}</Text>
                    <TouchableOpacity
                      onPress={() => { updateSetting({ 'download.maxTask': Math.min(MAX_TASK_LIMIT, maxTask + 1) }) }}
                      style={styles.stepBtn}
                    >
                      <Text size={16} color={maxTask >= MAX_TASK_LIMIT ? theme['c-400'] : theme['c-primary']}>＋</Text>
                    </TouchableOpacity>
                  </View>
                </Row>

                <Row label="失败自动重试" desc="权限类错误不重试，避免反复弹窗">
                  <CheckBox check={autoRetry} onChange={(v) => { updateSetting({ 'download.autoRetry': v }) }} />
                </Row>

                <View>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => { setShowDirOptions(v => !v) }}
                    style={styles.row}
                  >
                    <View style={styles.rowLabel}>
                      <Text size={13}>下载目录</Text>
                      <Text size={11} color={theme['c-font-label']} numberOfLines={1} style={styles.rowDesc}>{shortDir(dir)}</Text>
                    </View>
                    <Text size={12} color={theme['c-primary']}>{showDirOptions ? '收起' : '更改'}</Text>
                  </TouchableOpacity>
                  {
                    showDirOptions
                      ? (
                          <View style={styles.subPanel}>
                            <TouchableOpacity onPress={() => { void applyDir('') }} style={styles.option}>
                              <Text size={12} color={!dir ? theme['c-primary'] : theme['c-font']}>默认公共目录</Text>
                              <Text size={10} color={theme['c-font-label']} numberOfLines={1}>{DEFAULT_DIR}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => { void applyDir(PRIVATE_DIR) }} style={styles.option}>
                              <Text size={12} color={dir === PRIVATE_DIR ? theme['c-primary'] : theme['c-font']}>应用私有目录（无需权限）</Text>
                              <Text size={10} color={theme['c-font-label']} numberOfLines={1}>{PRIVATE_DIR}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => { void pickDir() }} style={styles.option}>
                              <Text size={12} color={theme['c-primary']}>选择其他目录…</Text>
                              <Text size={10} color={theme['c-font-label']}>打开系统文件夹选择器（手机存储内的目录）</Text>
                            </TouchableOpacity>
                            <View style={styles.customRow}>
                              <TextInput
                                value={customDir}
                                onChangeText={setCustomDir}
                                placeholder="或直接输入绝对路径，如 /storage/emulated/0/Music"
                                placeholderTextColor={theme['c-font-label']}
                                style={{ ...styles.input, color: theme['c-font'], backgroundColor: theme['c-primary-input-background'] }}
                                autoCapitalize="none"
                                autoCorrect={false}
                              />
                              <TouchableOpacity onPress={() => { void applyDir(customDir.trim()) }} style={styles.confirmBtn}>
                                <Text size={12} color={theme['c-primary-font']}>保存</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        )
                      : null
                  }
                </View>

                <View>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => { setShowNameOptions(v => !v) }}
                    style={styles.row}
                  >
                    <View style={styles.rowLabel}>
                      <Text size={13}>文件命名</Text>
                      <Text size={11} color={theme['c-font-label']} numberOfLines={1} style={styles.rowDesc}>{fileName}</Text>
                    </View>
                    <Text size={12} color={theme['c-primary']}>{showNameOptions ? '收起' : '更改'}</Text>
                  </TouchableOpacity>
                  {
                    showNameOptions
                      ? (
                          <View style={styles.subPanel}>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetRow}>
                              {
                                NAME_PRESETS.map(preset => (
                                  <TouchableOpacity
                                    key={preset}
                                    onPress={() => { applyName(preset) }}
                                    style={{ ...styles.preset, borderColor: fileName === preset ? theme['c-primary'] : theme['c-font-label'] }}
                                  >
                                    <Text size={12} color={fileName === preset ? theme['c-primary'] : theme['c-font']}>{preset}</Text>
                                  </TouchableOpacity>
                                ))
                              }
                            </ScrollView>
                            <View style={styles.customRow}>
                              <TextInput
                                value={customName}
                                onChangeText={setCustomName}
                                placeholder="含「歌名」「歌手」，如 歌手-歌名"
                                placeholderTextColor={theme['c-font-label']}
                                style={{ ...styles.input, color: theme['c-font'], backgroundColor: theme['c-primary-input-background'] }}
                                autoCapitalize="none"
                                autoCorrect={false}
                              />
                              <TouchableOpacity onPress={() => { applyName(customName) }} style={styles.confirmBtn}>
                                <Text size={12} color={theme['c-primary-font']}>保存</Text>
                              </TouchableOpacity>
                            </View>
                            <Text size={10} color={theme['c-font-label']}>音质标识由下载自动追加，无需写在这里</Text>
                          </View>
                        )
                      : null
                  }
                </View>

                <Row label="下载完成通知" desc="下载结束后弹出通知">
                  <CheckBox check={notifyComplete} onChange={(v) => { updateSetting({ 'download.notifyComplete': v }) }} />
                </Row>
              </View>
            )
          : null
      }
    </View>
  )
})

const styles = createStyle({
  container: {
    paddingLeft: 12,
    paddingRight: 12,
    paddingTop: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 12,
    paddingRight: 12,
    paddingTop: 10,
    paddingBottom: 10,
    borderRadius: 6,
  },
  headerLeft: {
    flex: 1,
    paddingRight: 10,
  },
  summary: {
    marginTop: 2,
  },
  body: {
    marginTop: 2,
    paddingLeft: 12,
    paddingRight: 12,
    paddingBottom: 4,
    borderRadius: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    paddingBottom: 10,
  },
  rowLabel: {
    flex: 1,
    paddingRight: 10,
  },
  rowDesc: {
    marginTop: 2,
  },
  rowControl: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: {
    minWidth: 22,
    textAlign: 'center',
  },
  subPanel: {
    paddingLeft: 4,
    paddingBottom: 8,
  },
  option: {
    paddingTop: 8,
    paddingBottom: 8,
  },
  presetRow: {
    paddingTop: 4,
    paddingBottom: 6,
  },
  preset: {
    paddingLeft: 10,
    paddingRight: 10,
    paddingTop: 5,
    paddingBottom: 5,
    marginRight: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  input: {
    flex: 1,
    height: 36,
    paddingLeft: 10,
    paddingRight: 10,
    borderRadius: 4,
    fontSize: 12,
  },
  confirmBtn: {
    marginLeft: 8,
    paddingLeft: 12,
    paddingRight: 12,
    paddingTop: 8,
    paddingBottom: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(128,128,128,0.18)',
  },
})
