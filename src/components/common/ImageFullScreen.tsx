// 封面大图全屏查看（借鉴 MusicFree imageViewer）：
// 点击封面弹全屏 Modal 查看原图，点任意处关闭
import { useState } from 'react'
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import Image from '@/components/common/Image'

export default ({ pic, children }: { pic: string | null | undefined, children: React.ReactNode }) => {
  const [visible, setVisible] = useState(false)
  if (!pic) return <>{children}</>
  return (
    <>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setVisible(true)}
        style={{ flexGrow: 0, flexShrink: 0 }}
      >
        {children}
      </TouchableOpacity>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.mask}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => setVisible(false)}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
          <View style={styles.imageWrap}>
            <Image url={pic} style={styles.image} resizeMode="contain" />
          </View>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={() => setVisible(false)}
          />
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  mask: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageWrap: {
    width: '100%',
    paddingHorizontal: 24,
  },
  image: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 4,
  },
  closeBtn: {
    position: 'absolute',
    top: 44,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: '#fff',
    fontSize: 22,
  },
})
