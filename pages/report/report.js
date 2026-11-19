const report = require('../../utils/report')

Page({
  data: {
    years: [],
    yearIndex: 0,
    r: null,
    amountHidden: false
  },

  onShow() {
    this.setData({ amountHidden: !!wx.getStorageSync('amountHidden') })
    this.refresh()
  },

  refresh() {
    const years = report.years()
    let idx = this.data.yearIndex
    if (idx > years.length - 1) idx = years.length - 1
    if (idx < 0) idx = 0
    const year = years[idx] || String(new Date().getFullYear())
    this.setData({
      years,
      yearIndex: idx,
      r: report.build(year)
    })
    wx.setNavigationBarTitle({ title: year + ' 时光账单' })
  },

  stepYear(e) {
    const dir = Number(e.currentTarget.dataset.d)
    const next = this.data.yearIndex + dir
    if (next < 0 || next >= this.data.years.length) return
    this.setData({ yearIndex: next }, () => this.refresh())
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id
    if (id) wx.navigateTo({ url: '/pages/detail/detail?id=' + id })
  },

  onShareAppMessage() {
    const r = this.data.r
    if (!r) return { title: '日用即值' }
    return {
      title: '我的 ' + r.year + ' 年账单：买了 ' + r.count + ' 件、花掉 ¥' + r.spend,
      path: '/pages/report/report'
    }
  }
})
