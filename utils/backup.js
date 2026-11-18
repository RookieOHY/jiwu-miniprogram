/**
 * 数据备份 / 恢复
 * 导出：JSON（全量可回灌）/ CSV（表格可读）→ 写入本地文件 → 分享出去
 * 恢复：从聊天文件选择 JSON → 校验 → 合并或覆盖
 */

const store = require('./store')
const cats = require('./cats')
const tags = require('./tags')

function stamp() {
  const d = new Date()
  const p = (n) => (n < 10 ? '0' + n : '' + n)
  return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes())
}

/** 全量快照（物品 + 种草 + 分类 + 标签） */
function snapshot() {
  return {
    app: '日用即值',
    version: 2,
    exportedAt: new Date().toISOString(),
    counts: {
      items: store.getAll().length,
      wishes: store.getWishes().length
    },
    items: store.getAll(),
    wishes: store.getWishes(),
    categories: cats.getGroups(),
    userTags: tags.getTags()
  }
}

/** 物品 → CSV（BOM 头，Excel 中文不乱码） */
function toCSV(items) {
  const cols = ['名称', '买入价', '币种', '数量', '购买日期', '大分类', '子分类', '渠道', '状态', '使用次数', '当前估值', '保修到期', '预计退役', '存放位置', '标签', '附加收支', '备注']
  const esc = (v) => {
    const str = v === undefined || v === null ? '' : String(v)
    return /[",\n]/.test(str) ? '"' + str.replace(/"/g, '""') + '"' : str
  }
  const rows = (items || store.getAll()).map((it) => {
    const status = it.sold ? '已卖出' : it.retired ? '已退役' : '持有中'
    const extras = (it.extras || []).map((x) => x.type + ':' + x.amount).join(' ')
    return [
      it.name, it.price, it.currency || 'CNY', it.qty || 1, it.buyDate,
      it.categoryGroup || '', it.category, store.getPlatformName(it.platform),
      status, it.uses || 0, it.valuation || '', it.warrantyDate || '',
      it.expectedRetireDate || '', it.location || '',
      (it.tags || []).join('/'), extras, (it.note || '').replace(/\n/g, ' ')
    ].map(esc).join(',')
  })
  return '\uFEFF' + cols.join(',') + '\n' + rows.join('\n')
}

/**
 * 写文件并分享（真机；模拟器不支持 shareFileMessage）
 * kind: 'json' | 'csv'
 */
function exportFile(kind, onDone) {
  const fs = wx.getFileSystemManager()
  const data = kind === 'csv' ? toCSV() : JSON.stringify(snapshot(), null, 2)
  const name = 'jiwu-' + stamp() + '.' + (kind === 'csv' ? 'csv' : 'json')
  const path = `${wx.env.USER_DATA_PATH}/${name}`
  fs.writeFile({
    filePath: path,
    data,
    encoding: 'utf8',
    success: () => {
      wx.shareFileMessage({
        filePath: path,
        fileName: name,
        success: () => { if (onDone) onDone(null, name) },
        fail: (err) => {
          // 分享取消/失败时至少提供文件路径与预览
          if (err && err.errMsg && err.errMsg.indexOf('cancel') >= 0) {
            if (onDone) onDone('cancel', name)
          } else {
            wx.openDocument({ filePath: path, fileType: kind === 'csv' ? 'xlsx' : 'json', showMenu: true })
            if (onDone) onDone('preview', name)
          }
        }
      })
    },
    fail: (err) => { if (onDone) onDone(err.errMsg || 'write-fail', name) }
  })
}

/** 解析备份 JSON，返回 {items, wishes, categories, userTags} 或 null */
function parse(text) {
  try {
    const obj = JSON.parse(text)
    if (!obj || !Array.isArray(obj.items)) return null
    return obj
  } catch (e) {
    return null
  }
}

/** 合并（按 id 去重，已有优先） */
function merge(obj) {
  const cur = store.getAll()
  const map = {}
  cur.forEach((it) => { map[it.id] = it })
  let added = 0
  ;(obj.items || []).forEach((it) => {
    if (!it || !it.id || map[it.id]) return
    map[it.id] = it
    added++
  })
  const merged = Object.keys(map).map((k) => map[k]).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
  wx.setStorageSync('items', merged)
  // 分类/标签合并
  if (Array.isArray(obj.categories)) {
    const base = cats.getGroups()
    const names = base.map((g) => g.name)
    obj.categories.forEach((g) => {
      if (!g || !g.name || names.indexOf(g.name) >= 0) return
      base.push(g)
    })
    cats.setGroups(base)
  }
  if (Array.isArray(obj.userTags)) {
    obj.userTags.forEach((t) => { if (t) tags.addTag(t) })
  }
  return { added, total: merged.length }
}

/** 覆盖（完全替换物品） */
function replace(obj) {
  wx.setStorageSync('items', obj.items || [])
  if (Array.isArray(obj.wishes)) wx.setStorageSync('wishes', obj.wishes)
  if (Array.isArray(obj.categories)) cats.setGroups(obj.categories)
  if (Array.isArray(obj.userTags)) tags.setTags(obj.userTags)
  return { added: (obj.items || []).length, total: (obj.items || []).length }
}

module.exports = { snapshot, toCSV, exportFile, parse, merge, replace }
