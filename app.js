const demo = require('./utils/demo')

App({
  onLaunch() {
    // 首次启动初始化存储结构
    if (!wx.getStorageSync('items')) {
      wx.setStorageSync('items', [])
    }
    // 载入示例物品（仅一次）
    demo.loadDemo()
  }
})
