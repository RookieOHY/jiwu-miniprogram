/**
 * 演示数据：覆盖各种状态，用于验证提醒 / 吃灰 / 回本 / 外币 / 附加收支
 * id 统一 preview_ 前缀，可在设置页一键清除
 */

const day = (n) => {
  const d = new Date()
  d.setDate(d.getDate() + n) // 负=过去，正=未来
  const p = (x) => (x < 10 ? '0' + x : '' + x)
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}

const ROWS = [
  // —— 临期保修（提醒）——
  { name: '索尼电视 65寸', price: 4999, buyDate: day(-350), category: '电脑办公', categoryGroup: '电子数码', platform: 'jd', warrantyEnabled: true, warrantyDate: day(12), valuation: 2200, expectedRetireDate: day(300), icon: { type: 'emoji', value: '📺' }, tags: ['客厅'] },
  { name: '戴森吹风机', price: 2990, buyDate: day(-700), category: '洗护身体', categoryGroup: '个护美妆', platform: 'tb', warrantyEnabled: true, warrantyDate: day(-8), valuation: 900, icon: { type: 'emoji', value: '💨' } },
  // —— 吃灰（长期没用）——
  { name: '跑步机', price: 2600, buyDate: day(-400), category: '健身器材', categoryGroup: '运动户外', platform: 'pdd', uses: 6, lastUseDate: day(-138), useCountEnabled: true, icon: { type: 'emoji', value: '🏃' }, tags: ['吃灰'], note: '买了就当衣架用' },
  { name: 'Kindle Paperwhite', price: 1099, buyDate: day(-500), category: '图书杂志', categoryGroup: '文具书籍', platform: 'jd', uses: 3, lastUseDate: day(-210), useCountEnabled: true, icon: { type: 'emoji', value: '📖' }, tags: ['吃灰'] },
  // —— 已回本（庆祝）——
  { name: 'iPhone 15 Pro', price: 8999, buyDate: day(-300), category: '手机通讯', categoryGroup: '电子数码', platform: 'jd', targetDaily: 30, uses: 280, lastUseDate: day(-1), useCountEnabled: true, icon: { type: 'emoji', value: '📱' }, tags: ['主力机'], pinned: true },
  // —— 订阅续费（临期）——
  { name: '视频会员年卡', price: 248, buyDate: day(-340), category: '影音会员', categoryGroup: '音乐影音', platform: 'off', recycle: true, expectedRetireDate: day(25), icon: { type: 'emoji', value: '🎬' }, uses: 90, lastUseDate: day(-2), useCountEnabled: true },
  // —— 外币 + 数量 + 附加收支 ——
  { name: 'iHerb 鱼油 x3', price: 96, currency: 'USD', qty: 3, buyDate: day(-60), category: '保健营养', categoryGroup: '医疗健康', platform: 'iherb', icon: { type: 'emoji', value: '💊' }, extras: [ { type: '支出', name: '国际运费', amount: 120, date: day(-58) }, { type: '收入', name: '优惠券返现', amount: 30, date: day(-50) } ] },
  // —— 已卖出（复盘）——
  { name: 'Switch 游戏机', price: 2099, buyDate: day(-420), category: '智能设备', categoryGroup: '电子数码', platform: 'xy', retired: true, retiredDate: day(-30), sold: true, soldPrice: 1250, soldDate: day(-30), uses: 45, icon: { type: 'emoji', value: '🎮' } },
  // —— 消耗品（该补货）——
  { name: '猫粮 5kg', price: 268, buyDate: day(-72), category: '宠物粮食', categoryGroup: '宠物用品', platform: 'tb',
    consumable: true, useUpDays: 60, lastRestockDate: day(-72), brand: '皇家', icon: { type: 'emoji', value: '🐱' }, location: '储物间' },
  // —— 周期性保养 ——
  { name: '净水器滤芯', price: 199, buyDate: day(-200), category: '小家电', categoryGroup: '厨房用品', platform: 'jd',
    maintenanceEvery: 180, lastMaintenanceDate: day(-170), brand: '小米', icon: { type: 'emoji', value: '💧' } },
  // —— 普通持有 ——
  { name: '人体工学椅', price: 1699, buyDate: day(-150), category: '家具家电', categoryGroup: '家居家具', platform: 'tb', icon: { type: 'emoji', value: '🪑' }, uses: 140, lastUseDate: day(0), useCountEnabled: true, targetDaily: 2 },
  { name: '空气炸锅', price: 399, buyDate: day(-80), category: '小家电', categoryGroup: '厨房用品', platform: 'jd', icon: { type: 'emoji', value: '🍟' }, location: '厨房吊柜' },
  { name: '始祖鸟羽绒服', price: 5200, buyDate: day(-25), category: '男装女装', categoryGroup: '衣物鞋包', platform: 'tb', icon: { type: 'emoji', value: '🧥' }, tags: ['通勤'] },
  { name: '咖啡豆 1kg', price: 118, buyDate: day(-5), category: '生鲜果蔬', categoryGroup: '食品杂货', platform: 'off', icon: { type: 'emoji', value: '☕' }, expectedRetireDate: day(40) }
]

const BASE = {
  currency: 'CNY', platform: 'other', qty: 1, note: '', tags: [], pinned: false,
  retired: false, retiredDate: null, sold: false, soldPrice: null, soldDate: null,
  targetDaily: 0, celebrated: false, uses: 0, pricingDaily: true, inService: true,
  warrantyEnabled: false, warrantyDate: '', expectedRetireDate: '', extras: [], photos: [],
  brand: '', color: '', season: '', consumable: false, useUpDays: 0,
  lastRestockDate: '', maintenanceEvery: 0, lastMaintenanceDate: ''
}

/** 载入演示数据（按名字去重，重复点击不叠加），返回新增数 */
function seed() {
  const list = Array.isArray(wx.getStorageSync('items')) ? wx.getStorageSync('items') : []
  const names = new Set(list.map((it) => it.name))
  let added = 0
  ROWS.forEach((r, i) => {
    if (names.has(r.name)) return
    list.unshift(Object.assign({}, BASE, r, {
      id: 'preview_' + i + '_' + Date.now(),
      createdAt: Date.now() - i * 86400000
    }))
    added++
  })
  wx.setStorageSync('items', list)
  return added
}

/** 清除演示数据（按前缀） */
function clear() {
  const list = wx.getStorageSync('items')
  if (Array.isArray(list)) {
    wx.setStorageSync('items', list.filter((it) => !/^preview_/.test(it.id)))
  }
}

function count() {
  const list = wx.getStorageSync('items')
  return Array.isArray(list) ? list.filter((it) => /^preview_/.test(it.id)).length : 0
}

module.exports = { seed, clear, count }
