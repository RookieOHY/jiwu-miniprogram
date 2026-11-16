/**
 * 示例数据：首次启动时载入一次，方便体验各种状态
 * 之后可通过把 STORAGE_KEY demoLoaded 清掉来重置
 */

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  const p = (x) => (x < 10 ? '0' + x : '' + x)
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}

const DEMO_ITEMS = [
  {
    name: 'iPhone 15 Pro', price: 8999, buyDate: daysAgo(300), category: 'electronic', platform: 'jd',
    note: '主力机'
  },
  {
    name: '跑步机', price: 2000, buyDate: daysAgo(200), category: 'sport', platform: 'pdd',
    note: '吃灰预警'
  },
  {
    name: '人体工学椅', price: 1500, buyDate: daysAgo(120), category: 'home', platform: 'tb',
    note: '腰舒服多了'
  },
  {
    name: 'AirPods Pro 2', price: 1899, buyDate: daysAgo(90), category: 'electronic', platform: 'wx',
    note: ''
  },
  {
    name: '限量版手办', price: 680, buyDate: daysAgo(45), category: 'other', platform: 'xy',
    note: '闲鱼捡漏', pinned: true
  },
  {
    name: '咖啡豆 1kg', price: 98, buyDate: daysAgo(3), category: 'food', platform: 'off',
    note: ''
  },
  {
    // 已卖出示例：400 天前 1800 买入，30 天前 1100 卖出
    name: 'Switch 游戏机', price: 1800, buyDate: daysAgo(400), category: 'other', platform: 'jd',
    note: '', retired: true, retiredDate: daysAgo(30),
    sold: true, soldPrice: 1100, soldDate: daysAgo(30)
  },
  {
    // 已退役示例：坏了，没卖出
    name: '机械键盘', price: 429, buyDate: daysAgo(500), category: 'electronic', platform: 'tb',
    note: '进水阵亡', retired: true, retiredDate: daysAgo(60)
  }
].map((it, i) => Object.assign({
  id: 'demo_' + Date.now() + '_' + i,
  category: 'other',
  platform: 'other',
  note: '',
  pinned: false,
  retired: false,
  retiredDate: null,
  sold: false,
  soldPrice: null,
  soldDate: null,
  createdAt: Date.now() - i * 1000
}, it))

/** 首次启动载入示例（只载一次，与已有数据合并） */
function loadDemo() {
  if (wx.getStorageSync('demoLoaded')) return
  const existing = wx.getStorageSync('items') || []
  wx.setStorageSync('items', DEMO_ITEMS.concat(existing))
  wx.setStorageSync('demoLoaded', true)
}

module.exports = { loadDemo }
