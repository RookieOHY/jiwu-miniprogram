/**
 * 临时预览数据：覆盖 15 个大分类的物品（preview_ 前缀，可随时清除）
 * 仅用于查看分类视图效果，看完说“删除预览”即清
 */

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  const p = (x) => (x < 10 ? '0' + x : '' + x)
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}

const PREVIEW_ITEMS = [
  { name: 'iPhone 15 Pro', price: 8999, buyDate: daysAgo(300), category: '手机通讯', categoryGroup: '电子数码', platform: 'jd', targetDaily: 30, tags: ['主力机'], icon: { type: 'emoji', value: '📱' } },
  { name: 'MacBook Air', price: 7999, buyDate: daysAgo(200), category: '电脑办公', categoryGroup: '电子数码', platform: 'jd', icon: { type: 'emoji', value: '💻' } },
  { name: '富士 X100VI', price: 11999, buyDate: daysAgo(90), category: '摄影摄像', categoryGroup: '电子数码', platform: 'jd', tags: ['摄影'], icon: { type: 'emoji', value: '📷' } },
  { name: '羽绒服', price: 599, buyDate: daysAgo(12), category: '男装女装', categoryGroup: '衣物鞋包', platform: 'tb', icon: { type: 'emoji', value: '🧥' } },
  { name: '跑鞋', price: 899, buyDate: daysAgo(60), category: '鞋靴箱包', categoryGroup: '衣物鞋包', platform: 'jd', icon: { type: 'emoji', value: '👟' } },
  { name: 'SK-II 神仙水', price: 1190, buyDate: daysAgo(45), category: '面部护肤', categoryGroup: '个护美妆', platform: 'tb', currency: 'USD', icon: { type: 'emoji', value: '🧴' } },
  { name: '咖啡豆 1kg', price: 98, buyDate: daysAgo(3), category: '零食饮料', categoryGroup: '食品杂货', platform: 'off', icon: { type: 'emoji', value: '☕' } },
  { name: '跑步机', price: 2000, buyDate: daysAgo(200), category: '健身器材', categoryGroup: '运动户外', platform: 'pdd', tags: ['吃灰'], icon: { type: 'emoji', value: '🏃' } },
  { name: '公路车', price: 6800, buyDate: daysAgo(150), category: '骑行代步', categoryGroup: '交通出行', platform: 'off', icon: { type: 'emoji', value: '🚲' } },
  { name: '民谣吉他', price: 3200, buyDate: daysAgo(400), category: '乐器设备', categoryGroup: '音乐影音', platform: 'tb', icon: { type: 'emoji', value: '🎸' } },
  { name: '限量版手办', price: 680, buyDate: daysAgo(45), category: '手办模型', categoryGroup: '收藏爱好', platform: 'xy', pinned: true, icon: { type: 'emoji', value: '🧸' } },
  { name: '维生素 D3', price: 89, buyDate: daysAgo(30), category: '保健营养', categoryGroup: '医疗健康', platform: 'iherb', currency: 'USD', icon: { type: 'emoji', value: '💊' } },
  { name: '生日礼物-围巾', price: 399, buyDate: daysAgo(20), category: '送出礼物', categoryGroup: '礼品社交', platform: 'tb', icon: { type: 'emoji', value: '🎁' } },
  { name: '人体工学椅', price: 1500, buyDate: daysAgo(120), category: '家具家电', categoryGroup: '家居家具', platform: 'tb', icon: { type: 'emoji', value: '🪑' } },
  { name: '空气炸锅', price: 499, buyDate: daysAgo(75), category: '小家电', categoryGroup: '厨房用品', platform: 'jd', icon: { type: 'emoji', value: '🍟' } },
  { name: 'Kindle', price: 998, buyDate: daysAgo(500), category: '图书杂志', categoryGroup: '文具书籍', platform: 'jd', retired: true, retiredDate: daysAgo(60), icon: { type: 'emoji', value: '📖' } },
  { name: '猫爬架', price: 359, buyDate: daysAgo(55), category: '宠物玩具', categoryGroup: '宠物用品', platform: 'pdd', icon: { type: 'emoji', value: '🐱' } },
  { name: '工具箱', price: 269, buyDate: daysAgo(100), category: '家用工具', categoryGroup: '工具维修', platform: 'jd', icon: { type: 'emoji', value: '🧰' } }
]

/** 载入预览（仅一次，按名字去重，不覆盖真实数据） */
function seedPreview() {
  if (wx.getStorageSync('previewSeeded')) return 0
  const existing = wx.getStorageSync('items') || []
  const names = new Set(existing.map((it) => it.name))
  let added = 0
  PREVIEW_ITEMS.forEach((it, i) => {
    if (names.has(it.name)) return
    existing.unshift({
      id: 'preview_' + i + '_' + Date.now(),
      name: it.name,
      price: it.price,
      buyDate: it.buyDate,
      category: it.category,
      categoryGroup: it.categoryGroup,
      platform: it.platform,
      currency: it.currency || 'CNY',
      icon: it.icon || null,
      tags: it.tags || [],
      note: '',
      pinned: !!it.pinned,
      retired: !!it.retired,
      retiredDate: it.retiredDate || null,
      sold: false,
      soldPrice: null,
      soldDate: null,
      targetDaily: it.targetDaily || 0,
      celebrated: false,
      createdAt: Date.now() - i * 1000
    })
    added++
  })
  wx.setStorageSync('items', existing)
  wx.setStorageSync('previewSeeded', true)
  return added
}

/** 清除预览数据（按 preview_ 前缀） */
function clearPreview() {
  const items = wx.getStorageSync('items')
  if (Array.isArray(items)) {
    wx.setStorageSync('items', items.filter((it) => !/^preview_/.test(it.id)))
  }
}

module.exports = { seedPreview, clearPreview }
