import { forwardRef, useImperativeHandle, useMemo, useState } from 'react'

import Basic from './settings/Basic'
import Player from './settings/Player'
import LyricDesktop from './settings/LyricDesktop'
import Search from './settings/Search'
import List from './settings/List'
import CleanCache from './settings/CleanCache'
import Log from './settings/Log'
import Version from './settings/Version'
import About from './settings/About'

// 竖屏首页：前 6 个为二级分组（点击进入）；version 在首页直接展开（仍保留在清单中供横屏 tab 使用）
export const SETTING_SCREENS = [
  'basic',
  'player',
  'lyric_desktop',
  'search',
  'list',
  'clean_cache',
  'log',
  'version',
  'about',
] as const

export type SettingScreenIds = typeof SETTING_SCREENS[number]

// interface MainProps {
//   onUpdateActiveId: (id: string) => void
// }
export interface MainType {
  setActiveId: (id: SettingScreenIds) => void
}

const Main = forwardRef<MainType, {}>((props, ref) => {
  const [id, setId] = useState(global.lx.settingActiveId)

  useImperativeHandle(ref, () => ({
    setActiveId(id) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setId(id)
        })
      })
    },
  }))

  const component = useMemo(() => {
    switch (id) {
      case 'player': return <Player />
      case 'lyric_desktop': return <LyricDesktop />
      case 'search': return <Search />
      case 'list': return <List />
      case 'clean_cache': return <CleanCache />
      case 'log': return <Log />
      case 'version': return <Version />
      case 'about': return <About />
      case 'basic':
      default: return <Basic />
    }
  }, [id])

  return component
})


export default Main
