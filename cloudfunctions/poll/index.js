const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const polls = db.collection('polls')
const votes = db.collection('poll_votes')

const CHOICES = ['buy', 'think', 'no']

/** 统计某个评审的票数 */
async function tallyOf(pollId, openid) {
  const vs = await votes.where({ pollId }).get()
  const tally = { buy: 0, think: 0, no: 0, total: vs.data.length, mine: null }
  vs.data.forEach((v) => {
    if (CHOICES.includes(v.choice)) tally[v.choice]++
    if (v.openid === openid) tally.mine = v.choice
  })
  return tally
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const action = event.action

  // 发起评审：同一株草只建一张卡，内容变化时更新快照
  if (action === 'create') {
    const found = await polls.where({ wishId: event.wishId, ownerOpenid: OPENID }).get()
    const snapshot = {
      name: event.name,
      price: event.price,
      reason: event.reason || '',
      url: event.url || ''
    }
    if (found.data.length) {
      const p = found.data[0]
      await polls.doc(p._id).update({ data: snapshot })
      return { ok: true, pollId: p._id }
    }
    const r = await polls.add({
      data: Object.assign({ wishId: event.wishId, ownerOpenid: OPENID, createdAt: Date.now() }, snapshot)
    })
    return { ok: true, pollId: r._id }
  }

  // 查单张评审 + 票数
  if (action === 'get') {
    try {
      const p = await polls.doc(event.pollId).get()
      const tally = await tallyOf(event.pollId, OPENID)
      return { ok: true, poll: p.data, tally }
    } catch (e) {
      return { ok: false, err: 'not found' }
    }
  }

  // 投票：一人一票，重复投算改票
  if (action === 'vote') {
    if (!CHOICES.includes(event.choice)) return { ok: false, err: 'bad choice' }
    const exist = await votes.where({ pollId: event.pollId, openid: OPENID }).get()
    if (exist.data.length) {
      await votes.doc(exist.data[0]._id).update({ data: { choice: event.choice, updatedAt: Date.now() } })
    } else {
      await votes.add({
        data: { pollId: event.pollId, openid: OPENID, choice: event.choice, createdAt: Date.now() }
      })
    }
    const tally = await tallyOf(event.pollId, OPENID)
    return { ok: true, tally, mine: event.choice }
  }

  // 草主一次拉回自己所有评审的票数
  if (action === 'list') {
    const ps = await polls.where({ ownerOpenid: OPENID }).get()
    const out = {}
    for (const p of ps.data) {
      out[p.wishId] = { pollId: p._id, tally: await tallyOf(p._id, OPENID) }
    }
    return { ok: true, polls: out }
  }

  return { ok: false, err: 'unknown action' }
}
