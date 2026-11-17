/**
 * 剁手评审云服务封装
 * 上手步骤：
 * 1. 开发者工具 → 顶部「云开发」→ 开通 → 创建环境（选免费额度），复制环境 ID
 * 2. 把环境 ID 填到下面 CLOUD_ENV
 * 3. 开发者工具左侧 cloudfunctions/poll 右键 →「上传并部署：云端安装依赖」
 * 4. 云开发控制台 → 数据库 → 新建集合 polls、poll_votes（云函数是服务端读写，不受集合权限限制）
 *
 * CLOUD_ENV 为空时 isReady() 为 false，评审功能整体隐藏，其余功能零影响。
 */

// ←←← 开通云开发后，把环境 ID 填在这里，例如 'jiwu-3g1a2b4c5d'
const CLOUD_ENV = 'ryjz-d9gaxogphaee7368e'

let inited = false

/** 云是否已配置好 */
function isReady() {
  return !!CLOUD_ENV
}

/** 惰性初始化，返回 wx.cloud（未配置返回 null） */
function ready() {
  if (!isReady()) return null
  if (!inited) {
    wx.cloud.init({ env: CLOUD_ENV, traceUser: true })
    inited = true
  }
  return wx.cloud
}

/** 调用 poll 云函数，data: { action, ... } */
function call(data) {
  const c = ready()
  if (!c) return Promise.reject(new Error('CLOUD_OFF'))
  return c.callFunction({ name: 'poll', data })
}

module.exports = { isReady, call }
