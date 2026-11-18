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
    wx.navigateTo({ url: '/pages/detail/detail?id=' + e.currentTarget.dataset.id })
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
