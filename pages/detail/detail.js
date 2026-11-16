const store = require('../../utils/store')

Page({
  data: {
    item: null,
    daily: '',
    monthly: '',
    days: 0,
    endDate: ''
  },

  onLoad(query) {
    this.id = query.id
    this.maxDate = this.fmtDate(new Date())
  },

  onShow() {
    this.refresh()
  },

  fmtDate(d) {
    const p = (n) => (n < 10 ? '0' + n : '' + n)
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
  },

  refresh() {
    const it = store.getById(this.id)
    if (!it) {
      wx.showToast({ title: '物品不存在', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 600)
      return
    }
    const today = this.fmtDate(new Date())
    const retired = it.retired
    const sold = !!it.sold
    const profit = sold ? it.soldPrice - it.price : 0
    this.setData({
      item: {
        id: it.id,
        name: it.name,
        price: store.fmtMoney(it.price),
        buyDate: it.buyDate,
        category: it.category,
        catName: store.getCategoryName(it.category),
        platformName: store.getPlatformName(it.platform),
        note: it.note,
        pinned: !!it.pinned,
        retired: retired,
        sold: sold,
        soldDate: it.soldDate || null,
        soldPrice: sold ? store.fmtMoney(it.soldPrice) : '',
        profit: store.fmtMoney(Math.abs(profit)),
        profitSign: profit >= 0 ? '+' : '-'
      },
      days: store.daysHeld(it),
      daily: store.fmtMoney(store.dailyCost(it)),
      // 摊销预测：一次性购入的物品，持有越久日均越低
      daily30: store.fmtMoney(it.price / 30),
      daily365: store.fmtMoney(it.price / 365),
      endDate: it.retired && it.retiredDate ? it.retiredDate : today,
      maxDate: this.maxDate
    })
    wx.setNavigationBarTitle({ title: it.name })
  },

  /** 退役：结束计时，锁定最终日均 */
  retire() {
    const it = store.getById(this.id)
    const today = this.fmtDate(new Date())
    wx.showModal({
      title: '确认退役？',
      content: `将停止日均计算，最终日均 ¥${store.fmtMoney(store.dailyCost(it))}`,
      confirmText: '退役',
      success: (r) => {
        if (r.confirm) {
          store.updateItem(this.id, { retired: true, retiredDate: today })
          this.refresh()
          wx.showToast({ title: '已退役', icon: 'success' })
        }
      }
    })
  },

  /** 标记卖出：记录卖出价与日期，日均锁定，可复盘真实成本 */
  sell() {
    const it = store.getById(this.id)
    const today = this.fmtDate(new Date())
    wx.showModal({
      title: '标记为已卖出',
      editable: true,
      placeholderText: '卖出价格（元），不填视为 0',
      content: `持有 ${store.daysHeld(it)} 天，最终日均 ¥${store.fmtMoney(store.dailyCost(it))}`,
      confirmText: '卖出',
      success: (r) => {
        if (!r.confirm) return
        const p = parseFloat(r.content)
        const soldPrice = p > 0 ? p : 0
        store.updateItem(this.id, {
          sold: true,
          soldPrice: soldPrice,
          soldDate: today,
          retired: true,
          retiredDate: today
        })
        this.refresh()
        wx.showToast({ title: '已标记卖出', icon: 'success' })
      }
    })
  },

  unRetire() {
    wx.showModal({
      title: '恢复持有？',
      content: '将重新开始计算日均成本',
      success: (r) => {
        if (r.confirm) {
          store.updateItem(this.id, {
            retired: false,
            retiredDate: null,
            sold: false,
            soldPrice: null,
            soldDate: null
          })
          this.refresh()
        }
      }
    })
  },

  remove() {
    wx.showModal({
      title: '删除物品',
      content: '删除后无法恢复，确定删除？',
      confirmText: '删除',
      confirmColor: '#c05a4d',
      success: (r) => {
        if (r.confirm) {
          store.removeItem(this.id)
          wx.navigateBack()
        }
      }
    })
  }
})
