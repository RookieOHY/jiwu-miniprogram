const reminders = require('../../utils/reminders')
const notify = require('../../utils/notify')
const lock = require('../../utils/lock')

Page({
  data: {
    list: [],
    notifyReady: false,
    notifyQuota: 0,
    pushing: false
  },

  onShow() {

    if (lock.guard()) return
    this.refresh()
  },

  refresh() {
    this.setData({
      list: reminders.getReminders(),
      notifyReady: notify.ready(),
      notifyQuota: notify.quota()
    })
  },

  /** 把最紧急的一条推到微信服务通知 */
  pushWeChat() {
    if (!this.data.list.length) {
      wx.showToast({ title: '当前没有待提醒项', icon: 'none' })
      return
    }
    if (this.data.pushing) return
    this.setData({ pushing: true })
    const done = (r) => {
      this.setData({ pushing: false })
      this.refresh()
      if (r.needAuth) {
        wx.showModal({
          title: '需要先授权',
          content: '微信规定每授权一次才能推送一条。现在授权吗？',
          confirmText: '授权',
          success: (m) => {
            if (!m.confirm) return
            notify.ask((res) => {
              this.refresh()
              wx.showToast({ title: res.msg, icon: res.ok ? 'success' : 'none' })
            })
          }
        })
        return
      }
      wx.showToast({ title: r.msg, icon: r.ok ? 'success' : 'none' })
    }
    notify.send(this.data.list[0], done)
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
