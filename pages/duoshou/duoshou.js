const store = require('../../utils/store')

/** 秒数 → m:ss */
function fmtSec(s) {
  const m = Math.floor(s / 60)
  const r = s % 60
  return m + ':' + (r < 10 ? '0' : '') + r
}

/** 预计用时文案：1 个数约 1 秒 */
function fmtEstimate(n) {
  if (n <= 0) return ''
  if (n < 60) return n + ' 个数 · 约 1 分钟内'
  const min = Math.ceil(n / 60)
  if (min < 60) return n + ' 个数 · 约 ' + min + ' 分钟'
  const h = Math.ceil(min / 60 * 10) / 10
  return n + ' 个数 · 约 ' + h + ' 小时'
}

Page({
  data: {
    phase: 'mode', // mode 开始 | count 数数中 | done 数完 | quit 放弃
    wish: null,
    sessionNo: 1,
    priceText: '',
    moneyTarget: 0,
    moneyEst: '',
    // 数数中
    target: 0,
    count: 0,
    seconds: 0,
    left: 0,
    elapsed: '0:00',
    // 结果
    doneText: '',
    quitText: ''
  },

  onLoad(query) {
    const w = store.getWishes().find((x) => x.id === query.id)
    if (!w) {
      wx.showToast({ title: '草不存在', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 600)
      return
    }
    const moneyTarget = w.price > 0 ? Math.ceil(w.price) : 0
    this.setData({
      wish: w,
      sessionNo: (w.sessions || []).length + 1,
      priceText: w.price > 0 ? Math.round(w.price * 100) / 100 : '',
      moneyTarget,
      moneyEst: fmtEstimate(moneyTarget)
    })
  },

  onUnload() {
    this._stopTimer()
  },

  _stopTimer() {
    if (this._timer) {
      clearInterval(this._timer)
      this._timer = null
    }
  },

  // ---------- 开始 ----------

  close() {
    wx.navigateBack()
  },

  /** 1 元 = 1 个数 */
  chooseMoney() {
    this._start(this.data.moneyTarget)
  },

  _start(target) {
    if (!(target > 0)) {
      wx.showToast({ title: '这株草还没有价格', icon: 'none' })
      return
    }
    this._stopTimer()
    this._startTs = Date.now()
    this.setData({
      phase: 'count',
      target,
      count: 0,
      left: target,
      seconds: 0,
      elapsed: '0:00'
    })
    this._timer = setInterval(() => {
      const seconds = Math.floor((Date.now() - this._startTs) / 1000)
      this.setData({ seconds, elapsed: fmtSec(seconds) })
    }, 1000)
  },

  // ---------- 数数中 ----------

  /** 点一下屏幕 = 数一个数 */
  tapCount() {
    const c = this.data.count + 1
    if (c >= this.data.target) {
      this.setData({ count: c, left: 0 })
      this._finish()
      return
    }
    this.setData({ count: c, left: this.data.target - c })
  },

  /** 放弃：退出并记录放弃点 */
  giveUp() {
    wx.showModal({
      title: '数到 ' + this.data.count + ' 就停下？',
      content: '会记下这个放弃点，草标记为「冷静中」',
      confirmText: '停下',
      success: (r) => {
        if (!r.confirm) return
        this._stopTimer()
        store.addDuoshouSession(this.data.wish.id, {
          target: this.data.target,
          reached: this.data.count,
          done: false,
          seconds: this.data.seconds
        })
        this.setData({
          phase: 'quit',
          quitText: this.data.count
        })
      }
    })
  },

  // ---------- 结果 ----------

  _finish() {
    this._stopTimer()
    store.addDuoshouSession(this.data.wish.id, {
      target: this.data.target,
      reached: this.data.target,
      done: true,
      seconds: this.data.seconds
    })
    this.setData({
      phase: 'done',
      doneText: '从 1 一个个数到 ' + this.data.target + '，这个价格你亲手数完了。'
    })
  },

  /** 数完 → 拔草，转入物品清单 */
  pullGrass() {
    const item = store.pullWish(this.data.wish.id)
    if (!item) {
      wx.showToast({ title: '草不存在', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 600)
      return
    }
    wx.redirectTo({ url: '/pages/detail/detail?id=' + item.id })
  },

  keepGrass() {
    wx.navigateBack()
  },

  /** 放弃后：草标记冷静中，直接回去 */
  keepCooled() {
    wx.navigateBack()
  },

  /** 放弃后：干脆拔掉 */
  dropGrass() {
    store.removeWish(this.data.wish.id)
    wx.showToast({ title: '已拔草', icon: 'none' })
    setTimeout(() => wx.navigateBack(), 400)
  }
})
