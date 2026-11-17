const demo = require('./utils/demo')

App({
  onLaunch() {
    // 首次启动初始化存储结构
    if (!wx.getStorageSync('items')) {
      wx.setStorageSync('items', [])
    }
    // 载入示例物品（仅一次）
    demo.loadDemo()

    // 夜间模式兜底：部分安卓微信切换主题时已渲染页面不重算 @media 样式，
    // 监听主题变化强制刷新当前页面，触发样式重渲染
    if (wx.onThemeChange) {
      wx.onThemeChange((res) => {
        const pages = getCurrentPages()
        const cur = pages[pages.length - 1]
        if (!cur || !cur.setData) return
        // 用一个无害的 data 触发当前页面（及其子组件）重渲染
        cur.setData({ __theme: res.theme })
      })
    }
  }
})
