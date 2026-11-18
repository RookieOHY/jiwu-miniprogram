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
  { name: '宠物用品', icon: '/assets/3d/teddy.png', subs: ['宠物粮食', '宠物玩具'] },
  { name: '交通出行', icon: '/assets/3d/car.png', subs: ['私家车', '公共交通', '骑行代步', '加油充电'] },
  { name: '音乐影音', icon: '/assets/3d/guitar.png', subs: ['乐器设备', '影音会员', '演出票务'] },
  { name: '收藏爱好', icon: '/assets/3d/crown.png', subs: ['手办模型', '卡牌藏品', '艺术摆件'] },
  { name: '医疗健康', icon: '/assets/3d/pill.png', subs: ['常备药品', '保健营养', '医疗器械'] },
  { name: '礼品社交', icon: '/assets/3d/gift.png', subs: ['送出礼物', '收到礼物', '请客支出'] }
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

/** 子分类默认图标（无匹配时回落到大分类图标） */
const SUB_ICON = {
  '手机通讯': '/assets/3d/phone.png',
  '电脑办公': '/assets/3d/laptop.png',
  '摄影摄像': '/assets/3d/camera.png',
  '数码配件': '/assets/3d/headphone.png',
  '智能设备': '/assets/3d/watch.png',
  '男装女装': '/assets/3d/tshirt.png',
  '鞋靴箱包': '/assets/3d/boot.png',
  '配饰腕表': '/assets/3d/ring.png',
  '面部护肤': '/assets/3d/soap.png',
  '魅力彩妆': '/assets/3d/rose.png',
  '洗护身体': '/assets/3d/toothbrush.png',
  '学习文具': '/assets/3d/pencil.png',
  '图书杂志': '/assets/3d/books.png',
  '办公用品': '/assets/3d/pushpin.png',
  '运动鞋服': '/assets/3d/shirt.png',
  '户外装备': '/assets/3d/bicycle.png',
  '健身器材': '/assets/3d/basketball.png',
  '家用工具': '/assets/3d/scissors.png',
  '五金耗材': '/assets/3d/key.png',
  '零食饮料': '/assets/3d/cake.png',
  '生鲜果蔬': '/assets/3d/apple.png',
  '锅具餐具': '/assets/3d/egg.png',
  '小家电': '/assets/3d/tv.png',
  '家具家电': '/assets/3d/couch.png',
  '家纺布艺': '/assets/3d/bed.png',
  '宠物粮食': '/assets/3d/apple.png',
  '宠物玩具': '/assets/3d/teddy.png'
}

function getSubIcon(sub, groupIcon) {
  return SUB_ICON[sub] || groupIcon
}

module.exports = {
  DEFAULT_GROUPS,
  getGroups,
  setGroups,
  addSub,
  removeSub,
  exportJSON,
  importJSON,
  resetDefaults,
  getSubIcon
}
