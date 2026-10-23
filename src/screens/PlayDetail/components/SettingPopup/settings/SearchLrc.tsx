// 关联歌词：搜索并替换当前歌词（借鉴 MusicFree searchLrc）
// 当前歌词不准时，用歌名搜索其他版本，选择后替换播放详情与桌面歌词
import { useState } from 'react'
import { Modal, View, TextInput, TouchableOpacity, FlatList, ActivityIndicator, StyleSheet } from 'react-native'
import Text from '@/components/common/Text'
import { search } from '@/core/search/music'
import musicSdk from '@/utils/musicSdk'
import { toOldMusicInfo } from '@/utils'
import { setLyric as lrcSetLyric } from '@/plugins/lyric'
import { setDesktopLyric } from '@/core/desktopLyric'
import { toast } from '@/utils/tools'
import playerState from '@/store/player/state'
import { useTheme } from '@/store/theme/hook'

export default () => {
  const theme = useTheme()
  const [visible, setVisible] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [list, setList] = useState<LX.Music.MusicInfoOnline[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleOpen = () => {
    setKeyword(playerState.musicInfo.name ?? '')
    setList([])
    setError('')
    setVisible(true)
  }

  const handleSearch = async() => {
    if (!keyword.trim()) return
    setLoading(true)
    setError('')
    try {
      const source = (playerState.musicInfo.source as LX.OnlineSource) ?? 'all'
      const results = await search(keyword.trim(), 1, source)
      setList(results)
      if (!results.length) setError('未找到相关歌曲')
    } catch (e) {
      setError('搜索失败，请重试')
    }
    setLoading(false)
  }

  const handleSelect = async(item: LX.Music.MusicInfoOnline) => {
    try {
      const req = musicSdk[item.source as string]?.getLyric(toOldMusicInfo(item)) as any
      const lyricInfo = await (req?.promise ?? req) as LX.Music.LyricInfo
      if (!lyricInfo?.lyric) {
        toast('该歌曲无歌词')
        return
      }
      lrcSetLyric(lyricInfo.lyric, lyricInfo.tlyric ?? '')
      await setDesktopLyric(lyricInfo.lyric, lyricInfo.tlyric ?? '')
      toast('歌词已替换')
      setVisible(false)
    } catch (e) {
      toast('获取歌词失败')
    }
  }

  return (
    <>
      <TouchableOpacity style={styles.entry} onPress={handleOpen}>
        <Text color={theme['c-font-label']}>搜索歌词并替换（歌词不准时）</Text>
      </TouchableOpacity>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.mask}>
          <View style={styles.card}>
            <Text style={styles.title}>搜索歌词</Text>
            <View style={styles.searchRow}>
              <TextInput
                style={[styles.input, { color: theme['c-font-label'] }]}
                value={keyword}
                onChangeText={setKeyword}
                placeholder="输入歌曲名搜索"
                placeholderTextColor="#888"
                onSubmitEditing={handleSearch}
              />
              <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
                <Text color="#fff" style={styles.searchBtnText}>搜索</Text>
              </TouchableOpacity>
            </View>
            {loading
              ? <ActivityIndicator style={{ marginVertical: 24 }} color={theme['c-primary']} />
              : error
                ? <Text style={styles.error} color={theme['c-500']}>{error}</Text>
                : (
                  <FlatList
                    data={list}
                    keyExtractor={(item) => item.id}
                    style={{ flexGrow: 0, marginTop: 8 }}
                    renderItem={({ item }) => (
                      <TouchableOpacity style={styles.item} onPress={() => void handleSelect(item)}>
                        <Text size={14} numberOfLines={1} color={theme['c-font-label']}>{item.name}</Text>
                        <Text size={12} numberOfLines={1} color={theme['c-500']}>{item.singer}</Text>
                      </TouchableOpacity>
                    )}
                  />
                )}
            <TouchableOpacity style={styles.closeBtn} onPress={() => setVisible(false)}>
              <Text color={theme['c-500']}>关闭</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  entry: {
    paddingVertical: 10,
  },
  mask: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#1c1e21',
    borderRadius: 10,
    padding: 16,
    maxHeight: '70%',
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 6,
    paddingHorizontal: 10,
    fontSize: 14,
  },
  searchBtn: {
    backgroundColor: '#7aa2f7',
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  error: {
    textAlign: 'center',
    marginVertical: 16,
  },
  item: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#333',
  },
  closeBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
})
