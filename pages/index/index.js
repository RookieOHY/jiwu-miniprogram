const store = require('../../utils/store')

Page({
  data: {
    items: [],
    totalSpend: '0',
    count: 0,
    filter: 'all', // all | 持有中 | 已退役 | 已卖出
    viewMode: 'list', // list | card
    heroHidden: false,
    totalDaily: '0'
  },
  /** 上滑收起顶部绿色汇总卡（迟滞阈值防抖动：>300 收起，<20 展开） */
  onPageScroll(e) {
    const st = e.scrollTop
    const cur = this.data.heroHidden
    let hide = cur
    if (!cur && st > 300) hide = true
    else if (cur && st < 20) hide = false
    if (hide !== cur) {
      this.setData({ heroHidden: hide })
    }
  },

  onShow() {
    // 同步胶囊 TabBar 选中态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 })
    }
    this.refresh()
  },

  onLoad() {
    // 记住用户的视图偏好
    const saved = wx.getStorageSync('viewMode')
    if (saved) this.setData({ viewMode: saved })
  },

  /** 切换列表/卡片视图，图标显示将要切过去的视图 */
  toggleView() {
    const viewMode = this.data.viewMode === 'list' ? 'card' : 'list'
    this.setData({ viewMode })
    wx.setStorageSync('viewMode', viewMode)
  },

  /** 直接选择视图（list | card），不做切换翻转 */
  setView(e) {
    const viewMode = e.currentTarget.dataset.v
    if (viewMode === this.data.viewMode) return
    this.setData({ viewMode })
    wx.setStorageSync('viewMode', viewMode)
  },

  refresh() {
    const all = store.getAll()
    const today = this.fmtDate(new Date())
    const totalSpend = all.reduce((s, it) => s + store.toCNY(it.price, it.currency), 0)
    // 总日均：持有中物品的日均成本之和（折算人民币）
    const totalDaily = all
      .filter((it) => !it.retired)
      .reduce((s, it) => s + store.toCNY(store.dailyCost(it), it.currency), 0)

    const items = all
      .filter((it) => {
        if (this.data.filter === '持有中' && it.retired) return false
        if (this.data.filter === '已退役' && (!it.retired || it.sold)) return false
        if (this.data.filter === '已卖出' && !it.sold) return false
        return true
      })
      .map((it) => ({
        id: it.id,
        name: it.name,
        price: store.fmtMoney(it.price),
        buyDate: it.buyDate,
        category: it.category,
        catName: store.getCategoryName(it.category),
        platform: it.platform,
        platformName: store.getPlatformName(it.platform),
        symbol: store.currencySymbol(it.currency),
        retired: it.retired,
        sold: !!it.sold,
        pinned: !!it.pinned,
        daily: store.fmtMoney(store.dailyCost(it)),
        days: store.daysHeld(it)
      }))
      // 置顶的排最前，其余保持最新买入在前的顺序
      .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))

    this.setData({
      items,
      count: all.length,
      totalSpend: store.fmtMoney(totalSpend),
      totalDaily: store.fmtMoney(totalDaily)
    })
  },

  fmtDate(d) {
    const p = (n) => (n < 10 ? '0' + n : '' + n)
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
  },

  setFilter(e) {
    this.setData({ filter: e.currentTarget.dataset.f }, () => this.refresh())
  },

  goDetail(e) {
    wx.navigateTo({ url: '/pages/detail/detail?id=' + e.currentTarget.dataset.id })
  },

  /** 长按物品：置顶 / 删除 */
  onItemLongPress(e) {
    const id = e.currentTarget.dataset.id
    const it = store.getById(id)
    if (!it) return
    wx.showActionSheet({
      itemList: [it.pinned ? '取消置顶' : '置顶', '删除'],
      itemColor: '#2b2b2b',
      success: (r) => {
        if (r.tapIndex === 0) {
          if (!it.pinned && store.pinnedCount() >= store.PIN_LIMIT) {
            wx.showToast({ title: '最多置顶 ' + store.PIN_LIMIT + ' 件', icon: 'none' })
            return
          }
          store.updateItem(id, { pinned: !it.pinned })
          this.refresh()
          wx.showToast({ title: it.pinned ? '已取消置顶' : '已置顶', icon: 'none' })
        } else if (r.tapIndex === 1) {
          wx.showModal({
            title: '删除物品',
            content: '删除「' + it.name + '」后无法恢复，确定删除？',
            confirmText: '删除',
            confirmColor: '#c05a4d',
            success: (m) => {
              if (m.confirm) {
                store.removeItem(id)
                this.refresh()
              }
            }
          })
        }
      }
    })
  },

  goStats() {
    wx.switchTab({ url: '/pages/stats/stats' })
  }
})
