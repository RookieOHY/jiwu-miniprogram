const store = require('../../utils/store')

Page({
  data: {
    item: null,
    daily: '',
    monthly: '',
    days: 0,
    endDate: '',
    // 行内日期编辑
    showDate: false,
    dateField: '',
    dateValue: ''
  },

  onLoad(query) {
    this.id = query.id
    this.maxDate = this.fmtDate(new Date())
  },

  onShow() {
    this.refresh()
  },

  fmtDate(d) {
    const p = (n) => (n < 10 ? '0' + n : '' + n)
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
  },

  refresh() {
    const it = store.getById(this.id)
    if (!it) {
      wx.showToast({ title: '物品不存在', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 600)
      return
    }
    const today = this.fmtDate(new Date())
    const retired = it.retired
    const sold = !!it.sold
    const profit = sold ? it.soldPrice - it.price : 0
    const be = store.breakEven(it)
    this.setData({
      item: {
        id: it.id,
        name: it.name,
        price: store.fmtMoney(it.price),
        qty: Math.max(1, parseInt(it.qty) || 1),
        unitPrice: store.fmtMoney(store.unitPrice(it)),
        buyDate: it.buyDate,
        category: it.category,
        catName: store.getCategoryName(it.category),
        platformName: store.getPlatformName(it.platform),
        symbol: store.currencySymbol(it.currency),
        note: it.note,
        pinned: !!it.pinned,
        retired: retired,
        sold: sold,
        soldDate: it.soldDate || null,
        soldPrice: sold ? store.fmtMoney(it.soldPrice) : '',
        profit: store.fmtMoney(Math.abs(profit)),
        profitSign: profit >= 0 ? '+' : '-',
        // 详细添加的新字段
        categoryGroup: it.categoryGroup || '',
        tags: it.tags || [],
        startUseDate: it.startUseDate || '',
        expectedRetireDate: it.expectedRetireDate || '',
        recycle: !!it.recycle,
        pricingDaily: it.pricingDaily !== false,
        inService: it.inService !== undefined ? it.inService : true,
        valuation: it.valuation ? store.fmtMoney(it.valuation) : '',
        warrantyEnabled: !!it.warrantyEnabled,
        warrantyDate: it.warrantyDate || '',
        location: it.location || '',
        photos: it.photos || [],
        extras: it.extras || [],
        hasExtras: !!(it.extras && it.extras.length),
        extrasTotal: it.extras ? store.fmtMoney(it.extras.reduce((s, x) => s + (x.type === '收入' ? -x.amount : x.amount), 0)) : '0',
        // 次均成本（总成本 / 使用次数）
        uses: it.uses || 0,
        perUse: (it.uses || 0) > 0 ? store.fmtMoney(store.perUseCost(it)) : '',
        totalCost: store.fmtMoney(store.totalCost(it)),
        fxRecorded: !!(it.fxCurrency && it.fxPrice)
      },
      days: store.daysHeld(it),
      daily: store.fmtMoney(store.dailyCost(it)),
      // 摊销预测：一次性购入的物品，持有越久日均越低
      daily30: store.fmtMoney(it.price / 30),
      daily365: store.fmtMoney(it.price / 365),
      endDate: it.retired && it.retiredDate ? it.retiredDate : today,
      maxDate: this.maxDate,
      // 回本进度（未设目标时 be 为 null）
      be: be ? {
        symbol: store.currencySymbol(it.currency),
        target: store.fmtMoney(be.target),
        need: be.need,
        due: be.due,
        pct: be.pct,
        reached: be.reached,
        left: Math.max(0, be.need - be.held)
      } : null
    })
    wx.setNavigationBarTitle({ title: it.name })
  },

  /** 设置 / 修改目标日均 */
  setTarget() {
    const it = store.getById(this.id)
    const cur = it.targetDaily > 0 ? String(it.targetDaily) : ''
    wx.showModal({
      title: '目标日均',
      editable: true,
      placeholderText: '每天想摊到多少？如 1',
      content: cur,
      confirmText: '保存',
      success: (r) => {
        if (!r.confirm) return
        const t = Number(r.content)
        if (!(t > 0)) {
          wx.showToast({ title: '填个大于 0 的数字', icon: 'none' })
          return
        }
        // 设置时已达标的老物品：静默标记已庆祝，避免以后弹窗突袭
        const be = store.breakEven(Object.assign({}, it, { targetDaily: t }))
        const patch = { targetDaily: t }
        if (be && be.reached) patch.celebrated = true
        store.updateItem(this.id, patch)
        this.refresh()
      }
    })
  },

  /** 退役：结束计时，锁定最终日均 */
  retire() {
    const it = store.getById(this.id)
    const today = this.fmtDate(new Date())
    wx.showModal({
      title: '确认退役？',
      content: `将停止日均计算，最终日均 ${store.currencySymbol(it.currency)}${store.fmtMoney(store.dailyCost(it))}`,
      confirmText: '退役',
      success: (r) => {
        if (r.confirm) {
          store.updateItem(this.id, { retired: true, retiredDate: today })
          this.refresh()
          wx.showToast({ title: '已退役', icon: 'success' })
        }
      }
    })
  },

  /* ---------- 行内编辑：数值 / 文本 ---------- */

  _editText(field, title, placeholder, isNumber) {
    const it = store.getById(this.id)
    if (!it) return
    const cur = it[field] === undefined || it[field] === null ? '' : String(it[field])
    wx.showModal({
      title: title,
      editable: true,
      placeholderText: placeholder,
      content: cur,
      confirmText: '保存',
      success: (r) => {
        if (!r.confirm) return
        const raw = (r.content || '').trim()
        let val = raw
        if (isNumber) {
          const n = parseFloat(raw)
          if (raw === '' || !(n >= 0)) {
            wx.showToast({ title: '请填写有效数字', icon: 'none' })
            return
          }
          val = n
        }
        const patch = {}
        patch[field] = val
        if (field === 'uses') patch.useCountEnabled = true
        store.updateItem(this.id, patch)
        this.refresh()
        wx.showToast({ title: '已更新', icon: 'success' })
      }
    })
  },

  editNote() {
    this._editText('note', '备注', '写点使用感受、成色、注意事项', false)
  },

  editLocation() {
    this._editText('location', '存放位置', '如：书房抽屉 / 客厅电视柜', false)
  },

  editValuation() {
    this._editText('valuation', '当前估值（¥）', '现在还值多少钱', true)
  },

  editUses() {
    this._editText('uses', '已使用次数', '一共用过多少次', true)
  },

  /** 快捷记一次使用（今天用了一次） */
  addUse() {
    const it = store.getById(this.id)
    if (!it) return
    const today = this.fmtDate(new Date())
    store.updateItem(this.id, { uses: (it.uses || 0) + 1, useCountEnabled: true, lastUseDate: today })
    this.refresh()
    const nu = store.getById(this.id)
    const per = store.perUseCost(nu)
    wx.showToast({
      title: per !== null ? '已记 1 次 · 次均 ' + store.currencySymbol(nu.currency) + store.fmtMoney(per) : '已记 1 次',
      icon: 'none'
    })
  },

  /* ---------- 行内编辑：日期（复用日历组件） ---------- */

  openDate(e) {
    const field = e.currentTarget.dataset.f
    const it = store.getById(this.id)
    if (!it) return
    this.setData({
      showDate: true,
      dateField: field,
      dateValue: it[field] || this.fmtDate(new Date())
    })
  },

  closeDate() {
    this.setData({ showDate: false })
  },

  onDateSelect(e) {
    const field = this.data.dateField
    if (!field) return
    const patch = {}
    patch[field] = e.detail.date
    if (field === 'warrantyDate') patch.warrantyEnabled = true
    store.updateItem(this.id, patch)
    this.setData({ showDate: false })
    this.refresh()
    wx.showToast({ title: '已更新', icon: 'success' })
  },

  noop() {},

  /** 进入编辑页 */
  edit() {
    wx.navigateTo({ url: '/pages/fulladd/fulladd?id=' + this.id })
  },

  /** 标记卖出：记录卖出价与日期，日均锁定，可复盘真实成本 */
  sell() {
    const it = store.getById(this.id)
    const today = this.fmtDate(new Date())
    const sym = store.currencySymbol(it.currency)
    wx.showModal({
      title: '标记为已卖出',
      editable: true,
      placeholderText: '卖出价格（' + sym + '），不填视为 0',
      content: `持有 ${store.daysHeld(it)} 天，最终日均 ${sym}${store.fmtMoney(store.dailyCost(it))}`,
      confirmText: '卖出',
      success: (r) => {
        if (!r.confirm) return
        const p = parseFloat(r.content)
        const soldPrice = p > 0 ? p : 0
        store.updateItem(this.id, {
          sold: true,
          soldPrice: soldPrice,
          soldDate: today,
          retired: true,
          retiredDate: today
        })
        this.refresh()
        wx.showToast({ title: '已标记卖出', icon: 'success' })
      }
    })
  },

  unRetire() {
    wx.showModal({
      title: '恢复持有？',
      content: '将重新开始计算日均成本',
      success: (r) => {
        if (r.confirm) {
          store.updateItem(this.id, {
            retired: false,
            retiredDate: null,
            sold: false,
            soldPrice: null,
            soldDate: null
          })
          this.refresh()
        }
      }
    })
  },

  remove() {
    wx.showModal({
      title: '删除物品',
      content: '删除后无法恢复，确定删除？',
      confirmText: '删除',
      confirmColor: '#c05a4d',
      success: (r) => {
        if (r.confirm) {
          store.removeItem(this.id)
          wx.navigateBack()
        }
      }
    })
  }
})
