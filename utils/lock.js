/**
 * 应用锁：4 位数字口令
 * 定位：防随手翻看（同事/家人拿手机），不防专业攻击——口令哈希只是不在本地留明文，
 * 忘记口令可原地重置且不清空数据。真要加密需要引库＋密钥同位存放，属于假安全，已评估后放弃。
 */

const KEY = 'lockConfig'
const DEFAULTS = { enabled: false, pin: '', onBackground: true }

let sessionAuthed = false // 本次运行是否已解锁（切后台按配置重新上锁）
let navigating = false    // 防止连续 onShow 重复压入锁页

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

/**
 * 开关应用锁：开启前必须已有口令
 * keepAuthed：刚从锁页输完口令进来时传 true，避免二次踢回锁页
 */
function toggle(on, keepAuthed) {
  const cfg = get()
  if (on && !cfg.pin) return { ok: false, reason: 'nopin' }
  set(Object.assign(cfg, { enabled: !!on }))
  if (on && !keepAuthed) {
    sessionAuthed = false
  }
  return { ok: true }
}

/** 忘记口令：重置口令并保留数据（见文件头定位说明） */
function resetPin() {
  set(Object.assign(get(), { pin: '', enabled: false }))
  sessionAuthed = true
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
}

function currentPage() {
  const pages = getCurrentPages()
  return pages[pages.length - 1] || null
}

function isTabRoute(route) {
  const tabs = ['pages/index/index', 'pages/wishlist/wishlist', 'pages/stats/stats', 'pages/settings/settings']
  return tabs.indexOf(route) >= 0
}

/**
 * 页面 onShow 守卫：需要口令且未解锁时，把锁页压在当前页之上
 * 用 navigateTo 而不是 reLaunch：页面栈与 query 原样保留，
 * 解锁后 navigateBack 就回到用户原来那一页，不会出现「回跳丢参数 → 空白页」
 * @returns {boolean} true = 已拦截，调用方应立刻 return
 */
function guard() {
  if (!enabled() || sessionAuthed) return false
  const cur = currentPage()
  if (!cur || !cur.route) return false
  if (cur.route.indexOf('pages/lock/lock') === 0) return false
  if (navigating) return true
  navigating = true
  wx.navigateTo({
    url: '/pages/lock/lock',
    complete: () => {
      setTimeout(() => { navigating = false }, 400)
    }
  })
  return true
}

/** 解锁：关掉锁页回到原页面；栈里只剩锁页时回首页 */
function resume() {
  sessionAuthed = true
  const pages = getCurrentPages()
  if (pages.length > 1) {
    wx.navigateBack()
    return
  }
  wx.switchTab({ url: '/pages/index/index' })
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
  isTabRoute,
  PIN_LEN: 4
}
