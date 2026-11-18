const reminders = require('../../utils/reminders')
const lock = require('../../utils/lock')

Page({
  data: {
    list: []
  },

  onShow() {

    if (lock.guard()) return
    this.refresh()
  },

  refresh() {
    this.setData({ list: reminders.getReminders() })
  },

  goDetail(e) {
    const d = e.currentTarget.dataset
    // 预算类没有对应物品，跳统计页的预算区
    if (d.kind === 'budget') {
      wx.switchTab({ url: '/pages/stats/stats' })
      return
    }
    wx.navigateTo({ url: '/pages/detail/detail?id=' + d.id })
  },

  hide(e) {
    reminders.dismiss(e.currentTarget.dataset.id)
    this.refresh()
    wx.showToast({ title: '本次不再提醒', icon: 'none' })
  },

  restore() {
    reminders.restoreAll()
    this.refresh()
    wx.showToast({ title: '已恢复全部提醒', icon: 'success' })
  }
})
