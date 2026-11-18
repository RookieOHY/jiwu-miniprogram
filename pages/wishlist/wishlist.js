const store = require('../../utils/store')
const tabAnim = require('../../utils/tabAnim')
const cloud = require('../../utils/cloud')

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
    wishes: [],    totalPrice: '0',
    totalDaily: '0',
    cloudOn: false,
    pollMap: {}
  },

  onShow() {
    // 同步胶囊 TabBar 选中态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1, hideText: store.getTabbarHideText() })
    }
    tabAnim(this)
    this.setData({ cloudOn: cloud.isReady() })
    this.refresh()
    this.refreshPolls()
  },

  refresh() {
    const raw = store.getWishes()
    const wishes = raw.map((w) => {
      const count = (w.sessions || []).length
      let sessionsText = ''
      if (count > 0) {
        sessionsText = '数过 ' + count + ' 次' + (w.maxReached > 0 ? '，最远数到 ' + fmtNum(w.maxReached) : '')
      }
      return {
        id: w.id,
        name: w.name,
        // 无价格传空，前端显示「待定价」
        price: w.price > 0 ? fmtNum(w.price) : '',
        daily: w.price > 0 ? fmtDaily(w.price) : '',
        reason: w.reason,
        alternative: w.alternative,
        url: w.url,
        cooled: w.status === 'cooled',
        sessionsText,
        reviewText: this._reviewText(w.id),
        time: timeAgo(w.createdAt)
      }
    })
    const total = raw.reduce((s, w) => s + w.price, 0)
    this.setData({
      wishes,
      totalPrice: fmtNum(total),
      totalDaily: fmtDaily(total)
    })
  },

  /** 好友评审结果文案（云未开通时为空） */
  _reviewText(wishId) {
    const p = this.data.pollMap[wishId]
    if (!p || !p.tally || !p.tally.total) return ''
    const t = p.tally
    let txt = '好友评审 · 买 ' + t.buy + ' / 想想 ' + t.think + ' / 别买 ' + t.no
    if (t.total === 1 && t.buy === 1) txt += ' · 有人说买'
    if (t.no >= 2) txt += ' · 该冷静了'
    return txt
  },

  /** 拉取自己所有评审的票数（云开通时） */
  refreshPolls() {
    if (!cloud.isReady()) return
    cloud.call({ action: 'list' })
      .then((r) => {
        const res = r.result
        if (res && res.ok) {
          this.setData({ pollMap: res.polls, cloudOn: true })
          this.refresh()
        }
      })
      .catch(() => {
        // 云不可用（未部署函数等）：静默降级
        this.setData({ cloudOn: false })
      })
  },

  /** 发起好友评审：生成评审卡 → 引导转发 */
  onReview(e) {
    const id = e.currentTarget.dataset.id
    const w = store.getWishes().find((w) => w.id === id)
    if (!w) return
    cloud.call({
      action: 'create',
      wishId: id,
      name: w.name,
      price: w.price,
      reason: w.reason,
      url: w.url
    })
      .then((r) => {
        const res = r.result
        if (res && res.ok) {
          // 记录待分享的评审卡，onShareAppMessage 里用
          this._reviewShare = { pollId: res.pollId, name: w.name, price: w.price }
          wx.showModal({
            title: '评审卡已生成',
            content: '点右上角「···」→「转发」，发给好友。他们打开小程序就能投「买 / 再想想 / 别买」，票数会显示在这株草上。',
            showCancel: false,
            confirmText: '知道了'
          })
          this.refreshPolls()
        }
      })
      .catch(() => wx.showToast({ title: '云服务不可用', icon: 'none' }))
  },

  /** 剁手：进入计数器，从 1 数到价格 */
  goDuoshou(e) {
    const id = e.currentTarget.dataset.id
    const w = store.getWishes().find((w) => w.id === id)
    if (!w) return
    if (!(w.price > 0)) {
      wx.showToast({ title: '先补个价格再数', icon: 'none' })
      return
    }
    wx.navigateTo({ url: '/pages/duoshou/duoshou?id=' + id })
  },

  /** 转发：评审中走专属评审卡，否则默认分享 */
  onShareAppMessage() {
    const r = this._reviewShare
    if (r) {
      return {
        title: '帮我看看：「' + r.name + '」' + (r.price > 0 ? ' ¥' + r.price : '') + '，买不买？',
        path: '/pages/vote/vote?pollId=' + r.pollId
      }
    }
    return { title: '记物 · 记录你的物品与日均成本', path: '/pages/index/index' }
  },

  copyLink(e) {
    const url = e.currentTarget.dataset.url
    wx.setClipboardData({
      data: url,
      success: () => wx.showToast({ title: '链接已复制', icon: 'none' })
    })
  },

  /** 长按：编辑 / 复制链接 / 删除 */
  onWishLongPress(e) {
    const id = e.currentTarget.dataset.id
    const w = store.getWishes().find((w) => w.id === id)
    if (!w) return
    const actions = w.url ? ['编辑', '复制链接', '删除'] : ['编辑', '删除']
    wx.showActionSheet({
      itemList: actions,
      itemColor: '#2b2b2b',
      success: (r) => {
        if (r.tapIndex === 0) {
          wx.navigateTo({ url: '/pages/wishlist/add?id=' + id })
        } else if (actions[r.tapIndex] === '复制链接') {
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
