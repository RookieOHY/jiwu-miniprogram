const store = require('../../utils/store')
const budget = require('../../utils/budget')
const cats = require('../../utils/cats')
const lock = require('../../utils/lock')

function today() {
  const d = new Date()
  const p = (n) => (n < 10 ? '0' + n : '' + n)
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}

Page({
  data: {
    amountHidden: false,
    months: [],
    catStats: [],
    statusStats: [],
    topDaily: [],
    totalCount: 0,
    totalSpend: '0',
    period: 'month', // month | year
    // 预算
    budgetRows: [],
    budgetMonth: '',
    editScope: '',
    editValue: ''
  },

  onShow() {

    if (lock.guard()) return
    // 同步胶囊 TabBar 选中态（统计 = 第 3 个 tab）
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2, hideText: store.getTabbarHideText() })
    this.setData({ amountHidden: !!wx.getStorageSync('amountHidden') })
    }
    this.refresh()
  },

  setPeriod(e) {
    this.setData({ period: e.currentTarget.dataset.p }, () => this.refresh())
  },

  refresh() {
    const all = store.getAll()
    const isYear = this.data.period === 'year'
    const n = isYear ? 12 : 6
    const now = new Date()

    // 月度/年度趋势：买入金额 + 现存日均
    const months = []
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - (isYear ? i * 12 : i), 1)
      const y = d.getFullYear()
      const m = d.getMonth() + 1
      const key = isYear ? String(y) : y + '-' + (m < 10 ? '0' + m : m)
      const label = isYear ? y + '年' : m + '月'
      const spend = all
        .filter((it) => (isYear ? it.buyDate.slice(0, 4) === key : it.buyDate.slice(0, 7) === key))
        .reduce((s, it) => s + store.toCNY(it.price, it.currency), 0)
      months.push({ key, label, spend: Math.round(spend), h: 0 })
    }
    const maxSpend = Math.max(...months.map((x) => x.spend), 1)
    months.forEach((x) => { x.h = Math.max(3, Math.round((x.spend / maxSpend) * 100)) })

    // 分类分布（按大分类）
    const allGroups = cats.getGroups()
    const catMap = {}
    all.forEach((it) => {
      const name = it.categoryGroup || store.getCategoryName(it.category)
      const c = store.toCNY(it.price, it.currency)
      catMap[name] = (catMap[name] || 0) + c
    })
    const total = all.reduce((s, it) => s + store.toCNY(it.price, it.currency), 0)
    const catStats = Object.keys(catMap)
      .map((name) => {
        const g = allGroups.find((x) => x.name === name)
        return { name, icon: g ? g.icon : '/assets/3d/package.png', value: Math.round(catMap[name]), pct: total ? Math.round((catMap[name] / total) * 100) : 0 }
      })
      .sort((a, b) => b.value - a.value)

    // 状态分布
    const held = all.filter((it) => !it.retired).length
    const retired = all.filter((it) => it.retired && !it.sold).length
    const sold = all.filter((it) => it.sold).length
    const statusStats = [
      { name: '持有中', count: held },
      { name: '已退役', count: retired },
      { name: '已卖出', count: sold }
    ]

    // 日均 Top5
    const topDaily = all
      .filter((it) => !it.retired)
      .map((it) => ({
        id: it.id,
        name: it.name,
        daily: store.fmtMoney(store.dailyCost(it)),
        dailyNum: store.toCNY(store.dailyCost(it), it.currency),
        symbol: store.currencySymbol(it.currency)
      }))
      .sort((a, b) => b.dailyNum - a.dailyNum)
      .slice(0, 5)

    const rows = budget.rows()
    this.setData({
      months,
      budgetRows: rows,
      budgetMonth: rows.length ? rows[0].month : budget.monthKey(),
      catStats,
      statusStats,
      topDaily,
      totalCount: all.length,
      totalSpend: store.fmtMoney(total)
    })
  },

  goReport() {
    wx.navigateTo({ url: '/pages/report/report' })
  },

  /* ---------- 预算：行内改上限 ---------- */

  startCap(e) {
    const scope = e.currentTarget.dataset.s
    if (!scope) return
    if (scope === this.data.editScope) return
    const cur = budget.capOf(scope)
    this._closed = '' // 本次编辑允许提交一次
    this.setData({ editScope: scope, editValue: cur > 0 ? String(cur) : '' })
  },

  onCapInput(e) {
    this.setData({ editValue: e.detail.value })
  },

  /** 同 detail 的行内编辑：值取事件本身，按 scope 去重，避免 blur/confirm 互踩或切换行时丢输入 */
  commitCap(e) {
    const scope = e.currentTarget.dataset.s
    if (!scope || this._closed === scope) return
    const fromEvent = e.detail && e.detail.value !== undefined ? e.detail.value : null
    const raw = String(fromEvent === null ? this.data.editValue : fromEvent).trim()
    if (raw !== '' && !(parseFloat(raw) > 0)) {
      wx.showToast({ title: '填个大于 0 的数字', icon: 'none' })
      this.setData({ editScope: '', editValue: '' })
      return
    }
    this._closed = scope
    budget.setCap(scope, raw)
    this.setData({ editScope: '', editValue: '' })
    this.refresh()
    wx.showToast({ title: raw === '' ? '已取消该上限' : '上限已设', icon: 'none' })
  },

  noop() {}

})
