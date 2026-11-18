/**
 * 微信订阅消息：小程序里唯一能把提醒送出 App 的通道
 * 规则（微信侧限制，改不了）：
 *  - 用户每点一次「允许」，我们才获得发送 1 条的额度，用完必须重新授权
 *  - 模板要在小程序后台申请，字段名必须和模板一致，这里按 thing1/thing2/date3 组织
 * 未配置模板 ID 时所有入口自动隐藏，不影响其他功能。
 */

const cloud = require('./cloud')
const reminders = require('./reminders')

const KEY = 'notifyState'
const DEFAULTS = { tmplId: '', quota: 0, lastErr: '' }

function get() {
  const s = wx.getStorageSync(KEY)
  if (!s || typeof s !== 'object') return Object.assign({}, DEFAULTS)
  return Object.assign({}, DEFAULTS, s)
}

function save(next) {
  wx.setStorageSync(KEY, Object.assign({}, get(), next))
  return get()
}

function tmplId() {
  return get().tmplId || ''
}

function setTmplId(v) {
  const id = String(v || '').trim()
  save({ tmplId: id, quota: id ? get().quota : 0 })
  return id
}

function quota() {
  return Number(get().quota) || 0
}

/** 已配好模板 ID 且云开发可用 */
function ready() {
  return !!tmplId() && cloud.isReady()
}

/**
 * 向用户要一次授权
 * @param {(r:{ok:boolean, msg?:string})=>void} cb
 */
function ask(cb) {
  const id = tmplId()
  if (!id) {
    if (cb) cb({ ok: false, msg: '先填模板 ID' })
    return
  }
  wx.requestSubscribeMessage({
    tmplIds: [id],
    success: (res) => {
      const state = res && res[id]
      if (state === 'accept') {
        save({ quota: quota() + 1, lastErr: '' })
        if (cb) cb({ ok: true, msg: '已攒到 1 次推送额度' })
      } else if (state === 'reject') {
        save({ lastErr: '你选了拒绝，提醒发不出去' })
        if (cb) cb({ ok: false, msg: '已拒绝，无法推送' })
      } else {
        // 勾选了「总是保持以上选择」后不会再弹窗，结果可能是 filter/未知
        if (cb) cb({ ok: false, msg: '本次没有计入授权（可能已设为默认拒绝）' })
      }
    },
    fail: (e) => {
      const msg = (e && e.errMsg) || 'fail'
      save({ lastErr: msg })
      if (cb) cb({ ok: false, msg: msg.indexOf('subscribe') >= 0 ? '请在设置里允许订阅消息' : '授权失败，真机再试' })
    }
  })
}

/** 组织模板字段（thing ≤20 字，date 用 YYYY-MM-DD） */
function buildData(r) {
  const thing = (v) => ({ value: String(v || '').slice(0, 20) })
  // 吃灰 / 预算的 date 是「上次使用日 / 月份」，放进「到期日期」字段会误导，改用今天
  const today = new Date()
  const p = (n) => (n < 10 ? '0' + n : '' + n)
  const now = today.getFullYear() + '-' + p(today.getMonth() + 1) + '-' + p(today.getDate())
  const useToday = r.kind === 'dust' || r.kind === 'budget'
  const date = !useToday && /^\d{4}-\d{2}-\d{2}$/.test(r.date) ? r.date : now
  return {
    thing1: thing(r.name),
    thing2: thing(r.type),
    date3: { value: date },
    thing4: thing(r.text)
  }
}

function pageOf(r) {
  return r.itemId ? 'pages/detail/detail?id=' + r.itemId : 'pages/reminders/reminders'
}

/**
 * 推送一条
 * @param {object} r 提醒对象；不传则取最紧急的一条
 */
function send(r, cb) {
  if (!ready()) {
    if (cb) cb({ ok: false, msg: '未配置模板 ID 或云环境' })
    return
  }
  if (quota() <= 0) {
    if (cb) cb({ ok: false, msg: '授权额度用完，需要先攒一次', needAuth: true })
    return
  }
  const item = r || reminders.getReminders()[0]
  if (!item) {
    if (cb) cb({ ok: false, msg: '当前没有待提醒项' })
    return
  }
  cloud.callFn('notify', {
    tmplId: tmplId(),
    page: pageOf(item),
    data: buildData(item)
  }).then((res) => {
    const out = (res && res.result) || {}
    if (out.ok) {
      save({ quota: quota() - 1, lastErr: '' })
      if (cb) cb({ ok: true, msg: '已推送「' + item.name + '」' })
    } else if (out.errCode === 43101) {
      save({ quota: 0 })
      if (cb) cb({ ok: false, msg: '没有可用订阅次数', needAuth: true })
    } else {
      save({ lastErr: out.errMsg || out.err || '未知错误' })
      if (cb) cb({ ok: false, msg: out.errMsg || out.err || '发送失败' })
    }
  }).catch((e) => {
    const msg = (e && e.errMsg) || (e && e.message) || '云函数调用失败'
    save({ lastErr: msg })
    if (cb) cb({ ok: false, msg: msg.indexOf('notify') >= 0 ? '云函数 notify 未部署' : '网络异常，稍后再试' })
  })
}

module.exports = {
  KEY,
  get,
  tmplId,
  setTmplId,
  quota,
  ready,
  ask,
  send,
  buildData,
  pageOf
}
