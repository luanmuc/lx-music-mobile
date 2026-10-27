import { useMemo, useRef } from 'react'
import { FlatList, TouchableOpacity, View, type ListRenderItemInfo } from 'react-native'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import Text from '@/components/common/Text'
import Button from '@/components/common/Button'
import { useDownloadList } from '@/store/download/hook'
import {
  clearCompleted,
  moveTask,
  openDownloadedFile,
  pauseAllDownload,
  pauseDownload,
  playDownload,
  removeDownload,
  resumeAllDownload,
  resumeDownload,
  retryDownload,
  shareDownloadedFile,
} from '@/core/downloadManager'
import { QUALITY_NAMES } from '@/components/OnlineList/QualitySelect'

const formatSize = (bytes: number) => {
  if (!bytes || bytes <= 0) return ''
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

const getStatusInfo = (item: LX.Download.ListItem): { text: string, isProgress: boolean } => {
  switch (item.status) {
    case 'waiting': return { text: '等待中', isProgress: false }
    case 'run': return { text: '下载中', isProgress: true }
    case 'pause': return { text: '已暂停', isProgress: false }
    case 'completed': return { text: '已完成', isProgress: false }
    case 'error': return { text: `下载失败${item.error ? `：${item.error}` : ''}`, isProgress: false }
    default: return { text: item.statusText, isProgress: false }
  }
}

type SectionType = 'active' | 'completed'

interface SectionData {
  title: string
  data: LX.Download.ListItem[]
  type: SectionType
}

export default () => {
  const theme = useTheme()
  const list = useDownloadList()
  const listRef = useRef<FlatList>(null)

  const { activeList, completedList, activeCount, completedCount } = useMemo(() => {
    const active = list.filter(t => !t.isComplate)
    const completed = list.filter(t => t.isComplate)
    return {
      activeList: active,
      completedList: completed,
      activeCount: active.length,
      completedCount: completed.length,
    }
  }, [list])

  const hasActiveDownloading = activeList.some(t => t.status === 'run' || t.status === 'waiting')
  const hasPaused = activeList.some(t => t.status === 'pause')

  const handlePlay = (item: LX.Download.ListItem) => {
    const index = completedList.findIndex(t => t.id === item.id)
    if (index < 0) return
    void playDownload(index)
  }

  const renderItem = ({ item }: ListRenderItemInfo<LX.Download.ListItem>) => {
    const statusInfo = getStatusInfo(item)
    const isCompleted = item.isComplate
    const isActive = !isCompleted

    return (
      <View style={{ ...styles.item, backgroundColor: theme['c-content-background'] }}>
        <View style={styles.itemMain}>
          <View style={styles.itemInfo}>
            <Text numberOfLines={1} style={styles.itemName} size={14}>{item.metadata.musicInfo.name}</Text>
            <Text numberOfLines={1} style={styles.itemSinger} size={12} color={theme['c-font-label']}>{item.metadata.musicInfo.singer || '未知歌手'}</Text>
          </View>
          <View style={styles.itemActions}>
            {
              isCompleted
                ? (
                    <>
                      <Button style={styles.itemBtn} onPress={() => { handlePlay(item) }}>
                        <Text color={theme['c-primary-font']} size={12}>播放</Text>
                      </Button>
                      <Button style={styles.itemBtn} onPress={() => { void shareDownloadedFile(item.id) }}>
                        <Text color={theme['c-font-label']} size={12}>分享</Text>
                      </Button>
                      <Button style={styles.itemBtn} onPress={() => { void openDownloadedFile(item.id) }}>
                        <Text color={theme['c-font-label']} size={12}>打开</Text>
                      </Button>
                      <Button style={styles.itemBtn} onPress={() => { void removeDownload(item.id) }}>
                        <Text color={theme['c-font-label']} size={12}>删除</Text>
                      </Button>
                    </>
                  )
                : item.status === 'error'
                  ? (
                      <>
                        <Button style={styles.itemBtn} onPress={() => { void retryDownload(item.id) }}>
                          <Text color={theme['c-primary-font']} size={12}>重试</Text>
                        </Button>
                        <Button style={styles.itemBtn} onPress={() => { void removeDownload(item.id) }}>
                          <Text color={theme['c-font-label']} size={12}>删除</Text>
                        </Button>
                      </>
                    )
                  : item.status === 'pause'
                    ? (
                        <>
                          <Button style={styles.itemBtn} onPress={() => { void resumeDownload(item.id) }}>
                            <Text color={theme['c-primary-font']} size={12}>继续</Text>
                          </Button>
                          <Button style={styles.itemBtn} onPress={() => { void removeDownload(item.id) }}>
                            <Text color={theme['c-font-label']} size={12}>删除</Text>
                          </Button>
                        </>
                      )
                    : (
                        <>
                          <Button style={styles.itemBtn} onPress={() => { void pauseDownload(item.id) }}>
                            <Text color={theme['c-font-label']} size={12}>暂停</Text>
                          </Button>
                          <Button style={styles.itemBtn} onPress={() => { void removeDownload(item.id) }}>
                            <Text color={theme['c-font-label']} size={12}>取消</Text>
                          </Button>
                        </>
                      )
              }
          </View>
        </View>

        {/* 进度条 */}
        {
          statusInfo.isProgress || item.status === 'waiting' || item.status === 'run'
            ? (
                <View style={styles.progressArea}>
                  <View style={styles.progressBar}>
                    <View style={{ ...styles.progressInner, backgroundColor: theme['c-primary'], width: `${Math.min(100, Math.round(item.progress * 100))}%` }} />
                  </View>
                  <Text style={styles.progressText} size={11} color={theme['c-font-label']}>
                    {`${Math.min(100, Math.round(item.progress * 100))}%${item.speed ? ` · ${item.speed}` : ''}${item.total > 0 ? ` · ${formatSize(item.downloaded)}/${formatSize(item.total)}` : ''}`}
                  </Text>
                </View>
              )
            : null
        }

        {/* 失败时显示已下载大小 */}
        {
          item.status === 'error' && item.downloaded > 0
            ? <Text style={styles.progressText} size={11} color={theme['c-font-label']}>已下载 {formatSize(item.downloaded)}</Text>
            : null
        }

        {/* 已完成显示音质和文件名 */}
        {
          isCompleted
            ? (
                <>
                  <Text numberOfLines={1} style={styles.filePathText} size={11} color={theme['c-font-label']}>音质 {QUALITY_NAMES[item.metadata.quality] ?? item.metadata.quality}</Text>
                  <Text numberOfLines={1} style={styles.filePathText} size={11} color={theme['c-font-label']}>{item.metadata.fileName}</Text>
                </>
              )
            : null
        }

        {/* 未完成任务显示排序按钮 */}
        {
          isActive && !isCompleted
            ? (
                <View style={styles.sortArea}>
                  <TouchableOpacity onPress={() => { void moveTask(item.id, 'up') }} style={styles.sortBtn}>
                    <Text size={11} color={theme['c-font-label']}>↑ 上移</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { void moveTask(item.id, 'down') }} style={styles.sortBtn}>
                    <Text size={11} color={theme['c-font-label']}>↓ 下移</Text>
                  </TouchableOpacity>
                </View>
              )
            : null
        }
      </View>
    )
  }

  // 构建分组数据
  const sections: SectionData[] = useMemo(() => {
    const result: SectionData[] = []
    if (activeCount > 0) {
      result.push({ title: `下载中 (${activeCount})`, data: activeList, type: 'active' })
    }
    if (completedCount > 0) {
      result.push({ title: `已完成 (${completedCount})`, data: completedList, type: 'completed' })
    }
    return result
  }, [activeList, completedList, activeCount, completedCount])

  const renderSectionHeader = (section: SectionData) => (
    <View style={styles.sectionHeader}>
      <Text size={13} color={theme['c-font-label']} style={styles.sectionTitle}>{section.title}</Text>
      {
        section.type === 'active'
          ? (
              <View style={styles.sectionActions}>
                {
                  hasActiveDownloading
                    ? (
                        <TouchableOpacity onPress={() => { void pauseAllDownload() }} style={styles.sectionBtn}>
                          <Text size={12} color={theme['c-primary']}>全部暂停</Text>
                        </TouchableOpacity>
                      )
                    : hasPaused
                      ? (
                          <TouchableOpacity onPress={() => { void resumeAllDownload() }} style={styles.sectionBtn}>
                            <Text size={12} color={theme['c-primary']}>全部继续</Text>
                          </TouchableOpacity>
                        )
                      : null
                }
              </View>
            )
          : (
              <TouchableOpacity onPress={() => { void clearCompleted() }} style={styles.sectionBtn}>
                <Text size={12} color={theme['c-primary']}>清空已完成</Text>
              </TouchableOpacity>
            )
        }
    </View>
  )

  const renderFlatList = (data: LX.Download.ListItem[]) => (
    <FlatList
      ref={listRef}
      data={data}
      keyExtractor={item => item.id}
      renderItem={renderItem}
      contentContainerStyle={styles.listContent}
    />
  )

  return (
    <View style={styles.container}>
      {
        list.length
          ? (
              sections.map(section => (
                <View key={section.type}>
                  {renderSectionHeader(section)}
                  {renderFlatList(section.data)}
                </View>
              ))
            )
          : (
              <View style={styles.empty}>
                <Text size={14} color={theme['c-font-label']}>暂无下载任务</Text>
                <Text size={12} color={theme['c-font-label']} style={styles.emptyTip}>在搜索、排行榜、歌单列表中长按歌曲，选择「下载」即可添加到下载队列</Text>
              </View>
            )
      }
    </View>
  )
}

const styles = createStyle({
  container: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 15,
    paddingRight: 15,
    paddingTop: 12,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontWeight: 'bold',
  },
  sectionActions: {
    flexDirection: 'row',
  },
  sectionBtn: {
    marginLeft: 10,
  },
  listContent: {
    paddingLeft: 12,
    paddingRight: 12,
    paddingBottom: 20,
  },
  item: {
    borderRadius: 6,
    marginBottom: 8,
    paddingLeft: 12,
    paddingRight: 12,
    paddingTop: 10,
    paddingBottom: 10,
  },
  itemMain: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
    marginRight: 8,
  },
  itemName: {
    marginBottom: 2,
  },
  itemSinger: {
    marginBottom: 0,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  itemBtn: {
    marginLeft: 6,
    paddingLeft: 10,
    paddingRight: 10,
    paddingTop: 5,
    paddingBottom: 5,
  },
  progressArea: {
    marginTop: 8,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(128,128,128,0.25)',
    overflow: 'hidden',
  },
  progressInner: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    marginTop: 4,
  },
  filePathText: {
    marginTop: 4,
  },
  sortArea: {
    flexDirection: 'row',
    marginTop: 6,
    justifyContent: 'flex-end',
  },
  sortBtn: {
    marginLeft: 12,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 30,
    paddingRight: 30,
  },
  emptyTip: {
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
})
