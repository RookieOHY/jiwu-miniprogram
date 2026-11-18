const store = require('../../utils/store')
const tags = require('../../utils/tags')

Page({
  data: {
    tags: [],
    counts: {},
    newTag: ''
  },

  onShow() {
    this.refresh()
  },

  refresh() {
    const items = store.getAll()
    const list = tags.getTags()
    const counts = {}
    list.forEach((t) => { counts[t] = tags.countFor(t, items) })
    this.setData({ tags: list, counts })
  },

  onNewTag(e) {
    this.setData({ newTag: e.detail.value })
  },

  add() {
    const ok = tags.addTag(this.data.newTag)
    if (ok) {
      this.setData({ newTag: '' })
      this.refresh()
    } else {
      wx.showToast({ title: this.data.newTag.trim() ? '标签已存在' : '请输入标签名', icon: 'none' })
    }
  },

  remove(e) {
    const t = e.currentTarget.dataset.t
    wx.showModal({
      title: '删除标签',
      content: '「' + t + '」将被移除（不影响已记录的物品），确定？',
      confirmText: '删除',
      confirmColor: '#c05a4d',
      success: (m) => {
        if (m.confirm) {
          tags.removeTag(t)
          this.refresh()
        }
      }
    })
  }
})
