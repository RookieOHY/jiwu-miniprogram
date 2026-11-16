const store = require('../../utils/store')

Page({
  data: {
    // 近 30 天柱状图
    bars: [],
    maxBar: 0,
    // 近 6 个月汇总
    months: [],
    // 分类占比
    cats: [],
    // 排行
    topDaily: [],
    topMonthly: [],
    avgPerDay: '0',
    activeMonthDays: 0,
    activeMonthSpend: '0'
  },

  onShow() {
    this.refresh()
  },

  fmtDate(d) {
    const p = (n) => (n < 10 ? '0' + n : '' + n)
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
  },

  refresh() {
    const all = store.getAll()
    if (!all.length) {
      this.setData({ bars: [], months: [], cats: [], pfs: [], topDaily: [], topMonthly: [], avgPerDay: '0', activeMonthDays: 0, activeMonthSpend: '0' })
      return
    }

    // ---- 近 30 天每日支出 ----
    const spendMap = store.spendByDate()
    const bars = []
    const today = new Date()
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const key = this.fmtDate(d)
      const v = spendMap[key] || 0
      bars.push({ day: d.getDate(), date: key, v, h: 0 })
    }
    const maxBar = Math.max(...bars.map((b) => b.v), 1)
    bars.forEach((b) => { b.h = Math.round((b.v / maxBar) * 100) })
    const spent = bars.reduce((s, b) => s + b.v, 0)
    const activeMonthDays = bars.filter((b) => b.v > 0).length

    // ---- 近 6 个月 ----
    const months = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const prefix = d.getFullYear() + '-' + (d.getMonth() + 1 < 10 ? '0' : '') + (d.getMonth() + 1)
      const sum = all
        .filter((it) => it.buyDate.startsWith(prefix))
        .reduce((s, it) => s + it.price, 0)
      months.push({ label: (d.getMonth() + 1) + '月', sum: store.fmtMoney(sum), h: 0 })
    }
    const maxMonth = Math.max(...months.map((m) => parseFloat(m.sum)), 1)
    months.forEach((m) => { m.h = Math.round((parseFloat(m.sum) / maxMonth) * 100) })
    const curMonth = months[months.length - 1]

    // ---- 分类占比 ----
    const catSum = {}
    all.forEach((it) => { catSum[it.category] = (catSum[it.category] || 0) + it.price })
    const total = all.reduce((s, it) => s + it.price, 0)
    const cats = Object.keys(catSum)
      .map((k) => ({ key: k, name: store.getCategoryName(k), v: catSum[k], pct: ((catSum[k] / total) * 100).toFixed(1) }))
      .sort((a, b) => b.v - a.v)
    const maxCat = cats[0] ? cats[0].v : 1
    cats.forEach((c) => { c.w = Math.round((c.v / maxCat) * 100) })

    // ---- 平台占比 ----
    const pfSum = {}
    all.forEach((it) => { pfSum[it.platform || 'other'] = (pfSum[it.platform || 'other'] || 0) + it.price })
    const pfs = Object.keys(pfSum)
      .map((k) => ({ key: k, name: store.getPlatformName(k), v: pfSum[k], pct: ((pfSum[k] / total) * 100).toFixed(1) }))
      .sort((a, b) => b.v - a.v)
    const maxPf = pfs[0] ? pfs[0].v : 1
    pfs.forEach((c) => { c.w = Math.round((c.v / maxPf) * 100) })

    // ---- 排行：日均最贵（持有中的物品）----
    const ranked = all
      .filter((it) => !it.retired)
      .map((it) => ({
        id: it.id,
        name: it.name,
        daily: store.fmtMoney(store.dailyCost(it)),
        monthly: store.fmtMoney(store.monthlyCost(it)),
        price: store.fmtMoney(it.price),
        days: store.daysHeld(it),
        category: it.category
      }))
    const topDaily = ranked.slice().sort((a, b) => b.daily - a.daily).slice(0, 3)
    const topMonthly = ranked.slice().sort((a, b) => b.daily - a.daily).slice(0, 3)

    this.setData({
      bars,
      maxBar: store.fmtMoney(maxBar),
      months,
      cats,
      pfs,
      topDaily,
      topMonthly,
      avgPerDay: store.fmtMoney(spent / 30),
      activeMonthDays,
      activeMonthSpend: curMonth ? curMonth.sum : '0'
    })
  },

  goDetail(e) {
    wx.navigateTo({ url: '/pages/detail/detail?id=' + e.currentTarget.dataset.id })
  }
})
