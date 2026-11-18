const store = require('../../utils/store')
const tabAnim = require('../../utils/tabAnim')

Page({
  onShow() {
    // 同步胶囊 TabBar 选中态与文本显示配置
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3, hideText: store.getTabbarHideText() })
    }
    tabAnim(this)
  },

  data: {
    tabbarHideText: true
  },

  onLoad() {
    this.setData({ tabbarHideText: store.getTabbarHideText() })
  },

  /** 配置：是否隐藏底部胶囊的文本（默认开启） */
  onTabbarHideText(e) {
    const v = e.detail.value
    this.setData({ tabbarHideText: v })
    wx.setStorageSync('tabbarHideText', v)
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ hideText: v })
    }
  },

  /** 导出全部数据：JSON 复制到剪贴板 */
  exportData() {
    const items = store.getAll()
    if (!items.length) {
      wx.showToast({ title: '还没有数据可导出', icon: 'none' })
      return
    }
    const payload = {
      app: '记物',
      exportedAt: new Date().toISOString(),
      count: items.length,
      items
    }
    wx.setClipboardData({
      data: JSON.stringify(payload, null, 2),
      success: () => wx.showToast({ title: '已复制到剪贴板', icon: 'none' })
    })
  },

  /** 清空全部数据（二次确认） */
  clearData() {
    const count = store.getAll().length
    if (!count) {
      wx.showToast({ title: '当前没有数据', icon: 'none' })
      return
    }
    wx.showModal({
      title: '清空全部数据',
      content: '共 ' + count + ' 件物品记录将被删除，且无法恢复。确定清空？',
      confirmText: '清空',
      confirmColor: '#c05a4d',
      success: (m) => {
        if (m.confirm) {
          wx.setStorageSync('items', [])
          wx.showToast({ title: '已清空', icon: 'none' })
        }
      }
    })
  }
})
