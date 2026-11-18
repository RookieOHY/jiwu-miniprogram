const store = require('../../utils/store')
const lock = require('../../utils/lock')

Page({
  onShow() {
    if (lock.guard()) return
  },

  data: {
    isEdit: false,
    name: '',
    price: '',
    url: '',
    reason: '',
    alternative: '',
    daily: '',
    canSave: false
  },

  onLoad(query) {
    if (query.id) {
      const w = store.getWishes().find((w) => w.id === query.id)
      if (w) {
        this.id = w.id
        this.setData({
          isEdit: true,
          name: w.name,
          price: w.price > 0 ? String(w.price) : '',
          url: w.url || '',
          reason: w.reason || '',
          alternative: w.alternative || '',
          canSave: !!w.name
        })
        wx.setNavigationBarTitle({ title: '编辑种草' })
        this._updateDaily()
      }
    }
  },

  _updateDaily() {
    const n = Number(this.data.price)
    let daily = ''
    if (this.data.price && n > 0) {
      const d = n / 30
      const v = d >= 100 ? String(Math.round(d)) : String(Math.round(d * 100) / 100)
      daily = v.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    }
    this.setData({ daily })
  },

  onName(e) {
    const name = e.detail.value
    this.setData({ name, canSave: !!name.trim() })
  },

  onPrice(e) {
    this.setData({ price: e.detail.value }, () => this._updateDaily())
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
    const payload = {
      name,
      price: this.data.price,
      url: this.data.url.trim(),
      reason: this.data.reason.trim(),
      alternative: this.data.alternative.trim()
    }
    if (this.data.isEdit) {
      // 只 patch 表单字段，数数记录 / 冷静状态原样保留
      store.updateWish(this.id, payload)
      wx.showToast({ title: '已保存', icon: 'none' })
    } else {
      store.addWish(payload)
      wx.showToast({ title: '已种草 🌱', icon: 'none' })
    }
    setTimeout(() => wx.navigateBack(), 400)
  }
})
