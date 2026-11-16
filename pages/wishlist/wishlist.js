const store = require('../../utils/store')

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
    const wishes = store
      .getWishes()
      .map((w) => ({
        id: w.id,
        name: w.name,
        price: store.fmtMoney(w.price),
        daily: store.fmtMoney(w.price / 30),
        reason: w.reason,
        alternative: w.alternative,
        url: w.url
      }))
    const total = store.getWishes().reduce((s, w) => s + w.price, 0)
    this.setData({
      wishes,
      totalPrice: store.fmtMoney(total),
      totalDaily: store.fmtMoney(total / 30)
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
