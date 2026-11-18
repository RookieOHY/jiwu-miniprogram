/**
 * 年度报告 / 时光账单
 * 口径：全部按「购买日期 buyDate」归年；金额一律折成人民币，便于跨年/跨币种对比
 */

const store = require('./store')
const prefs = require('./prefs')

function years() {
  const set = {}
  store.getAll().forEach((it) => {
    const y = String(it.buyDate || '').slice(0, 4)
    if (y) set[y] = true
  })
  const list = Object.keys(set).sort((a, b) => b.localeCompare(a))
  if (!list.length) list.push(String(new Date().getFullYear()))
  return list
}

/** 该年买的东西（折人民币后带在对象上，便于排序聚合） */
function itemsOfYear(year) {
  return store
    .getAll()
    .filter((it) => String(it.buyDate || '').slice(0, 4) === String(year))
    .map((it) => ({
      raw: it,
      cny: store.toCNY(it.price, it.currency),
      daily: store.toCNY(store.dailyCost(it), it.currency),
      perUse: store.perUseCost(it),
      days: store.daysHeld(it)
    }))
}

function monthOf(dateStr) {
  const m = String(dateStr || '').slice(5, 7)
  return m ? parseInt(m, 10) : 0
}

/**
 * 生成某年报告
 */
function build(year) {
  const y = String(year || new Date().getFullYear())
  const all = store.getAll()
  const list = itemsOfYear(y)
  const dustDays = prefs.dustDays()
  const today = new Date()

  let spend = 0
  let extraOut = 0
  let extraIn = 0
  let heldDaily = 0
  let retired = 0
  let sold = 0
  let soldBack = 0
  let fxCount = 0
  let subCount = 0
  let idle = 0
  const byGroup = {}
  const byMonth = {}

  list.forEach((x) => {
    const it = x.raw
    spend += x.cny
    byGroup[it.categoryGroup || store.getCategoryName(it.category) || '其他'] = (byGroup[it.categoryGroup || store.getCategoryName(it.category) || '其他'] || 0) + x.cny
    const m = monthOf(it.buyDate)
    if (m) byMonth[m] = (byMonth[m] || 0) + x.cny
    if (it.currency && it.currency !== 'CNY') fxCount++
    if (it.recycle) subCount++
    if (it.retired) retired++
    if (it.sold) {
      sold++
      soldBack += store.toCNY(it.soldPrice || 0, it.currency)
    }
    ;(it.extras || []).forEach((e) => {
      if (String(e.date || '').slice(0, 4) !== y) return
      if (e.type === '收入') extraIn += store.toCNY(e.amount, it.currency)
      else extraOut += store.toCNY(e.amount, it.currency)
    })
    if (!it.retired) {
      heldDaily += x.daily
      const idleDays = it.lastUseDate
        ? Math.round((today - new Date(it.lastUseDate + 'T00:00:00')) / 86400000)
        : x.days
      if (idleDays >= dustDays || (!it.uses && x.days >= 60)) idle++
    }
  })

  // 最值：用过且次数越多、次均越低越值
  const worth = list
    .filter((x) => x.perUse !== null && x.perUse > 0 && (x.raw.uses || 0) >= 3)
    .sort((a, b) => a.perUse - b.perUse)
    .slice(0, 3)
    .map((x) => ({
      id: x.raw.id,
      name: x.raw.name,
      uses: x.raw.uses,
      symbol: store.currencySymbol(x.raw.currency),
      perUse: store.fmtMoney(x.perUse)
    }))

  // 回本榜：目标日均已达成
  const paid = list
    .filter((x) => {
      const be = store.breakEven(x.raw)
      return be && be.reached
    })
    .slice(0, 3)
    .map((x) => ({ id: x.raw.id, name: x.raw.name, target: store.fmtMoney(x.raw.targetDaily) }))

  const biggest = list.slice().sort((a, b) => b.cny - a.cny)[0] || null
  const monthArr = Object.keys(byMonth)
    .map((m) => ({ m: parseInt(m, 10), v: byMonth[m] }))
    .sort((a, b) => b.v - a.v)
  const topGroup = Object.keys(byGroup)
    .map((name) => ({ name, value: byGroup[name], pct: spend ? Math.round((byGroup[name] / spend) * 100) : 0 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
    .map((g) => ({ name: g.name, value: store.fmtMoney(g.value), pct: g.pct }))

  return {
    year: y,
    count: list.length,
    spend: store.fmtMoney(spend),
    spendNum: spend,
    extraOut: store.fmtMoney(extraOut),
    extraIn: store.fmtMoney(extraIn),
    soldCount: sold,
    retiredCount: retired,
    soldBack: store.fmtMoney(soldBack),
    heldDaily: store.fmtMoney(heldDaily),
    avgPerItem: list.length ? store.fmtMoney(spend / list.length) : '0.00',
    fxCount: fxCount,
    subCount: subCount,
    idleCount: idle,
    idlePct: list.length ? Math.round((idle / list.length) * 100) : 0,
    activeMonths: Object.keys(byMonth).length,
    worth,
    paid,
    topGroup,
    busiestMonth: monthArr.length ? { label: monthArr[0].m + ' 月', value: store.fmtMoney(monthArr[0].v) } : null,
    biggest: biggest
      ? {
          id: biggest.raw.id,
          name: biggest.raw.name,
          value: store.fmtMoney(biggest.cny),
          date: biggest.raw.buyDate
        }
      : null
  }
}

module.exports = { years, build }
