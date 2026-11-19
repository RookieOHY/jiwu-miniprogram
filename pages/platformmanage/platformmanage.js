const store = require('../../utils/store')

Page({
  data: {
    builtin: [],
    customs: [],
    counts: {},
    newName: ''
  },

  onShow() {
    this.refresh()
  },

  refresh() {
    const items = store.getAll()
    const customs = store.getCustomPlatforms()
    const counts = {}
    customs.forEach((p) => {
      counts[p.key] = items.filter((it) => it.platform === p.key).length
    })
    this.setData({
      builtin: store.PLATFORMS.filter((p) => p.key !== 'other'),
      customs,
      counts
    })
  },

  onNewName(e) {
    this.setData({ newName: e.detail.value })
  },

  add() {
    const r = store.addPlatform(this.data.newName)
    if (r.ok) {
      this.setData({ newName: '' })
      this.refresh()
      wx.showToast({ title: '已添加', icon: 'success' })
    } else {
      const msg = { empty: '请输入渠道名', dup: '渠道已存在', long: '名称最多 8 个字' }[r.reason] || '添加失败'
      wx.showToast({ title: msg, icon: 'none' })
    }
  },

  remove(e) {
    const key = e.currentTarget.dataset.k
    const name = e.currentTarget.dataset.n
    wx.showModal({
      title: '删除渠道',
      content: '「' + name + '」将被移除（仅在无物品使用时允许），确定？',
      confirmText: '删除',
      confirmColor: '#c05a4d',
      success: (m) => {
        if (!m.confirm) return
        const r = store.removePlatform(key)
        if (r.ok) {
          this.refresh()
        } else {
          wx.showToast({ title: r.used + ' 件物品在用，不能删', icon: 'none' })
        }
      }
    })
  }
})
