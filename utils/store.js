/**
 * 数据存储与核心计算逻辑
 * 物品数据结构：
 * {
 *   id, name, price, buyDate(YYYY-MM-DD), category, note,
 *   createdAt, retired: false, retiredDate: null
 * }
 */

const STORAGE_KEY = 'items'
const WISH_KEY = 'wishes' // 种草清单
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
  { key: 'amazon', name: '亚马逊' },
  { key: 'ebay',   name: 'eBay' },
  { key: 'iherb',  name: 'iHerb' },
  { key: 'shein',  name: 'SHEIN' },
  { key: 'temu',   name: 'Temu' },
  { key: 'ali',    name: '速卖通' },
  { key: 'off',  name: '线下' },
  { key: 'other', name: '其他' }
]

// 常用渠道（表单平铺展示，其余收进「更多」）
const COMMON_PLATFORMS = ['jd', 'tb', 'pdd', 'xy', 'wx', 'amazon', 'other']

function getPlatformName(key) {
  const p = PLATFORMS.find((p) => p.key === key)
  return p ? p.name : '其他'
}

/** 渠道首字徽章：品牌色圆底 + 名字首字（规避商标，又有 App 图标感） */
function getPlatformChar(key) {
  const p = PLATFORMS.find((p) => p.key === key)
  return p ? p.name.charAt(0) : '其'
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
    icon: data.icon || null,
    note: data.note || '',
    targetDaily: Number(data.targetDaily) || 0,
    celebrated: false,
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

/**
 * 回本进度：目标日均（item 自身币种）
 * 目标日均 ¥t，共需 ceil(price / t) 天回本，回本日 = 购买日 + need - 1 天
 * 未设目标（targetDaily <= 0）返回 null
 */
function breakEven(item, now = new Date()) {
  const target = Number(item.targetDaily) || 0
  if (!(target > 0)) return null
  const need = Math.max(1, Math.ceil(item.price / target))
  const start = new Date(item.buyDate + 'T00:00:00')
  const due = new Date(start)
  due.setDate(due.getDate() + need - 1)
  const p = (n) => (n < 10 ? '0' + n : '' + n)
  const held = daysHeld(item, now)
  return {
    target,
    need,
    due: due.getFullYear() + '-' + p(due.getMonth() + 1) + '-' + p(due.getDate()),
    held,
    pct: Math.min(100, Math.round((held / need) * 100)),
    reached: held >= need
  }
}

/** 金额格式化：统一两位小数 */
function fmtMoney(n) {
  if (!isFinite(n)) return '0.00'
  return Number(n).toFixed(2)
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

// ---------- 种草清单 ----------

function getWishes() {
  return (wx.getStorageSync(WISH_KEY) || []).map((w) =>
    Object.assign({ sessions: [], maxReached: 0, status: '' }, w)
  )
}

function saveWishes(wishes) {
  wx.setStorageSync(WISH_KEY, wishes)
}

/** 新增一株草：name 必填，url / price / reason(为啥想买) / alternative(替代品) 可选 */
function addWish(data) {
  const wishes = getWishes()
  const wish = {
    id: 'ws_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    name: data.name,
    url: data.url || '',
    price: Number(data.price) || 0,
    reason: data.reason || '',
    alternative: data.alternative || '',
    createdAt: Date.now()
  }
  wishes.unshift(wish)
  saveWishes(wishes)
  return wish
}

function updateWish(id, patch) {
  const wishes = getWishes()
  const idx = wishes.findIndex((w) => w.id === id)
  if (idx < 0) return null
  wishes[idx] = Object.assign({}, wishes[idx], patch)
  saveWishes(wishes)
  return wishes[idx]
}

function removeWish(id) {
  saveWishes(getWishes().filter((w) => w.id !== id))
}

// ---------- 剁手计数器 ----------

/** 记录一次剁手计数：{ target, reached, done, seconds } */
/** 数完 → 草恢复正常；数到一半放弃 → 草标记「冷静中」，放弃点写入 maxReached */
function addDuoshouSession(wishId, session) {
  const wishes = getWishes()
  const idx = wishes.findIndex((w) => w.id === wishId)
  if (idx < 0) return null
  const w = wishes[idx]
  w.sessions = (w.sessions || []).concat([
    {
      ts: Date.now(),
      target: session.target,
      reached: session.reached,
      done: !!session.done,
      seconds: session.seconds || 0
    }
  ])
  w.maxReached = Math.max(w.maxReached || 0, session.reached || 0)
  w.status = session.done ? '' : 'cooled'
  wishes[idx] = w
  saveWishes(wishes)
  return w
}

/** 拔草：种草转入物品清单，继承价格与理由，购买日为今天，返回新物品 */
function pullWish(id) {
  const w = getWishes().find((w) => w.id === id)
  if (!w) return null
  const d = new Date()
  const p = (n) => (n < 10 ? '0' + n : '' + n)
  const item = addItem({
    name: w.name,
    price: w.price,
    buyDate: d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()),
    category: 'other',
    platform: 'other',
    note: w.reason || ''
  })
  removeWish(id)
  return item
}

/** TabBar 文本显示配置：未设置过时默认隐藏文本 */
function getTabbarHideText() {
  const v = wx.getStorageSync('tabbarHideText')
  return v === '' || v === undefined || v === null ? true : !!v
}

module.exports = {
  CATEGORIES,
  PLATFORMS,
  COMMON_PLATFORMS,
  CURRENCIES,
  USD_TO_CNY,
  PIN_LIMIT,
  getCategoryName,
  getPlatformName,
  getPlatformChar,
  currencySymbol,
  toCNY,
  getAll,
  getById,
  addItem,
  updateItem,
  removeItem,
  pinnedCount,
  getWishes,
  addWish,
  updateWish,
  removeWish,
  addDuoshouSession,
  pullWish,
  daysHeld,
  dailyCost,
  monthlyCost,
  breakEven,
  fmtMoney,
  spendByDate
}
