// 歌单标签编辑（借鉴 MusicFree 歌单分类）：给用户歌单设置/清除标签
import { useRef, useImperativeHandle, forwardRef, useState } from 'react'
import ConfirmAlert, { type ConfirmAlertType } from '@/components/common/ConfirmAlert'
import Text from '@/components/common/Text'
import { View } from 'react-native'
import Input, { type InputType } from '@/components/common/Input'
import { updateUserList } from '@/core/list'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'

interface TagInputType {
  setTag: (text: string) => void
  getText: () => string
  focus: () => void
}
const TagInput = forwardRef<TagInputType, {}>((props, ref) => {
  const theme = useTheme()
  const [text, setText] = useState('')
  const inputRef = useRef<InputType>(null)

  useImperativeHandle(ref, () => ({
    getText() {
      return text.trim()
    },
    setTag(text) {
      setText(text)
    },
    focus() {
      inputRef.current?.focus()
    },
  }))

  return (
    <Input
      ref={inputRef}
      placeholder="如：华语、车载、跑步（留空清除标签）"
      value={text}
      onChangeText={setText}
      style={{ ...styles.input, backgroundColor: theme['c-primary-input-background'] }}
    />
  )
})


export interface ListTagEditType {
  show: (listInfo: LX.List.UserListInfo) => void
}
const initSelectInfo = {}


export default forwardRef<ListTagEditType, {}>((props, ref) => {
  const alertRef = useRef<ConfirmAlertType>(null)
  const tagInputRef = useRef<TagInputType>(null)
  const selectedListInfo = useRef<LX.List.UserListInfo>(initSelectInfo as LX.List.UserListInfo)
  const [visible, setVisible] = useState(false)

  const handleShow = () => {
    alertRef.current?.setVisible(true)
    requestAnimationFrame(() => {
      tagInputRef.current?.setTag(selectedListInfo.current.tag ?? '')
      setTimeout(() => {
        tagInputRef.current?.focus()
      }, 300)
    })
  }
  useImperativeHandle(ref, () => ({
    show(listInfo) {
      selectedListInfo.current = listInfo
      if (visible) handleShow()
      else {
        setVisible(true)
        requestAnimationFrame(() => {
          handleShow()
        })
      }
    },
  }))

  const handleSave = () => {
    let tag = tagInputRef.current?.getText() ?? ''
    if (tag.length > 20) tag = tag.substring(0, 20)
    void updateUserList([{ ...selectedListInfo.current, tag: tag || undefined }])
    alertRef.current?.setVisible(false)
  }

  return (
    visible
      ? <ConfirmAlert
          ref={alertRef}
          onConfirm={handleSave}
        >
          <View style={styles.renameContent}>
            <Text style={{ marginBottom: 5 }}>编辑歌单标签</Text>
            <TagInput ref={tagInputRef} />
          </View>
        </ConfirmAlert>
      : null
  )
})

const styles = createStyle({
  renameContent: {
    // paddingTop: 5,
    paddingBottom: 10,
  },
  input: {
    marginTop: 5,
  },
})
