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
    let daily = ''
    if (price && n > 0) {
      const d = n / 30
      const v = d >= 100 ? String(Math.round(d)) : String(Math.round(d * 100) / 100)
      daily = v.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    }
    this.setData({ price, daily })
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
