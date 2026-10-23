import { useEffect, useState } from 'react'
import state, { type InitState } from './state'

export const useDownloadList = (): InitState['list'] => {
  const [value, update] = useState(state.list)

  useEffect(() => {
    const handleUpdate = (list: InitState['list']) => {
      update([...list])
    }
    global.state_event.on('downloadListUpdated', handleUpdate)
    return () => {
      global.state_event.off('downloadListUpdated', handleUpdate)
    }
  }, [])

  return value
}
