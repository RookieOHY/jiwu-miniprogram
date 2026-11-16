const store = require('../../utils/store')

Page({
  data: {
    name: '',
    price: '',
    buyDate: '',
    category: 'other',
    categories: store.CATEGORIES,
    platform: 'other',
    platformChips: [],
    showAllPlatforms: false,
    currency: 'CNY',
    currencies: store.CURRENCIES,
    note: '',
    maxDate: '',
    canSave: false
  },

  onLoad() {
    const d = new Date()
    const p = (n) => (n < 10 ? '0' + n : '' + n)
    const today = d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
    this.setData({ buyDate: today, maxDate: today })
    this.updatePlatformChips()
  },

  /** 计算渠道标签：收起时只显示常用项 + 当前已选的非常用项 */
  updatePlatformChips() {
    const list = this.data.showAllPlatforms
      ? store.PLATFORMS
      : store.PLATFORMS.filter(
          (p) => store.COMMON_PLATFORMS.includes(p.key) || p.key === this.data.platform
        )
    this.setData({ platformChips: list })
  },

  togglePlatforms() {
    this.setData({ showAllPlatforms: !this.data.showAllPlatforms }, () => this.updatePlatformChips())
  },

  onName(e) {
    const name = e.detail.value
    this.setData({ name, canSave: !!name.trim() && !!this.data.price })
  },

  onPrice(e) {
    const price = e.detail.value
    this.setData({ price, canSave: !!this.data.name.trim() && !!price })
  },

  onDate(e) {
    this.setData({ buyDate: e.detail.value })
  },

  onCat(e) {
    this.setData({ category: e.currentTarget.dataset.key })
  },

  onPlatform(e) {
    this.setData({ platform: e.currentTarget.dataset.key }, () => this.updatePlatformChips())
  },

  onCurrency(e) {
    this.setData({ currency: e.currentTarget.dataset.key })
  },

  onNote(e) {
    this.setData({ note: e.detail.value })
  },

  save() {
    const { name, price, buyDate, category, platform, currency, note } = this.data
    const p = parseFloat(price)
    if (!name.trim()) {
      wx.showToast({ title: '请填写物品名称', icon: 'none' })
      return
    }
    if (!(p > 0)) {
      wx.showToast({ title: '请填写有效价格', icon: 'none' })
      return
    }
    store.addItem({ name: name.trim(), price: p, buyDate, category, platform, currency, note })
    wx.showToast({ title: '已记录', icon: 'success' })
    setTimeout(() => wx.navigateBack(), 500)
  }
})
