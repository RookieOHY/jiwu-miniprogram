/**
 * 分类预算：按月统计「真实支出」并与上限对比
 * 支出口径 = 本月买入的物品（按购买日期，折人民币）+ 本月发生的附加支出 − 附加收入
 * 上限存 { __total: 数字, 大分类名: 数字 }，0 / 缺省表示不设
 */

const store = require('./store')

const KEY = 'budgets'
const TOTAL = '__total'

function get() {
  const b = wx.getStorageSync(KEY)
  if (!b || typeof b !== 'object') return { total: 0, groups: {} }
  return { total: Number(b.total) || 0, groups: b.groups && typeof b.groups === 'object' ? b.groups : {} }
}

function save(b) {
  wx.setStorageSync(KEY, b)
  return b
}

/** 设置上限：scope = '__total' 或大分类名；v <= 0 视为取消 */
function setCap(scope, v) {
  const b = get()
  const n = parseFloat(v)
  const val = n > 0 ? Math.round(n * 100) / 100 : 0
  if (scope === TOTAL) b.total = val
  else b.groups[scope] = val
  return save(b)
}

function capOf(scope) {
  const b = get()
  return scope === TOTAL ? b.total : b.groups[scope] || 0
}

function monthKey(date) {
  const d = date || new Date()
  const m = d.getMonth() + 1
  return d.getFullYear() + '-' + (m < 10 ? '0' + m : m)
}

function groupName(it) {
  return it.categoryGroup || store.getCategoryName(it.category) || '其他'
}

/** 本月支出：按大分类聚合（含附加收支），单位人民币 */
function spendOfMonth(ym) {
  const key = ym || monthKey()
  const byGroup = {}
  let total = 0
  const add = (name, v) => {
    byGroup[name] = (byGroup[name] || 0) + v
    total += v
  }
  store.getAll().forEach((it) => {
    const buy = String(it.buyDate || '').slice(0, 7) === key
    if (buy) add(groupName(it), store.toCNY(it.price, it.currency))
    ;(it.extras || []).forEach((x) => {
      if (String(x.date || '').slice(0, 7) !== key) return
      const v = store.toCNY(x.amount, it.currency)
      add(groupName(it), x.type === '收入' ? -v : v)
    })
  })
  return { key, total, byGroup }
}

/**
 * 预算视图：总预算 + 各分类（有支出或有上限的都列出），按已用金额降序
 */
function rows(ym) {
  const sp = spendOfMonth(ym)
  const b = get()
  const out = []
  const mk = (scope, name, spent) => {
    const cap = capOf(scope)
    const left = cap > 0 ? cap - spent : 0
    return {
      scope,
      name,
      month: sp.key,
      spent: store.fmtMoney(Math.max(0, spent)),
      spentRaw: spent,
      cap: cap > 0 ? store.fmtMoney(cap) : '',
      pct: cap > 0 ? Math.min(100, Math.round((spent / cap) * 100)) : 0,
      over: cap > 0 && spent > cap,
      left: cap > 0 ? store.fmtMoney(Math.abs(left)) : '',
      overBy: cap > 0 && spent > cap ? store.fmtMoney(spent - cap) : ''
    }
  }
  out.push(mk(TOTAL, '全部支出', sp.total))
  const names = {}
  Object.keys(sp.byGroup).forEach((n) => { names[n] = true })
  Object.keys(b.groups).forEach((n) => { if (b.groups[n] > 0) names[n] = true })
  Object.keys(names)
    .map((n) => mk(n, n, sp.byGroup[n] || 0))
    .sort((a, b2) => b2.spentRaw - a.spentRaw)
    .forEach((r) => out.push(r))
  return out
}

/** 超支行（用于提醒） */
function overRows(ym) {
  return rows(ym).filter((r) => r.over)
}

function hasAnyCap() {
  const b = get()
  return b.total > 0 || Object.keys(b.groups).some((k) => b.groups[k] > 0)
}

module.exports = { KEY, TOTAL, get, setCap, capOf, monthKey, spendOfMonth, rows, overRows, hasAnyCap, groupName }
