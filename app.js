const lock = require('./utils/lock')

App({
  onLaunch() {
    // 首次启动初始化存储结构
    if (!wx.getStorageSync('items')) {
      wx.setStorageSync('items', [])
    }
    // 一次性清理历史示例数据（demo_ 前缀固定 ID）
    if (!wx.getStorageSync('demoCleaned')) {
      const items = wx.getStorageSync('items')
      if (Array.isArray(items)) {
        wx.setStorageSync('items', items.filter((it) => !/^demo_/.test(it.id)))
      }
      const wishes = wx.getStorageSync('wishes')
      if (Array.isArray(wishes)) {
        wx.setStorageSync('wishes', wishes.filter((w) => !/^demo_/.test(w.id)))
      }
      wx.setStorageSync('demoCleaned', true)
    }

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
  },

  /** 切后台即重新上锁（设置里可关） */
  onHide() {
    if (lock.enabled() && lock.onBackground()) lock.lockNow()
  },

  /** 旧分享卡片 / 失效路径不要停在白屏，直接回首页 */
  onPageNotFound(res) {
    console.warn('[记物] 页面不存在，回首页：', res && res.path)
    wx.switchTab({ url: '/pages/index/index' })
  },

  onError(msg) {
    console.error('[记物] 运行错误：', msg)
  }
})
