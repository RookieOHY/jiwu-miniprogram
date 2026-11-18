/**
 * 两级分类体系：大分类 → 子分类
 * 数据结构：[{ name, icon, subs: ['手机通讯', ...] }, ...]
 * 存储键 userCats；未设置过时返回默认分类
 */

const DEFAULT_GROUPS = [
  { name: '电子数码', icon: '/assets/3d/laptop.png', subs: ['手机通讯', '电脑办公', '摄影摄像', '数码配件', '智能设备'] },
  { name: '衣物鞋包', icon: '/assets/3d/shirt.png', subs: ['男装女装', '鞋靴箱包', '配饰腕表'] },
  { name: '个护美妆', icon: '/assets/3d/soap.png', subs: ['面部护肤', '魅力彩妆', '洗护身体'] },
  { name: '文具书籍', icon: '/assets/3d/books.png', subs: ['学习文具', '图书杂志', '办公用品'] },
  { name: '运动户外', icon: '/assets/3d/basketball.png', subs: ['运动鞋服', '户外装备', '健身器材'] },
  { name: '工具维修', icon: '/assets/3d/scissors.png', subs: ['家用工具', '五金耗材'] },
  { name: '食品杂货', icon: '/assets/3d/apple.png', subs: ['零食饮料', '生鲜果蔬'] },
  { name: '厨房用品', icon: '/assets/3d/egg.png', subs: ['锅具餐具', '小家电'] },
  { name: '家居家具', icon: '/assets/3d/couch.png', subs: ['家具家电', '家纺布艺'] },
  { name: '宠物用品', icon: '/assets/3d/teddy.png', subs: ['宠物粮食', '宠物玩具'] }
]

const KEY = 'userCats'

function getGroups() {
  const v = wx.getStorageSync(KEY)
  if (v && Array.isArray(v) && v.length) return v
  return JSON.parse(JSON.stringify(DEFAULT_GROUPS))
}

function setGroups(g) {
  wx.setStorageSync(KEY, g)
}

function addSub(groupName, sub) {
  const g = getGroups()
  const group = g.find((it) => it.name === groupName)
  if (!group || !sub || !sub.trim()) return false
  if (group.subs.indexOf(sub.trim()) >= 0) return false
  group.subs.push(sub.trim())
  setGroups(g)
  return true
}

function removeSub(groupName, sub) {
  const g = getGroups()
  const group = g.find((it) => it.name === groupName)
  if (!group) return false
  group.subs = group.subs.filter((s) => s !== sub)
  setGroups(g)
  return true
}

/** 导出 JSON 文本 */
function exportJSON() {
  return JSON.stringify({ app: '记物分类', exportedAt: new Date().toISOString(), groups: getGroups() }, null, 2)
}

/** 从 JSON 文本导入，成功返回导入的大分类数 */
function importJSON(text) {
  try {
    const obj = JSON.parse(text)
    const g = obj.groups || obj
    if (!Array.isArray(g) || !g.length) return 0
    const valid = g.filter((it) => it && it.name && Array.isArray(it.subs))
    if (!valid.length) return 0
    setGroups(valid)
    return valid.length
  } catch (e) {
    return 0
  }
}

/** 恢复默认分类 */
function resetDefaults() {
  setGroups(JSON.parse(JSON.stringify(DEFAULT_GROUPS)))
}

module.exports = {
  DEFAULT_GROUPS,
  getGroups,
  setGroups,
  addSub,
  removeSub,
  exportJSON,
  importJSON,
  resetDefaults
}
