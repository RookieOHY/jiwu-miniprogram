/**
 * 订单文本解析：把「订单详情页」复制出来的文字直接变成物品字段
 * 目标只有一个——把录入成本从「几分钟」压到「几秒」，这是行业公认的流失点
 * 纯文本规则，零依赖；识别不到的字段留空，由用户补
 */

const store = require('./store')

// 渠道关键词 → platform key（顺序即优先级，先匹配到先赢）
const PLATFORM_HINTS = [
  ['京东', 'jd'], ['京东自营', 'jd'], ['淘宝', 'tb'], ['天猫', 'tb'], ['拼多多', 'pdd'],
  ['唯品会', 'vip'], ['闲鱼', 'xy'], ['抖音', 'dy'], ['亚马逊', 'amazon'], ['amazon', 'amazon'],
  ['iherb', 'iherb'], ['shein', 'shein'], ['temu', 'temu'], ['速卖通', 'ali'], ['微信小店', 'wx'],
  ['线下', 'off'], ['实体店', 'off']
]

// 价格标签：优先「实付/到手」，其次「金额/价格」
const PRICE_LABELS = ['实付款', '实付', '到手价', '应付金额', '应付', '总价', '合计', '订单金额', '金额', '价格', '付款金额']

const NOISE = /^(订单详情|订单信息|商品详情|交易详情|Order Detail|Order Information|Order Summary|商品名称|物流信息|订单编号|订单号|交易号|物流|快递|发货|收货|地址|电话|备注|发票|评价|退款|优惠券|红包|运费|优惠|满减|积分|支付|支付方式|花呗|信用卡|微信支付|支付宝|手机天猫|淘宝|京东)$/

function pad(n) {
  return n < 10 ? '0' + n : '' + n
}

/** 任意日期写法 → YYYY-MM-DD */
function normDate(text) {
  let m = text.match(/(20\d{2})[-/年.](\d{1,2})[-/月.](\d{1,2})/)
  if (m) {
    const mo = Number(m[2])
    const d = Number(m[3])
    // 2026-13-45 这种不能算有效日期
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) return m[1] + '-' + pad(mo) + '-' + pad(d)
  }
  m = text.match(/(20\d{2})\s*年\s*(\d{1,2})\s*月/)
  if (m) {
    const mo = Number(m[2])
    if (mo >= 1 && mo <= 12) return m[1] + '-' + pad(mo) + '-01'
  }
  return ''
}

function pickPrice(lines) {
  // 1) 带标签的价格
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i]
    for (let j = 0; j < PRICE_LABELS.length; j++) {
      const lab = PRICE_LABELS[j]
      const at = ln.indexOf(lab)
      if (at < 0) continue
      const after = ln.slice(at + lab.length)
      const m = after.match(/([0-9][0-9,]*(?:\.[0-9]{1,2})?)/)
      if (m) return { value: parseFloat(m[1]), labeled: true, label: lab, line: i }
    }
  }
  // 2) 最大的那个带 ¥ 的数字（通常就是总额）
  let best = null
  lines.forEach((ln, i) => {
    // 支持 ¥￥$€£ 与符号在后的写法（348.00 元）
    const re = /(?:[¥￥$€£]\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?))|(([0-9][0-9,]*(?:\.[0-9]{1,2})?)\s*元)/g
    let m
    while ((m = re.exec(ln))) {
      const v = parseFloat(String(m[1] || m[2]).replace(/,/g, ''))
      if (!(v > 0)) continue
      if (!best || v > best.value) best = { value: v, labeled: false, label: m[1] ? '货币符号' : '元', line: i }
    }
  })
  return best
}

function guessCurrency(text) {
  const t = String(text)
  if (/美元|USD/i.test(t) || (/\$/.test(t) && !/[¥￥]/.test(t))) return 'USD'
  if (/欧元|EUR/.test(t) || (t.indexOf('€') >= 0 && !/[¥￥]/.test(t))) return 'EUR'
  if (/英镑|GBP/.test(t) || (t.indexOf('£') >= 0 && !/[¥￥]/.test(t))) return 'GBP'
  if (/日元|JPY|円/.test(t)) return 'JPY'
  return 'CNY'
}

function guessQty(text) {
  let m = text.match(/[xX×*]\s*(\d{1,3})(?!\d)/) || text.match(/数量[:：]?\s*(\d{1,3})/) || text.match(/(\d{1,3})\s*(件|个|支|瓶|袋|盒|双)/)
  const n = m ? parseInt(m[1], 10) : 1
  return n >= 1 && n <= 999 ? n : 1
}

/** 从行里挑名称：跳过纯数字/标签行，优先「商品/名称/标题」标签后的内容 */
function pickName(lines) {
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i].trim()
    const m = ln.match(/^(?:商品名称|商品|宝贝标题|物品名称|名称|标题|品名|Item Name|Item|Product|Title|Description)[:：]\s*(.+)$/i)
    if (m && m[1].trim().length > 1) return cleanName(m[1])
  }
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i].trim()
    if (!ln || NOISE.test(ln)) continue
    if (/^[0-9¥￥$€£,.]+$/.test(ln)) continue
    // 「iHerb 订单」「XX 店铺」这类抬头行不是商品名
    if (/^(.{0,12})(订单|下单|付款|店铺|旗舰店|商城|明细|详情|小计|运费|优惠)/.test(ln) && !/[:：]/.test(ln) && ln.length <= 14) continue
    if (/^(Order|Receipt|Invoice|Summary)\b/i.test(ln) && ln.length <= 20 && !/\d/.test(ln)) continue
    if (/^(订单|交易|支付|物流|发货|收货|退款|优惠券|运费|合计|小计|实付)/.test(ln)) continue
    if (ln.length < 2) continue
    return cleanName(ln)
  }
  return ''
}

function cleanName(raw) {
  let s = String(raw).trim()
  s = s.replace(/[【\[（(]\s*(正品|包邮|现货|自营|秒杀|特价|新品|官方|旗舰)\s*[】\]）)]/g, '')
  s = s.replace(/\s{2,}/g, ' ')
  if (s.length > 30) {
    let cut = s.slice(0, 30)
    // 别把 256GB 切成 256G：如果末尾是半个英文单词，退回到最近空格
    const tail = s.charAt(30)
    if (/[A-Za-z0-9]/.test(cut.slice(-1)) && /[A-Za-z0-9]/.test(tail)) {
      const sp = cut.lastIndexOf(' ')
      if (sp >= 12) cut = cut.slice(0, sp)
    }
    s = cut.trim()
  }
  return s.trim()
}

function guessPlatform(text, known) {
  const low = String(text).toLowerCase()
  for (let i = 0; i < PLATFORM_HINTS.length; i++) {
    const kw = PLATFORM_HINTS[i][0].toLowerCase()
    if (low.indexOf(kw) >= 0) return PLATFORM_HINTS[i][1]
  }
  return known || 'other'
}

/**
 * @returns {{name,price,priceText,buyDate,platform,qty,currency,hits:string[]}}
 * hits 用来告诉用户「哪些字段是猜的」
 */
function fromText(text) {
  const raw = String(text || '').replace(/\r/g, '')
  const lines = raw.split('\n').map((l) => l.trim()).filter((l) => l.length)
  const out = { name: '', price: '', priceText: '', buyDate: '', platform: '', qty: 1, currency: 'CNY', hits: [] }
  if (!raw.trim()) return out

  const price = pickPrice(lines)
  if (price && price.value > 0) {
    out.price = String(price.value)
    out.priceText = price.label
    out.hits.push('价格 ' + price.value + '（按「' + price.label + '」）')
  }

  const date = normDate(raw)
  if (date) {
    out.buyDate = date
    out.hits.push('日期 ' + date)
  }

  const name = pickName(lines)
  if (name) {
    out.name = name
    out.hits.push('名称「' + name + '」')
  }

  out.currency = guessCurrency(raw)
  out.platform = guessPlatform(raw, '')
  if (out.platform !== 'other') out.hits.push('渠道 ' + store.getPlatformName(out.platform))

  const qty = guessQty(raw)
  if (qty > 1) {
    out.qty = qty
    out.hits.push('数量 ' + qty)
  }
  if (out.currency !== 'CNY') out.hits.push('币种 ' + out.currency)
  return out
}

module.exports = { fromText, normDate, guessPlatform, guessQty, pickName }
