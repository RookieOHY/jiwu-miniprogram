/**
 * 值回票价日庆祝海报：canvas 2d 绘制 → 导出临时图片
 * 用途：分享 imageUrl / 保存相册发朋友圈
 */

/** 圆角矩形路径 */
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** 文本截断：超宽缩字号，再超宽打省略号 */
function fitText(ctx, text, max, size, bold) {
  let s = size
  ctx.font = (bold ? 'bold ' : '') + s + 'px sans-serif'
  while (ctx.measureText(text).width > max && s > 26) {
    s -= 2
    ctx.font = (bold ? 'bold ' : '') + s + 'px sans-serif'
  }
  if (ctx.measureText(text).width > max) {
    while (text.length > 1 && ctx.measureText(text + '…').width > max) {
      text = text.slice(0, -1)
    }
    text += '…'
  }
  return text
}

/**
 * 在 2d canvas 节点上绘制庆祝海报并导出
 * d: { name, symbol, price, days, need, due }
 * cb(tempFilePath) 失败时 cb(null)
 */
function drawCelebration(node, d, cb) {
  const W = 640
  const H = 800
  let dpr = 2
  try {
    dpr = (wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()).pixelRatio || 2
  } catch (e) {
    dpr = 2
  }
  node.width = W * dpr
  node.height = H * dpr
  const ctx = node.getContext('2d')
  ctx.scale(dpr, dpr)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // ---- 背景：紫渐变 ----
  const g = ctx.createLinearGradient(0, 0, W, H)
  g.addColorStop(0, '#8b5cf6')
  g.addColorStop(0.45, '#a855f7')
  g.addColorStop(1, '#5b3d9e')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)

  // ---- 🎉 ----
  ctx.font = '96px sans-serif'
  ctx.fillText('🎉', W / 2, 170)

  // ---- 徽章「值回票价日」----
  const bw = 240
  const bh = 52
  rr(ctx, W / 2 - bw / 2, 236, bw, bh, bh / 2)
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.fillStyle = 'rgba(255,255,255,0.95)'
  ctx.font = '22px sans-serif'
  ctx.fillText('值 回 票 价 日', W / 2, 236 + bh / 2 + 1)

  // ---- 物品名（自适应缩放截断）----
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 46px sans-serif'
  const name = fitText(ctx, d.name, W - 120, 46, true)
  ctx.fillText(name, W / 2, 350)

  // ---- 价格 · 天数 ----
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.font = '28px sans-serif'
  ctx.fillText(d.symbol + d.price + ' · 用了 ' + d.days + ' 天', W / 2, 420)

  // ---- 分隔细线 ----
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(W / 2 - 160, 480)
  ctx.lineTo(W / 2 + 160, 480)
  ctx.stroke()

  // ---- 主文案 ----
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 36px sans-serif'
  ctx.fillText('今天起，每个使用日都是赚的', W / 2, 550)

  // ---- 副文案 ----
  ctx.fillStyle = 'rgba(255,255,255,0.8)'
  ctx.font = '24px sans-serif'
  ctx.fillText('第 ' + d.need + ' 天，日均已降到目标以下', W / 2, 605)

  // ---- 品牌脚注 ----
  ctx.fillStyle = 'rgba(255,255,255,0.65)'
  ctx.font = '22px sans-serif'
  ctx.fillText('记物 · 一件东西用得越久，每天就越便宜', W / 2, H - 90)

  wx.canvasToTempFilePath({
    canvas: node,
    destWidth: W * dpr,
    destHeight: H * dpr,
    success: (r) => cb(r.tempFilePath),
    fail: () => cb(null)
  })
}

module.exports = { drawCelebration }
