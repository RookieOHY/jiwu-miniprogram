App({
  onLaunch() {
    // 首次启动初始化存储结构
    if (!wx.getStorageSync('items')) {
      wx.setStorageSync('items', [])
    }
  }
})
