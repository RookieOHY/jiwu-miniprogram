const store = require('../../utils/store')

Page({
  data: {
    name: '',
    price: '',
    url: '',
    reason: '',
    alternative: '',
    daily: '',
    canSave: false
  },

  onName(e) {
    const name = e.detail.value
    this.setData({ name, canSave: !!name.trim() })
  },

  onPrice(e) {
    const price = e.detail.value
    const n = Number(price)
    this.setData({
      price,
      daily: price && n > 0 ? (n / 30).toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1') : ''
    })
  },

  onUrl(e) {
    this.setData({ url: e.detail.value })
  },

  onReason(e) {
    this.setData({ reason: e.detail.value })
  },

  onAlternative(e) {
    this.setData({ alternative: e.detail.value })
  },

  save() {
    const name = this.data.name.trim()
    if (!name) return
    store.addWish({
      name,
      price: this.data.price,
      url: this.data.url.trim(),
      reason: this.data.reason.trim(),
      alternative: this.data.alternative.trim()
    })
    wx.showToast({ title: '已种草 🌱', icon: 'none' })
    setTimeout(() => wx.navigateBack(), 400)
  }
})
