const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

/**
 * 发送一条订阅消息
 * event: { tmplId, page, data }
 *  - 小程序侧一次「订阅」授权 = 只能发一条，所以每次授权用完就要重新攒
 *  - data 的字段名必须与所选模板一致（推荐含 物品名称 thing1 / 提醒类型 thing2 / 到期日期 date3）
 */
exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { tmplId, page, data } = event || {}

  if (!OPENID) return { ok: false, err: 'no-openid' }
  if (!tmplId) return { ok: false, err: 'no-template-id' }
  if (!data || typeof data !== 'object') return { ok: false, err: 'no-data' }

  try {
    const res = await cloud.openapi.subscribeMessage.send({
      touser: OPENID,
      templateId: tmplId,
      page: page || 'pages/reminders/reminders',
      miniprogramState: 'formal',
      lang: 'zh_CN',
      data
    })
    return { ok: true, res }
  } catch (e) {
    // 43101 = 用户没有可消费的订阅次数（很正常，引导再授权一次）
    const errCode = e && e.errCode
    const errMsg = (e && e.errMsg) || String(e)
    return { ok: false, errCode, errMsg }
  }
}
