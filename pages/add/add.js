const store = require('../../utils/store')
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
    uses: '',
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
    icon3dList: []
  },

  onLoad(query) {
    const d = new Date()
    const p = (n) => (n < 10 ? '0' + n : '' + n)
    const today = d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
    this.setData({ buyDate: today, maxDate: today })

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
          uses: it.uses ? String(it.uses) : '',
          targetDaily: it.targetDaily > 0 ? String(it.targetDaily) : '',
          canSave: true,
          isEdit: true
        })
        wx.setNavigationBarTitle({ title: '编辑物品' })
        this._updateNeed()
      }
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
    this.setData({ buyDate: e.detail.value }, () => this._updateNeed())
  },

  onCat(e) {
    this.setData({ category: e.currentTarget.dataset.key })
  },

  onPlatform(e) {
    this.setData({ platform: e.currentTarget.dataset.key }, () => this.updatePlatformChips())
  },

  onCurrency(e) {
    this.setData({ currency: e.currentTarget.dataset.key })
  },

  onUses(e) {
    this.setData({ uses: e.detail.value })
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

  save() {
    const { name, price, buyDate, category, platform, currency, note, icon, targetDaily, uses } = this.data
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
      const patch = {
        name: name.trim(), price: p, buyDate, category, platform, currency, note, icon, targetDaily: target
      }
      // 使用次数：填了才覆盖，留空保留已有计数
      if (uses !== '') {
        patch.uses = parseInt(uses) || 0
      }
      store.updateItem(this.editId, patch)
      wx.showToast({ title: '已保存修改', icon: 'success' })
    } else {
      store.addItem({ name: name.trim(), price: p, buyDate, category, platform, currency, note, icon, targetDaily: target, uses })
      wx.showToast({ title: '已记录', icon: 'success' })
    }
    setTimeout(() => wx.navigateBack(), 500)
  }
})
