// 组件级错误隔离（借鉴 MusicFree errorBoundary）：
// 单个页面渲染出错时只降级该页面，不导致整个 App 崩溃
import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

interface Props {
  children: React.ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#121212',
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  desc: {
    color: '#9aa0a6',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
  },
  btn: {
    color: '#7aa2f7',
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
})

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // 记录到控制台/日志系统，便于排查
    console.error('[ErrorBoundary]', error?.message ?? error, info?.componentStack ?? '')
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>页面出错了</Text>
          <Text style={styles.desc} numberOfLines={4}>
            {this.state.error?.message ?? '发生了未知错误'}
          </Text>
          <Text style={styles.btn} onPress={() => this.setState({ hasError: false, error: undefined })}>
            点击重试
          </Text>
        </View>
      )
    }
    return this.props.children
  }
}
