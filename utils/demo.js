/**
 * 示例数据：首次启动载入一次；设置页可随时手动补载
 * 所有示例记录使用固定 ID（demo_*），载入时按 ID 去重，不会重复添加
 */

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  const p = (x) => (x < 10 ? '0' + x : '' + x)
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}

function tsAgo(n) {
  return Date.now() - n * 86400000
}

const ITEM_BASE = {
  category: 'other',
  platform: 'other',
  currency: 'CNY',
  icon: null,
  note: '',
  pinned: false,
  retired: false,
  retiredDate: null,
  sold: false,
  soldPrice: null,
  soldDate: null,
  createdAt: 0
}

const DEMO_ITEMS = [
  // ---- 长期持有的（拉低整体日均）----
  // iPhone 目标日均 30：8999 ÷ 30 = 300 天，恰好第 300 天回本 → 打开 app 即触发庆祝
  { id: 'demo_iphone', name: 'iPhone 15 Pro', price: 8999, buyDate: daysAgo(300), category: 'electronic', platform: 'jd', note: '主力机', targetDaily: 30 },
  { id: 'demo_treadmill', name: '跑步机', price: 2000, buyDate: daysAgo(200), category: 'sport', platform: 'pdd', note: '吃灰预警' },
  { id: 'demo_chair', name: '人体工学椅', price: 1500, buyDate: daysAgo(120), category: 'home', platform: 'tb', note: '腰舒服多了' },
  { id: 'demo_airpods', name: 'AirPods Pro 2', price: 1899, buyDate: daysAgo(90), category: 'electronic', platform: 'wx' },

  // ---- 近 30 天的（撑起日柱状图 / 月趋势）----
  { id: 'demo_ipadmini', name: 'iPad mini 7', price: 3999, buyDate: daysAgo(25), category: 'electronic', platform: 'tb', note: '通勤看漫画' },
  { id: 'demo_downjacket', name: '羽绒服', price: 599, buyDate: daysAgo(12), category: 'clothing', platform: 'tb' },
  { id: 'demo_sam', name: '山姆会员卡', price: 260, buyDate: daysAgo(6), category: 'other', platform: 'off', note: '一年期' },
  { id: 'demo_coffeebean', name: '咖啡豆 1kg', price: 98, buyDate: daysAgo(3), category: 'food', platform: 'off' },

  // ---- 多币种（美元，折算进统计）----
  { id: 'demo_fishoil', name: 'iHerb 鱼油', price: 32, currency: 'USD', buyDate: daysAgo(8), category: 'food', platform: 'iherb', note: '$32 × 7.2' },

  // ---- 置顶示例 ----
  { id: 'demo_figure', name: '限量版手办', price: 680, buyDate: daysAgo(45), category: 'other', platform: 'xy', note: '闲鱼捡漏', pinned: true },

  // ---- 已卖出：400 天前 1800 买入，30 天前 1100 卖出 ----
  { id: 'demo_switch', name: 'Switch 游戏机', price: 1800, buyDate: daysAgo(400), platform: 'jd', retired: true, retiredDate: daysAgo(30), sold: true, soldPrice: 1100, soldDate: daysAgo(30), note: '回血 1100' },

  // ---- 已退役：坏了，没卖出 ----
  { id: 'demo_keyboard', name: '机械键盘', price: 429, buyDate: daysAgo(500), category: 'electronic', platform: 'tb', note: '进水阵亡', retired: true, retiredDate: daysAgo(60) }
].map((it) => Object.assign({}, ITEM_BASE, it, { createdAt: tsAgo(0) }))

const WISH_BASE = {
  url: '',
  price: 0,
  reason: '',
  alternative: '',
  createdAt: 0,
  sessions: [],
  maxReached: 0,
  status: ''
}

const DEMO_WISHES = [
  // 冷静中：数过 2 次，最远数到 1897 就停下
  {
    id: 'demo_wish_switch2',
    name: 'Switch OLED',
    price: 2599,
    reason: '旧 Switch 刚卖了，想升级',
    createdAt: tsAgo(9),
    sessions: [
      { ts: tsAgo(3), target: 2599, reached: 1240, done: false, seconds: 1240 },
      { ts: tsAgo(1), target: 2599, reached: 31, done: false, seconds: 40 }
    ],
    maxReached: 1240,
    status: 'cooled'
  },
  {
    id: 'demo_wish_grinder',
    name: '手冲咖啡磨豆机',
    price: 850,
    reason: '咖啡豆都买了，就差磨的了',
    alternative: '先用磨粉店代磨',
    createdAt: tsAgo(5)
  },
  {
    id: 'demo_wish_ringfit',
    name: '健身环大冒险',
    price: 299,
    url: 'https://item.jd.com/100012043978.html',
    reason: '跑步机吃灰，换个玩法试试',
    createdAt: tsAgo(2)
  },
  {
    id: 'demo_wish_coat',
    name: '充绒量更高的羽绒服',
    price: 1200,
    reason: '通勤冻手',
    alternative: '家里已有 599 那件，先穿穿看',
    createdAt: tsAgo(14)
  }
].map((w) => Object.assign({}, WISH_BASE, w))

/** 按固定 ID 去重补载：已存在的示例记录跳过 */
function seed() {
  const items = wx.getStorageSync('items') || []
  const knownItems = new Set(items.map((i) => i.id))
  const addItems = DEMO_ITEMS.filter((i) => !knownItems.has(i.id))
  if (addItems.length) wx.setStorageSync('items', addItems.concat(items))

  const wishes = wx.getStorageSync('wishes') || []
  const knownWishes = new Set(wishes.map((w) => w.id))
  const addWishes = DEMO_WISHES.filter((w) => !knownWishes.has(w.id))
  if (addWishes.length) wx.setStorageSync('wishes', addWishes.concat(wishes))

  return { items: addItems.length, wishes: addWishes.length }
}

/** 首次启动载入示例（只载一次） */
function loadDemo() {
  if (wx.getStorageSync('demoLoaded')) return
  seed()
  wx.setStorageSync('demoLoaded', true)
}

module.exports = { loadDemo, seed }
