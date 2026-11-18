/**
 * 用户标签：存储键 userTags
 * 默认给一组常用标签，可增删
 */

const KEY = 'userTags'

const DEFAULT_TAGS = ['主力机', '吃灰', '送礼', '通勤', '健身', '游戏', '办公']

function getTags() {
  const v = wx.getStorageSync(KEY)
  if (Array.isArray(v)) return v
  return DEFAULT_TAGS.slice()
}

function setTags(tags) {
  wx.setStorageSync(KEY, tags)
}

function addTag(tag) {
  const t = (tag || '').trim()
  if (!t) return false
  const tags = getTags()
  if (tags.indexOf(t) >= 0) return false
  tags.push(t)
  setTags(tags)
  return true
}

function removeTag(tag) {
  setTags(getTags().filter((t) => t !== tag))
}

/** 标签被多少件物品使用 */
function countFor(tag, items) {
  return items.filter((it) => Array.isArray(it.tags) && it.tags.indexOf(tag) >= 0).length
}

module.exports = { getTags, setTags, addTag, removeTag, countFor, DEFAULT_TAGS }
