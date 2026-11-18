const store = require('../../utils/store')
const cats = require('../../utils/cats')

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
const tagsUtil = require('../../utils/tags')
const icons = require('../../utils/icons')

function today() {
  const d = new Date()
  const p = (n) => (n < 10 ? '0' + n : '' + n)
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}

Page({
  data: {
    tab: 'info', // info | cost
    // 基本信息
    icon: null,
    name: '',
    price: '',
    currency: 'CNY',
    currencies: store.CURRENCIES,
    buyDate: '',
    maxDate: '',
    category: '手机通讯',
    categoryGroup: '电子数码',
    catName: '手机通讯',
    categories: store.CATEGORIES,
    showCatPanel: false,
    catKeyword: '',
    catGroups: [],
    displayGroups: [],
    tags: [],
    tagInput: '',
    showTagPanel: false,
    tagKeyword: '',
    userTags: [],
    tempTags: [],
    // 计价方式
    pricingDaily: true,
    expectedRetire: '',
    recycle: false,
    // 使用记录
    useEnabled: false,
    uses: '',
    // 使用时间
    startUseDate: '',
    // 服役状态
    inService: true,
    valuation: '',
    // 期限信息
    warrantyEnabled: false,
    warrantyDate: '',
    // 额外信息
    platform: 'other',
    platformName: '其他',
    platformChips: [],
    location: '',
    // 备注
    note: '',
    photos: [],
    // 图标选择面板
    showIconPanel: false,
    iconCat: 'all',
    iconKeyword: '',
    iconGroups: [],
    showCal: false,
    dateField: '',
    calValue: '',
    iconAllGroups: [],
    // 成本与关联（附加收支）
    extras: [],
    extraType: '支出',
    extraName: '',
    extraAmount: '',
    extraDate: '',
    // 价格与外币
    fxSheet: false,
    fxCurrency: 'USD',
    fxPrice: '',
    fxRate: store.rateOf('USD'),
    fxConvertedText: '0.0',
    fxEditing: '',
    // 计算器
    showCalc: false,
    calcTarget: 'price',
    calcDisplay: '0',
    calcAcc: null,
    calcOp: null,
    calcFresh: true
  },

  onLoad() {
    const t = today()
    this.setData({
      buyDate: t,
      maxDate: '',
      extraDate: t,
      catGroups: cats.getGroups(),
      platformChips: store.PLATFORMS.map((p) => Object.assign({}, p, { char: store.getPlatformChar(p.key) }))
    })
    this.filterIcons()
  },

  /* ---------- 日历选择 ---------- */

  openDate(e) {
    const field = e.currentTarget.dataset.f
    this.setData({ dateField: field, calValue: this.data[field] || '', showCal: true })
  },

  onCalSelect(e) {
    const field = this.data.dateField
    if (!field) return
    const patch = {}
    patch[field] = e.detail.date
    if (field === 'buyDate') patch.buyDateCN = fmtCN(e.detail.date)
    this.setData(Object.assign({ showCal: false }, patch))
  },

  closeCal() {
    this.setData({ showCal: false })
  },

  /* ---------- 选择分类面板（大分类 → 子分类） ---------- */

  openCatPanel() {
    this.setData({ showCatPanel: true, catKeyword: '', catGroups: cats.getGroups() }, () => this._buildDisplay())
  },

  closeCatPanel() {
    this.setData({ showCatPanel: false })
  },

  noop() {},

  onCatSearch(e) {
    const q = (e.detail.value || '').trim()
    this.setData({ catKeyword: q }, () => this._buildDisplay())
  },

  /** 右栏展示数据：子分类附图标 */
  _buildDisplay() {
    const groups = cats.getGroups()
    const q = this.data.catKeyword
    let gs = groups
    if (q) {
      gs = groups
        .map((g) => ({ name: g.name, icon: g.icon, subs: g.subs.filter((x) => x.includes(q)) }))
        .filter((g) => g.subs.length)
    } else {
      gs = groups.filter((g) => g.name === this.data.categoryGroup)
    }
    const display = gs.map((g) => ({
      name: g.name,
      icon: g.icon,
      subs: g.subs.map((x) => ({ name: x, icon: cats.getSubIcon(x, g.icon) }))
    }))
    this.setData({ displayGroups: display })
  },

  /** 点大分类：切换右侧子分类列表 */
  setCatGroup(e) {
    this.setData({ categoryGroup: e.currentTarget.dataset.name, catKeyword: '' }, () => this._buildDisplay())
  },

  /** 点子分类：选中并关闭 */
  setSub(e) {
    const sub = e.currentTarget.dataset.sub
    const group = e.currentTarget.dataset.group
    this.setData({
      category: sub,
      categoryGroup: group,
      catName: sub,
      showCatPanel: false
    })
  },

  /** 跳转分类管理 */
  goCatManage() {
    wx.navigateTo({ url: '/pages/catmanage/catmanage' })
  },

  /* ---------- 图标选择面板 ---------- */

  openIconPanel() {
    this.setData({ showIconPanel: true, iconKeyword: '' }, () => this.filterIcons())
  },

  closeIconPanel() {
    this.setData({ showIconPanel: false })
  },

  noop() {},

  setIconCat(e) {
    this.setData({ iconCat: e.currentTarget.dataset.name }, () => this.filterIcons())
  },

  onIconSearch(e) {
    this.setData({ iconKeyword: e.detail.value }, () => this.filterIcons())
  },

  filterIcons() {
    const q = this.data.iconKeyword
    // 侧栏永远显示全量分类；过滤只影响右侧网格
    this.setData({
      iconAllGroups: icons.GROUPS_3D,
      iconGroups: icons.searchGroups(q).filter(
        (g) => !q && this.data.iconCat !== 'all' ? g.name === this.data.iconCat : true
      )
    })
  },

  /** 图库 / 拍照 */
  pickPhoto(e) {
    const src = e.currentTarget.dataset.src === 'camera' ? ['camera'] : ['album']
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: src,
      sizeType: ['compressed'],
      success: (r) => {
        const tmp = r.tempFiles[0].tempFilePath
        const saved = `${wx.env.USER_DATA_PATH}/fi_${Date.now()}.png`
        wx.getFileSystemManager().saveFile({
          tempFilePath: tmp,
          filePath: saved,
          success: () => this.setData({ icon: saved, showIconPanel: false }),
          fail: () => this.setData({ icon: tmp, showIconPanel: false })
        })
      }
    })
  },

  /** 选中 3D 图标 */
  pickIcon(e) {
    this.setData({ icon: e.currentTarget.dataset.src, showIconPanel: false })
  },

  setTab(e) {
    this.setData({ tab: e.currentTarget.dataset.tab })
  },

  /* ---------- 基本信息 ---------- */
  onName(e) {
    this.setData({ name: e.detail.value })
  },

  onPrice(e) {
    this.setData({ price: e.detail.value })
  },

  onCurrency(e) {
    this.setData({ currency: e.currentTarget.dataset.key })
  },

  onDate(e) {
    this.setData({ buyDate: e.detail.value })
  },

  onCat(e) {
    this.setData({ category: e.currentTarget.dataset.key })
  },

  onTagInput(e) {
    this.setData({ tagInput: e.detail.value })
  },

  /* ---------- 选择标签面板 ---------- */

  openTagPanel() {
    this.setData({
      showTagPanel: true,
      tagKeyword: '',
      userTags: tagsUtil.getTags(),
      tempTags: this.data.tags.slice()
    })
  },

  closeTagPanel() {
    this.setData({ showTagPanel: false })
  },

  onTagKeyword(e) {
    this.setData({ tagKeyword: e.detail.value })
  },

  toggleTempTag(e) {
    const t = e.currentTarget.dataset.t
    const list = this.data.tempTags.slice()
    const i = list.indexOf(t)
    if (i >= 0) list.splice(i, 1)
    else list.push(t)
    this.setData({ tempTags: list })
  },

  applyTags() {
    this.setData({ tags: this.data.tempTags.slice(), showTagPanel: false })
  },

  /** 面板内新建标签 */
  newTag() {
    wx.showModal({
      title: '新建标签',
      editable: true,
      placeholderText: '输入标签名',
      success: (m) => {
        if (!m.confirm || !m.content || !m.content.trim()) return
        const t = m.content.trim()
        if (tagsUtil.addTag(t)) {
          this.setData({
            userTags: tagsUtil.getTags(),
            tempTags: this.data.tempTags.concat(t)
          })
        } else {
          wx.showToast({ title: '标签已存在', icon: 'none' })
        }
      }
    })
  },

  goTagManage() {
    wx.navigateTo({ url: '/pages/tagmanage/tagmanage' })
  },

  addTag() {
    const t = (this.data.tagInput || '').trim()
    if (!t) return
    if (this.data.tags.indexOf(t) >= 0 || this.data.tags.length >= 8) {
      this.setData({ tagInput: '' })
      return
    }
    this.setData({ tags: this.data.tags.concat(t), tagInput: '' })
  },

  removeTag(e) {
    const i = e.currentTarget.dataset.i
    const tags = this.data.tags.slice()
    tags.splice(i, 1)
    this.setData({ tags })
  },

  /* ---------- 开关们 ---------- */
  onPricingDaily(e) {
    this.setData({ pricingDaily: e.detail.value })
  },

  onExpectedRetire(e) {
    this.setData({ expectedRetire: e.detail.value })
  },

  onRecycle(e) {
    this.setData({ recycle: e.detail.value })
  },

  onUseEnabled(e) {
    this.setData({ useEnabled: e.detail.value })
  },

  onUses(e) {
    this.setData({ uses: e.detail.value })
  },

  onStartUse(e) {
    this.setData({ startUseDate: e.detail.value })
  },

  onInService(e) {
    this.setData({ inService: e.detail.value })
  },

  onValuation(e) {
    this.setData({ valuation: e.detail.value })
  },

  onWarrantyEnabled(e) {
    this.setData({ warrantyEnabled: e.detail.value })
  },

  onWarrantyDate(e) {
    this.setData({ warrantyDate: e.detail.value })
  },

  /* ---------- 额外信息 ---------- */
  onPlatform(e) {
    const key = e.currentTarget.dataset.key
    this.setData({ platform: key, platformName: store.getPlatformName(key) })
  },

  onLocation(e) {
    this.setData({ location: e.detail.value })
  },

  /* ---------- 备注 ---------- */
  onNote(e) {
    this.setData({ note: e.detail.value })
  },

  addPhoto() {
    wx.chooseMedia({
      count: 3 - this.data.photos.length,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (r) => {
        const fs = wx.getFileSystemManager()
        const saved = r.tempFiles.map((f, i) => {
          const p = `${wx.env.USER_DATA_PATH}/fp_${Date.now()}_${i}.png`
          try { fs.saveFileSync(f.tempFilePath, p) } catch (err) { return f.tempFilePath }
          return p
        })
        this.setData({ photos: this.data.photos.concat(saved).slice(0, 3) })
      }
    })
  },

  removePhoto(e) {
    const i = e.currentTarget.dataset.i
    const photos = this.data.photos.slice()
    photos.splice(i, 1)
    this.setData({ photos })
  },

  /* ---------- 购买价格：汇率与计算器 ---------- */

  onCurrency(e) {
    const key = e.currentTarget.dataset.key
    this.setData({ currency: key, symbol: store.currencySymbol(key) })
  },

  openFxSheet() {
    const fxCurrency = this.data.currency === 'CNY' ? 'USD' : this.data.currency
    this.setData({
      fxSheet: true,
      fxCurrency,
      fxRate: store.rateOf(fxCurrency),
      fxPrice: this.data.fxPrice || ''
    }, () => this._syncFxConverted())
  },

  closeFxSheet() {
    this.setData({ fxSheet: false })
  },

  cycleFx() {
    const list = store.CURRENCIES.filter((c) => c.key !== 'CNY')
    const i = list.findIndex((c) => c.key === this.data.fxCurrency)
    const next = list[(i + 1) % list.length]
    this.setData({ fxCurrency: next.key, fxRate: store.rateOf(next.key) }, () => this._syncFxConverted())
  },

  onFxPrice(e) {
    this.setData({ fxPrice: e.detail.value, fxEditing: 'fx' }, () => this._syncFxConverted())
  },

  /** 折合本位币可输入：反推外币原价 */
  onFxConverted(e) {
    const v = parseFloat(e.detail.value) || 0
    this.setData({
      fxEditing: 'cny',
      fxConvertedText: e.detail.value,
      fxPrice: v > 0 ? String(round10(v / this.data.fxRate)) : ''
    })
  },

  /** 折合本位币（实时，文本在 JS 算好，WXML 不做方法调用） */
  _syncFxConverted() {
    if (this.data.fxEditing === 'cny') return
    const v = (parseFloat(this.data.fxPrice) || 0) * this.data.fxRate
    this.setData({ fxConvertedText: v.toFixed(2) })
  },

  confirmFx() {
    const fx = parseFloat(this.data.fxPrice) || 0
    const converted = round10(fx * this.data.fxRate)
    if (!(fx > 0)) {
      wx.showToast({ title: '请填写外币原价', icon: 'none' })
      return
    }
    // 外币仅作记录：入账统一按人民币折算价
    this.setData({
      currency: 'CNY',
      symbol: '¥',
      price: String(converted),
      fxSheet: false,
      fxEditing: ''
    })
  },

  /* ---------- 计算器 ---------- */

  openCalc(e) {
    const t = (e && e.currentTarget && e.currentTarget.dataset.t) || 'price'
    let cur = '0'
    if (t === 'price') cur = this.data.price || '0'
    if (t === 'fx') cur = this.data.fxPrice || '0'
    if (t === 'cny') cur = this.data.fxConvertedText || '0'
    this.setData({ showCalc: true, calcTarget: t, calcDisplay: cur, calcAcc: null, calcOp: null, calcFresh: true })
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
    const t = this.data.calcTarget
    if (t === 'fx') {
      this.setData({ fxPrice: v > 0 ? String(v) : '', showCalc: false, fxEditing: 'fx' }, () => this._syncFxConverted())
    } else if (t === 'cny') {
      this.setData({ fxConvertedText: v > 0 ? v.toFixed(2) : '0.0', fxPrice: v > 0 ? String(round10(v / this.data.fxRate)) : '', showCalc: false })
    } else {
      this.setData({ price: v > 0 ? String(v) : '', showCalc: false }, () => this._updateNeed())
    }
  },

  /* ---------- 附加收支 ---------- */
  setExtraType(e) {
    this.setData({ extraType: e.currentTarget.dataset.t })
  },

  onExtraName(e) {
    this.setData({ extraName: e.detail.value })
  },

  onExtraAmount(e) {
    this.setData({ extraAmount: e.detail.value })
  },

  onExtraDate(e) {
    this.setData({ extraDate: e.detail.value })
  },

  addExtra() {
    const { extraType, extraName, extraAmount, extraDate } = this.data
    const a = parseFloat(extraAmount)
    if (!a || a <= 0) {
      wx.showToast({ title: '请填写有效金额', icon: 'none' })
      return
    }
    this.setData({
      extras: this.data.extras.concat({
        type: extraType, name: (extraName || '').trim(), amount: a, date: extraDate
      }),
      extraName: '',
      extraAmount: ''
    })
  },

  removeExtra(e) {
    const i = e.currentTarget.dataset.i
    const extras = this.data.extras.slice()
    extras.splice(i, 1)
    this.setData({ extras })
  },

  /* ---------- 保存 ---------- */
  save() {
    const d = this.data
    if (!d.name.trim()) {
      wx.showToast({ title: '请填写物品名称', icon: 'none' })
      return
    }
    const p = parseFloat(d.price)
    if (!(p > 0)) {
      wx.showToast({ title: '请填写有效价格', icon: 'none' })
      return
    }
    const extra = {
      categoryGroup: d.categoryGroup || '其他',
      fxCurrency: d.fxCurrency,
      fxPrice: parseFloat(d.fxPrice) || 0,
      fxRate: d.fxRate,
      tags: d.tags,
      pricingDaily: d.pricingDaily,
      expectedRetireDate: d.expectedRetire,
      recycle: d.recycle,
      useCountEnabled: d.useEnabled,
      uses: d.useEnabled ? (parseInt(d.uses) || 0) : 0,
      startUseDate: d.startUseDate,
      inService: d.inService,
      valuation: parseFloat(d.valuation) || 0,
      warrantyEnabled: d.warrantyEnabled,
      warrantyDate: d.warrantyDate,
      location: (d.location || '').trim(),
      photos: d.photos,
      extras: d.extras
    }
    store.addItem({
      name: d.name.trim(),
      price: p,
      buyDate: d.buyDate,
      category: d.category,
      platform: d.platform,
      currency: d.currency,
      icon: d.icon,
      note: d.note,
      extra
    })
    wx.showToast({ title: '已详细记录', icon: 'success' })
    setTimeout(() => wx.navigateBack(), 500)
  }
})
