/**
 * 用户偏好（原先散落在代码里的常量，统一收到这里，设置页可改）
 * 单个 storage key，避免碎片化
 */

const KEY = 'prefs'

const DEFAULTS = {
  warnDays: 30,      // 到期提前提醒天数
  dustDays: 90,      // 吃灰判定天数
  budgetAlert: true, // 预算超支提醒
  defaultView: 'list',
  rates: {}          // 汇率覆盖：{ USD: 7.1, ... }
}

function get() {
  const p = wx.getStorageSync(KEY)
  if (!p || typeof p !== 'object') return Object.assign({}, DEFAULTS)
  return Object.assign({}, DEFAULTS, p, { rates: Object.assign({}, DEFAULTS.rates, p.rates || {}) })
}

/** 浅合并；rates 由调用方（setRate）传入完整表，避免删除项被旧值合回来 */
function patch(next) {
  const merged = Object.assign({}, get(), next)
  wx.setStorageSync(KEY, merged)
  return merged
}

module.exports = {
  KEY,
  DEFAULTS,
  get,
  patch,
  warnDays: () => {
    const n = parseInt(get().warnDays, 10)
    return n > 0 ? n : DEFAULTS.warnDays
  },
  dustDays: () => {
    const n = parseInt(get().dustDays, 10)
    return n > 0 ? n : DEFAULTS.dustDays
  },
  budgetAlert: () => get().budgetAlert !== false,
  rateOverride: (code) => {
    const r = parseFloat(get().rates[code])
    return r > 0 ? r : null
  },
  setRate: (code, v) => {
    const cur = get()
    const rates = Object.assign({}, cur.rates)
    if (v === '' || v === null || v === undefined || !(parseFloat(v) > 0)) delete rates[code]
    else rates[code] = parseFloat(v)
    return patch({ rates })
  }
}
