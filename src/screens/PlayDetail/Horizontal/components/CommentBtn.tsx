import { useRef } from 'react'

import Btn from './Btn'
import PlayListModal, { type PlayListModalType } from '@/screens/PlayDetail/components/PlayListModal'

// 播放列表按钮：点击弹出当前播放列表，可手动选择歌曲播放（替代原"评论"按钮）
export default () => {
  const modalRef = useRef<PlayListModalType>(null)

  return (
    <>
      <Btn icon="list-order" onPress={() => { modalRef.current?.setVisible(true) }} />
      <PlayListModal ref={modalRef} />
    </>
  )
}
