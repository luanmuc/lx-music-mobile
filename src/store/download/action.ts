import state, { type InitState } from './state'

const emit = () => {
  global.state_event.downloadListUpdated(state.list)
}

export default {
  setList(list: InitState['list']) {
    state.list = list
    emit()
  },
  addItem(item: LX.Download.ListItem) {
    state.list.push(item)
    emit()
  },
  updateItem(item: LX.Download.ListItem) {
    const index = state.list.findIndex(t => t.id === item.id)
    if (index < 0) return
    state.list[index] = item
    emit()
  },
  removeItem(id: string) {
    const index = state.list.findIndex(t => t.id === id)
    if (index < 0) return
    state.list.splice(index, 1)
    emit()
  },
}
