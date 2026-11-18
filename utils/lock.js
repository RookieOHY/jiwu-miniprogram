/**
 * 应用锁：4 位数字口令
 * 定位：防随手翻看（同事/家人拿手机），不防专业攻击——口令哈希只是不在本地留明文，
 * 忘记口令可原地重置且不清空数据。真要加密需要引库＋密钥同位存放，属于假安全，已评估后放弃。
 */

const KEY = 'lockConfig'
const DEFAULTS = { enabled: false, pin: '', onBackground: true }

let sessionAuthed = false // 本次运行是否已解锁（切后台按配置重新上锁）
let pendingRoute = ''     // 被拦截时想去的页面，解锁后送回

function get() {
  const s = wx.getStorageSync(KEY)
  if (!s || typeof s !== 'object') return Object.assign({}, DEFAULTS)
  return Object.assign({}, DEFAULTS, s)
}

function set(cfg) {
  wx.setStorageSync(KEY, cfg)
}

/** FNV-1a + 位置盐，双段哈希（非加密，仅避免明文口令落 storage） */
function hash(str) {
  const s = 'jiwu.v1.' + str + '.v1'
  let h1 = 0x811c9dc5
  let h2 = 0x1000193
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i)
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0
    h2 = Math.imul(h2 + c + i, 0x85ebca6b) >>> 0
  }
  return h1.toString(36) + '.' + h2.toString(36)
}

/* ---------- 配置读写 ---------- */

function enabled() {
  return !!get().enabled
}

function hasPin() {
  return !!get().pin
}

function onBackground() {
  return get().onBackground !== false
}

function setOnBackground(v) {
  set(Object.assign(get(), { onBackground: !!v }))
}

/** 设置口令（调用前应已校验两次一致） */
function setPin(pin) {
  set(Object.assign(get(), { pin: hash(String(pin)) }))
}

/** 开关应用锁：开启前必须已有口令 */
function toggle(on) {
  const cfg = get()
  if (on && !cfg.pin) return { ok: false, reason: 'nopin' }
  set(Object.assign(cfg, { enabled: !!on }))
  if (on) {
    sessionAuthed = false
    pendingRoute = ''
  }
  return { ok: true }
}

/** 忘记口令：重置口令并保留数据（见文件头定位说明） */
function resetPin() {
  set(Object.assign(get(), { pin: '', enabled: false }))
  sessionAuthed = true
  pendingRoute = ''
}

/* ---------- 运行时锁状态 ---------- */

function verify(pin) {
  const cfg = get()
  return !!cfg.pin && cfg.pin === hash(String(pin))
}

function authed() {
  return sessionAuthed
}

function markAuthed() {
  sessionAuthed = true
}

function lockNow() {
  sessionAuthed = false
  pendingRoute = ''
}

function currentPage() {
  const pages = getCurrentPages()
  return pages[pages.length - 1] || null
}

/** 完整回跳地址：保留 options（详情页/投票页缺 id 就打不开了） */
function routeWithQuery(cur) {
  if (!cur || !cur.route) return ''
  const opt = cur.options || {}
  const parts = []
  Object.keys(opt).forEach((k) => {
    if (opt[k] === undefined || opt[k] === null) return
    parts.push(k + '=' + encodeURIComponent(opt[k]))
  })
  return cur.route + (parts.length ? '?' + parts.join('&') : '')
}

function isTabRoute(route) {
  const tabs = ['pages/index/index', 'pages/wishlist/wishlist', 'pages/stats/stats', 'pages/settings/settings']
  return tabs.indexOf(route) >= 0
}

function pending() {
  return pendingRoute
}

/**
 * 页面 onShow 守卫：需要口令且未解锁时跳锁页
 * @returns {boolean} true = 已拦截，调用方应立刻 return
 */
function guard() {
  if (!enabled() || sessionAuthed) return false
  const route = routeWithQuery(currentPage())
  if (!route || route.indexOf('pages/lock/lock') === 0) return false
  pendingRoute = route
  wx.reLaunch({ url: '/pages/lock/lock' })
  return true
}

/** 解锁后回到被拦截前的页面 */
function resume() {
  const full = pendingRoute
  pendingRoute = ''
  sessionAuthed = true
  if (!full || full.indexOf('pages/lock/lock') === 0) {
    wx.switchTab({ url: '/pages/index/index' })
    return
  }
  const path = full.split('?')[0]
  if (isTabRoute(path)) {
    wx.switchTab({ url: '/' + path })
  } else {
    wx.redirectTo({ url: '/' + full })
  }
}

module.exports = {
  enabled,
  hasPin,
  onBackground,
  setOnBackground,
  setPin,
  toggle,
  resetPin,
  verify,
  authed,
  markAuthed,
  lockNow,
  guard,
  resume,
  pending,
  isTabRoute,
  PIN_LEN: 4
}
