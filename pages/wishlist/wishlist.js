const store = require('../../utils/store')

/** 千分位格式化：100000 → "100,000"，自动去尾零 */
function fmtNum(n) {
  const s = String(Math.round(Number(n) * 100) / 100)
  const parts = s.split('.')
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return parts.join('.')
}

/** 日均：大额取整，小额保留零头 */
function fmtDaily(price) {
  const d = price / 30
  if (d >= 100) return fmtNum(Math.round(d))
  return fmtNum(d)
}

/** 相对时间：今天 / 昨天 / N 天前 / 日期 */
function timeAgo(ts) {
  const diff = Math.floor((Date.now() - ts) / 86400000)
  if (diff < 1) return '今天'
  if (diff === 1) return '昨天'
  if (diff < 30) return diff + ' 天前'
  const d = new Date(ts)
  const p = (n) => (n < 10 ? '0' + n : '' + n)
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}

Page({
  data: {
    wishes: [],
    totalPrice: '0',
    totalDaily: '0'
  },

  onShow() {
    // 同步胶囊 TabBar 选中态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 })
    }
    this.refresh()
  },

  refresh() {
    const raw = store.getWishes()
    const wishes = raw.map((w) => ({
      id: w.id,
      name: w.name,
      // 无价格传空，前端显示「待定价」
      price: w.price > 0 ? fmtNum(w.price) : '',
      daily: w.price > 0 ? fmtDaily(w.price) : '',
      reason: w.reason,
      alternative: w.alternative,
      url: w.url,
      time: timeAgo(w.createdAt)
    }))
    const total = raw.reduce((s, w) => s + w.price, 0)
    this.setData({
      wishes,
      totalPrice: fmtNum(total),
      totalDaily: fmtDaily(total)
    })
  },

  goAdd() {
    wx.navigateTo({ url: '/pages/wishlist/add' })
  },

  copyLink(e) {
    const url = e.currentTarget.dataset.url
    wx.setClipboardData({
      data: url,
      success: () => wx.showToast({ title: '链接已复制', icon: 'none' })
    })
  },

  /** 长按：复制链接 / 删除 */
  onWishLongPress(e) {
    const id = e.currentTarget.dataset.id
    const w = store.getWishes().find((w) => w.id === id)
    if (!w) return
    const actions = w.url ? ['复制链接', '删除'] : ['删除']
    wx.showActionSheet({
      itemList: actions,
      itemColor: '#2b2b2b',
      success: (r) => {
        if (r.tapIndex === 0 && w.url) {
          wx.setClipboardData({
            data: w.url,
            success: () => wx.showToast({ title: '链接已复制', icon: 'none' })
          })
        } else {
          wx.showModal({
            title: '删除种草',
            content: '拔掉「' + w.name + '」这株草？',
            confirmText: '拔掉',
            confirmColor: '#c05a4d',
            success: (m) => {
              if (m.confirm) {
                store.removeWish(id)
                this.refresh()
                wx.showToast({ title: '已拔草', icon: 'none' })
              }
            }
          })
        }
      }
    })
  }
})
