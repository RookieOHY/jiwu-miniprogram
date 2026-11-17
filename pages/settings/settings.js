const store = require('../../utils/store')
const tabAnim = require('../../utils/tabAnim')
const demo = require('../../utils/demo')

Page({
  onShow() {
    // 同步胶囊 TabBar 选中态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 })
    }
    tabAnim(this)
  },

  /** 载入示例数据（固定 ID 去重，可重复点不会加重复） */
  loadDemo() {
    wx.showModal({
      title: '载入示例数据',
      content: '会添加示例物品和示例种草（含已卖出、已退役、冷静中等各种状态），不影响你自己的记录。',
      confirmText: '载入',
      success: (m) => {
        if (!m.confirm) return
        const r = demo.seed()
        if (!r.items && !r.wishes) {
          wx.showToast({ title: '示例数据已存在', icon: 'none' })
        } else {
          wx.showToast({ title: '已载入 ' + r.items + ' 件物品 · ' + r.wishes + ' 株草', icon: 'none' })
        }
      }
    })
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
