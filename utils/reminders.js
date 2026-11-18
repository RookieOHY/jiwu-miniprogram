/**
 * 到期提醒引擎
 * 数据源：item.warrantyDate（保修/保质期）、item.expectedRetireDate（预计退役）
 * 状态：dismissed 记录在 storage，按 物品id+类型+日期 去重（日期变了会重新提醒）
 */

const store = require('./store')
const prefs = require('./prefs')

const DISMISS_KEY = 'reminderDismissed'
// 阈值改为可配置（设置 → 提醒）：默认提前 30 天预警、90 天没使用算吃灰
const warnDays = () => prefs.warnDays()
const dustDays = () => prefs.dustDays()

function fmtDate(d) {
  const p = (n) => (n < 10 ? '0' + n : '' + n)
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}

function diffDays(dateStr, today) {
  const t = new Date(dateStr + 'T00:00:00')
  const n = new Date(today + 'T00:00:00')
  return Math.round((t - n) / 86400000)
}

/** 提醒列表：临期（含已过期）按剩余天数升序 */
function getReminders(todayStr) {
  const today = todayStr || fmtDate(new Date())
  const wd = warnDays()
  const dd = dustDays()
  const dismissed = wx.getStorageSync(DISMISS_KEY) || {}
  const out = []
  store.getAll().forEach((it) => {
    if (it.retired && !it.expectedRetireDate) return
    const push = (type, date, tag, only) => {
      if (!date) return
      const left = diffDays(date, today)
      if (left > wd) return
      const id = it.id + '|' + type + '|' + date
      if (dismissed[id]) return
      out.push({
        id,
        itemId: it.id,
        name: it.name,
        type,
        tag,
        date,
        left,
        overdue: left < 0,
        text: left < 0 ? '已过期 ' + Math.abs(left) + ' 天' : left === 0 ? '今天到期' : '还有 ' + left + ' 天'
      })
    }
    push('保修/保质到期', it.warrantyEnabled ? it.warrantyDate : '', '🛡')
    if (!it.recycle) push('预计退役', it.expectedRetireDate, '📦')
    push('订阅续费', it.recycle ? it.expectedRetireDate : '', '🔁', true)
    // 吃灰：有使用记录且距今超过阈值天数没再使用
    if (!it.retired && it.lastUseDate) {
      const idle = -diffDays(it.lastUseDate, today)
      if (idle >= dd) {
        const id = it.id + '|dust|' + it.lastUseDate
        if (!dismissed[id]) {
          out.push({
            id, itemId: it.id, name: it.name, type: '吃灰预警', tag: '🕳',
            date: it.lastUseDate, left: -idle, overdue: true,
            text: '已 ' + idle + ' 天没使用'
          })
        }
      }
    }
  })
  out.sort((a, b) => a.left - b.left)
  return out
}

/** 数量（用于徽标） */
function countReminders() {
  return getReminders().length
}

/** 关闭单条提醒（同一天不再提示） */
function dismiss(id) {
  const dismissed = wx.getStorageSync(DISMISS_KEY) || {}
  dismissed[id] = 1
  wx.setStorageSync(DISMISS_KEY, dismissed)
}

/** 恢复全部提醒 */
function restoreAll() {
  wx.setStorageSync(DISMISS_KEY, {})
}

module.exports = { getReminders, countReminders, dismiss, restoreAll, warnDays, dustDays, fmtDate, diffDays }
