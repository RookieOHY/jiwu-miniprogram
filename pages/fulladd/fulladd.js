const store = require('../../utils/store')
const cats = require('../../utils/cats')
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
    tags: [],
    tagInput: '',
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
    iconAllGroups: [],
    // 成本与关联（附加收支）
    extras: [],
    extraType: '支出',
    extraName: '',
    extraAmount: '',
    extraDate: ''
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

  /* ---------- 选择分类面板（大分类 → 子分类） ---------- */

  openCatPanel() {
    this.setData({ showCatPanel: true, catKeyword: '', catGroups: cats.getGroups() })
  },

  closeCatPanel() {
    this.setData({ showCatPanel: false })
  },

  noop() {},

  onCatSearch(e) {
    const q = (e.detail.value || '').trim()
    const groups = cats.getGroups()
    if (!q) {
      this.setData({ catKeyword: '', catGroups: groups })
      return
    }
    this.setData({
      catKeyword: q,
      catGroups: groups
        .map((g) => ({ name: g.name, icon: g.icon, subs: g.subs.filter((x) => x.includes(q)) }))
        .filter((g) => g.subs.length)
    })
  },

  /** 点大分类：切换右侧子分类列表 */
  setCatGroup(e) {
    this.setData({ categoryGroup: e.currentTarget.dataset.name, catKeyword: '' })
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
