/**
 * 数据存储与核心计算逻辑
 * 物品数据结构：
 * {
 *   id, name, price, buyDate(YYYY-MM-DD), category, note,
 *   createdAt, retired: false, retiredDate: null
 * }
 */

const STORAGE_KEY = 'items'
const PIN_LIMIT = 3

// 分类定义
const CATEGORIES = [
  { key: 'food',       name: '饮食' },
  { key: 'electronic', name: '电子' },
  { key: 'clothing',   name: '衣物' },
  { key: 'home',       name: '家居' },
  { key: 'study',      name: '学习' },
  { key: 'sport',      name: '运动' },
  { key: 'other',      name: '其他' }
]

// 币种
const USD_TO_CNY = 7.2 // 汇率，后续可做成可配置
const CURRENCIES = [
  { key: 'CNY', name: '人民币', symbol: '¥' },
  { key: 'USD', name: '美元', symbol: '$' }
]

function currencySymbol(key) {
  const c = CURRENCIES.find((c) => c.key === key)
  return c ? c.symbol : '¥'
}

/** 折算成人民币，用于跨币种汇总 */
function toCNY(price, currency) {
  return currency === 'USD' ? price * USD_TO_CNY : price
}

// 购买渠道
const PLATFORMS = [
  { key: 'jd',   name: '京东' },
  { key: 'tb',   name: '淘宝' },
  { key: 'pdd',  name: '拼多多' },
  { key: 'vip',  name: '唯品会' },
  { key: 'xy',   name: '闲鱼' },
  { key: 'wx',   name: '微信小店' },
  { key: 'dy',   name: '抖音' },
  { key: 'off',  name: '线下' },
  { key: 'other', name: '其他' }
]

function getPlatformName(key) {
  const p = PLATFORMS.find((p) => p.key === key)
  return p ? p.name : '其他'
}

function getCategoryName(key) {
  const c = CATEGORIES.find((c) => c.key === key)
  return c ? c.name : '其他'
}

function getAll() {
  return wx.getStorageSync(STORAGE_KEY) || []
}

function save(items) {
  wx.setStorageSync(STORAGE_KEY, items)
}

function getById(id) {
  return getAll().find((it) => it.id === id) || null
}

function addItem(data) {
  const items = getAll()
  const item = {
    id: 'it_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    name: data.name,
    price: Number(data.price),
    buyDate: data.buyDate,
    category: data.category || 'other',
    platform: data.platform || 'other',
    currency: data.currency === 'USD' ? 'USD' : 'CNY',
    note: data.note || '',
    pinned: false,
    retired: false,
    retiredDate: null,
    createdAt: Date.now()
  }
  items.unshift(item)
  save(items)
  return item
}

function updateItem(id, patch) {
  const items = getAll()
  const idx = items.findIndex((it) => it.id === id)
  if (idx < 0) return null
  items[idx] = Object.assign({}, items[idx], patch)
  save(items)
  return items[idx]
}

function removeItem(id) {
  save(getAll().filter((it) => it.id !== id))
}

/** 计算物品已持有天数（买入当天算 1 天） */
function daysHeld(item, now = new Date()) {
  const end = item.retired && item.retiredDate ? new Date(item.retiredDate + 'T00:00:00') : now
  const start = new Date(item.buyDate + 'T00:00:00')
  const diff = Math.floor((end - start) / 86400000) + 1
  return Math.max(1, diff)
}

/** 日均成本 = 价格 / 持有天数 */
function dailyCost(item) {
  return item.price / daysHeld(item)
}

/** 月均成本（按 30 天折算） */
function monthlyCost(item) {
  return dailyCost(item) * 30
}

/** 金额格式化：保留两位，去掉多余的 0 */
function fmtMoney(n) {
  if (!isFinite(n)) return '0'
  const s = Number(n).toFixed(2)
  return s.replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')
}

/** 某一天的总支出（该日购买物品折算人民币之和） */
function spendByDate() {
  const map = {}
  getAll().forEach((it) => {
    const v = toCNY(it.price, it.currency)
    map[it.buyDate] = (map[it.buyDate] || 0) + v
  })
  return map
}

function pinnedCount() {
  return getAll().filter((it) => it.pinned).length
}

module.exports = {
  CATEGORIES,
  PLATFORMS,
  CURRENCIES,
  USD_TO_CNY,
  PIN_LIMIT,
  getCategoryName,
  getPlatformName,
  currencySymbol,
  toCNY,
  getAll,
  getById,
  addItem,
  updateItem,
  removeItem,
  pinnedCount,
  daysHeld,
  dailyCost,
  monthlyCost,
  fmtMoney,
  spendByDate
}
