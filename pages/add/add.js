const store = require('../../utils/store')

function fmtCN(s) {
  if (!s) return ''
  const p = s.split('-')
  return p[0] + '年' + Number(p[1]) + '月' + Number(p[2]) + '日'
}
function round10(n) {
  return Math.round(n * 1e10) / 1e10
}
function calcApply(a, b, op) {
  switch (op) {
    case '+': return a + b
    case '−': return a - b
    case '×': return a * b
    case '÷': return b === 0 ? 0 : a / b
  }
  return b
}
const icons = require('../../utils/icons')

Page({
  data: {
    name: '',
    price: '',
    buyDate: '',
    category: 'other',
    categories: store.CATEGORIES,
    platform: 'other',
    platformChips: [],
    showAllPlatforms: false,
    currency: 'CNY',
    currencies: store.CURRENCIES,
    note: '',
    maxDate: '',
    canSave: false,
    targetDaily: '',
    needDays: '',
    dueDate: '',
    // 物品图标：{ type: 'emoji'|'photo'|'3d', value }  value 为 emoji 文本或图片路径
    icon: null,
    // 选择面板
    showIconPanel: false,
    iconTab: 'emoji', // emoji | 3d
    iconKeyword: '',
    emojiList: [],
    icon3dList: [],
    // 快捷添加布局
    moreWays: false,
    showCat: false,
    showPlatform: false,
    buyDateCN: '',
    catName: '其他',
    platformName: '其他',
    // 计算器
    showCalc: false,
    calcDisplay: '0',
    calcAcc: null,
    calcOp: null,
    calcFresh: true
  },

  onLoad(query) {
    const d = new Date()
    const p = (n) => (n < 10 ? '0' + n : '' + n)
    const today = d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
    this.setData({ buyDate: today, maxDate: today, buyDateCN: fmtCN(today) })

    // 编辑模式：预填物品数据
    if (query.id) {
      const it = store.getById(query.id)
      if (it) {
        this.editId = it.id
        this.setData({
          name: it.name,
          price: String(it.price),
          buyDate: it.buyDate,
          category: it.category,
          platform: it.platform || 'other',
          currency: it.currency || 'CNY',
          note: it.note || '',
          icon: it.icon || null,
          targetDaily: it.targetDaily > 0 ? String(it.targetDaily) : '',
          canSave: true,
          isEdit: true,
          buyDateCN: fmtCN(it.buyDate),
          catName: store.getCategoryName(it.category),
          platformName: store.getPlatformName(it.platform || 'other')
        })
        wx.setNavigationBarTitle({ title: '编辑物品' })
        this._updateNeed()
      }
    } else {
      wx.setNavigationBarTitle({ title: '快捷添加' })
    }

    this.updatePlatformChips()
    this.filterIcons()
  },

  /* ---------- 物品图标 ---------- */

  openIconPanel() {
    this.setData({ showIconPanel: true })
  },

  closeIconPanel() {
    this.setData({ showIconPanel: false })
  },

  noop() {},

  setIconTab(e) {
    this.setData({ iconTab: e.currentTarget.dataset.tab }, () => this.filterIcons())
  },

  onIconSearch(e) {
    this.setData({ iconKeyword: e.detail.value }, () => this.filterIcons())
  },

  filterIcons() {
    const q = this.data.iconKeyword
    this.setData({
      emojiList: icons.search(icons.EMOJIS, q, (it) => it.kw),
      icon3dList: icons.search(icons.ICONS_3D, q, (it) => it.kw)
    })
  },

  pickEmoji(e) {
    this.setData({ icon: { type: 'emoji', value: e.currentTarget.dataset.e }, showIconPanel: false })
  },

  pick3d(e) {
    this.setData({ icon: { type: '3d', value: e.currentTarget.dataset.src }, showIconPanel: false })
  },

  clearIcon() {
    this.setData({ icon: null })
  },

  /** 从相册 / 拍照 */
  pickPhoto(e) {
    const src = e.currentTarget.dataset.src === 'camera' ? ['camera'] : ['album']
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: src,
      sizeType: ['compressed'],
      success: (r) => {
        const tmp = r.tempFiles[0].tempFilePath
        // 落盘保存，避免临时文件失效
        const fs = wx.getFileSystemManager()
        const saved = `${wx.env.USER_DATA_PATH}/icon_${Date.now()}.png`
        fs.saveFile({
          tempFilePath: tmp,
          filePath: saved,
          success: () => this.setData({ icon: { type: 'photo', value: saved }, showIconPanel: false }),
          fail: () => this.setData({ icon: { type: 'photo', value: tmp }, showIconPanel: false })
        })
      }
    })
  },

  /** 计算渠道标签：收起时只显示常用项 + 当前已选的非常用项 */
  updatePlatformChips() {
    const list = this.data.showAllPlatforms
      ? store.PLATFORMS
      : store.PLATFORMS.filter(
          (p) => store.COMMON_PLATFORMS.includes(p.key) || p.key === this.data.platform
        )
    this.setData({
      platformChips: list.map((p) => Object.assign({}, p, { char: store.getPlatformChar(p.key) }))
    })
  },

  togglePlatforms() {
    this.setData({ showAllPlatforms: !this.data.showAllPlatforms }, () => this.updatePlatformChips())
  },

  onName(e) {
    const name = e.detail.value
    this.setData({ name, canSave: !!name.trim() && !!this.data.price })
  },

  onPrice(e) {
    const price = e.detail.value
    this.setData({ price, canSave: !!this.data.name.trim() && !!price }, () => this._updateNeed())
  },

  onDate(e) {
    this.setData({ buyDate: e.detail.value, buyDateCN: fmtCN(e.detail.value) }, () => this._updateNeed())
  },

  onCat(e) {
    this.setData({ category: e.currentTarget.dataset.key, catName: store.getCategoryName(e.currentTarget.dataset.key) })
  },

  onPlatform(e) {
    this.setData({ platform: e.currentTarget.dataset.key, platformName: store.getPlatformName(e.currentTarget.dataset.key) }, () => this.updatePlatformChips())
  },

  onCurrency(e) {
    this.setData({ currency: e.currentTarget.dataset.key })
  },

  onTargetDaily(e) {
    this.setData({ targetDaily: e.detail.value }, () => this._updateNeed())
  },

  /** 目标日均实时预览：第 N 天回本 + 日期 */
  _updateNeed() {
    const t = Number(this.data.targetDaily)
    const p = parseFloat(this.data.price)
    if (!(t > 0) || !(p > 0) || !this.data.buyDate) {
      this.setData({ needDays: '', dueDate: '' })
      return
    }
    const need = Math.max(1, Math.ceil(p / t))
    const d = new Date(this.data.buyDate + 'T00:00:00')
    d.setDate(d.getDate() + need - 1)
    this.setData({
      needDays: need,
      dueDate: (d.getMonth() + 1) + '月' + d.getDate() + '日'
    })
  },

  onNote(e) {
    this.setData({ note: e.detail.value })
  },

  /* ---------- 快捷添加布局 ---------- */

  toggleMore() {
    this.setData({ moreWays: !this.data.moreWays })
  },

  toggleCatSec() {
    this.setData({ showCat: !this.data.showCat, showPlatform: false })
  },

  togglePlatformSec() {
    this.setData({ showPlatform: !this.data.showPlatform, showCat: false })
  },

  /* ---------- 计算器 ---------- */

  openCalc() {
    const v = parseFloat(this.data.price)
    this.setData({
      showCalc: true,
      calcDisplay: v > 0 ? String(v) : '0',
      calcAcc: null,
      calcOp: null,
      calcFresh: true
    })
  },

  closeCalc() {
    this.setData({ showCalc: false })
  },

  calcKey(e) {
    const k = e.currentTarget.dataset.k
    const st = this.data
    let d = st.calcDisplay

    if (k === 'C') {
      this.setData({ calcDisplay: '0', calcAcc: null, calcOp: null, calcFresh: true })
      return
    }
    if (k === 'back') {
      if (!st.calcFresh) {
        d = d.length > 1 ? d.slice(0, -1) : '0'
        if (d === '-' || d === '') d = '0'
        this.setData({ calcDisplay: d })
      }
      return
    }
    if ('+−×÷'.indexOf(k) >= 0) {
      const cur = parseFloat(d) || 0
      const base = (st.calcAcc !== null && st.calcOp) ? round10(calcApply(st.calcAcc, cur, st.calcOp)) : cur
      this.setData({ calcAcc: base, calcOp: k, calcFresh: true, calcDisplay: String(base) })
      return
    }
    if (k === '=') {
      if (st.calcOp !== null && st.calcAcc !== null) {
        const cur = parseFloat(d) || 0
        const r = round10(calcApply(st.calcAcc, cur, st.calcOp))
        this.setData({ calcDisplay: String(r), calcAcc: null, calcOp: null, calcFresh: true })
      }
      return
    }
    // 数字 / 小数点
    if (st.calcFresh) {
      this.setData({ calcDisplay: k === '.' ? '0.' : k, calcFresh: false })
      return
    }
    if (k === '.') {
      if (d.indexOf('.') >= 0) return
      d += '.'
    } else {
      if (d === '0') d = k
      else if (d.replace('-', '').replace('.', '').length < 10) d += k
    }
    this.setData({ calcDisplay: d })
  },

  applyCalc() {
    const v = parseFloat(this.data.calcDisplay) || 0
    this.setData({ price: v > 0 ? String(v) : '', showCalc: false }, () => {
      this.setData({ canSave: !!this.data.name.trim() && v > 0 })
      this._updateNeed()
    })
  },

  save() {
    const { name, price, buyDate, category, platform, currency, note, icon, targetDaily } = this.data
    const p = parseFloat(price)
    if (!name.trim()) {
      wx.showToast({ title: '请填写物品名称', icon: 'none' })
      return
    }
    if (!(p > 0)) {
      wx.showToast({ title: '请填写有效价格', icon: 'none' })
      return
    }
    const target = Number(targetDaily) > 0 ? Number(targetDaily) : 0
    if (this.data.isEdit && this.editId) {
      store.updateItem(this.editId, {
        name: name.trim(), price: p, buyDate, category, platform, currency, note, icon, targetDaily: target
      })
      wx.showToast({ title: '已保存修改', icon: 'success' })
    } else {
      store.addItem({ name: name.trim(), price: p, buyDate, category, platform, currency, note, icon, targetDaily: target })
      wx.showToast({ title: '已记录', icon: 'success' })
    }
    setTimeout(() => wx.navigateBack(), 500)
  }
})
