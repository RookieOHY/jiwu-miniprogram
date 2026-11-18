const cloud = require('../../utils/cloud')
const lock = require('../../utils/lock')

const LABELS = { buy: '买！', think: '再想想', no: '别买' }

Page({
  onShow() {
    if (lock.guard()) return
  },

  data: {
    state: 'loading', // loading | ready | error
    error: '',
    poll: null,
    priceText: '',
    total: 0,
    tally: null, // { buy, think, no }
    mine: null,
    saving: false,
    voted: false
  },

  onLoad(query) {
    this.pollId = query.pollId
    this.fetch()
  },

  fetch() {
    if (!cloud.isReady()) {
      this.setData({ state: 'error', error: '云服务未开通，这个评审暂时打不开' })
      return
    }
    cloud.call({ action: 'get', pollId: this.pollId })
      .then((r) => {
        const res = r.result
        if (!res || !res.ok) {
          this.setData({ state: 'error', error: '评审不存在或已过期' })
          return
        }
        this.setData({
          state: 'ready',
          poll: res.poll,
          priceText: res.poll.price > 0 ? String(res.poll.price) : '',
          tally: res.tally,
          total: res.tally.total,
          mine: res.tally.mine,
          voted: !!res.tally.mine
        })
      })
      .catch(() => this.setData({ state: 'error', error: '网络开小差了，下拉重试' }))
  },

  onPullDownRefresh() {
    this.fetch()
    wx.stopPullDownRefresh()
  },

  /** 投票：一人一票，重复点算改票 */
  vote(e) {
    if (this.data.saving) return
    const choice = e.currentTarget.dataset.c
    if (this.data.mine === choice) return
    this.setData({ saving: true })
    cloud.call({ action: 'vote', pollId: this.pollId, choice })
      .then((r) => {
        const res = r.result
        if (res && res.ok) {
          this.setData({ tally: res.tally, total: res.tally.total, mine: res.mine, voted: true })
          wx.showToast({ title: '已投：' + LABELS[choice], icon: 'none' })
        } else {
          wx.showToast({ title: '投票失败', icon: 'none' })
        }
      })
      .catch(() => wx.showToast({ title: '投票失败', icon: 'none' }))
      .then(() => this.setData({ saving: false }))
  },

  onShareAppMessage() {
    const p = this.data.poll
    if (p) {
      return {
        title: '帮我看看：「' + p.name + '」' + (p.price > 0 ? ' ¥' + p.price : '') + '，买不买？',
        path: '/pages/vote/vote?pollId=' + this.pollId
      }
    }
    return { title: '记物 · 一件东西用得越久，每天就越便宜', path: '/pages/index/index' }
  },

  goHome() {
    wx.switchTab({ url: '/pages/index/index' })
  },

  copyUrl() {
    wx.setClipboardData({
      data: this.data.poll.url,
      success: () => wx.showToast({ title: '链接已复制', icon: 'none' })
    })
  }
})
