const store = require('../../utils/store')
const reminders = require('../../utils/reminders')
const lock = require('../../utils/lock')

Page({
  data: {
    item: null,
    missing: false,
    daily: '',
    monthly: '',
    days: 0,
    endDate: '',
    // 行内编辑
    editField: '',
    editValue: '',
    editNum: false,
    amountHidden: false,
    // 更多信息折叠（默认收起，有到期项时自动展开一次）
    showMore: false,
    moreCount: 0,
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

    if (lock.guard()) return
    this.refresh()
  },

  fmtDate(d) {
    const p = (n) => (n < 10 ? '0' + n : '' + n)
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
  },

  refresh() {
    const it = store.getById(this.id)
    if (!it) {
      // 直接停在空白页是最糟的体验：给一个明确出口
      this.setData({ missing: true })
      wx.showToast({ title: '物品不存在', icon: 'none' })
      setTimeout(() => {
        const pages = getCurrentPages()
        if (pages.length > 1) wx.navigateBack()
        else wx.switchTab({ url: '/pages/index/index' }) // 栈底就没页可回，转首页
      }, 700)
      return
    }
    const today = this.fmtDate(new Date())
    const retired = it.retired
    const amountHidden = !!wx.getStorageSync('amountHidden')
    const sold = !!it.sold
    const profit = sold ? it.soldPrice - it.price : 0
    const be = store.breakEven(it)
    this.setData({
      amountHidden,
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
        // 消耗品与周期保养
        consumable: !!it.consumable,
        useUpDays: Number(it.useUpDays) || 0,
        lastRestockDate: it.lastRestockDate || '',
        restockDate: store.restockDate(it),
        restockOverdue: !!store.restockDate(it) && store.restockDate(it) < this.fmtDate(new Date()),
        maintenanceEvery: Number(it.maintenanceEvery) || 0,
        lastMaintenanceDate: it.lastMaintenanceDate || '',
        maintenanceDate: store.maintenanceDate(it),
        brand: it.brand || '',
        color: it.color || '',
        season: it.season || '',
        extras: it.extras || [],
        hasExtras: !!(it.extras && it.extras.length),
        extrasTotal: it.extras ? store.fmtMoney(it.extras.reduce((s, x) => s + (x.type === '收入' ? -x.amount : x.amount), 0)) : '0',
        // 次均成本（总成本 / 使用次数）
        uses: it.uses || 0,
        perUse: (it.uses || 0) > 0 ? store.fmtMoney(store.perUseCost(it)) : '',
        totalCost: store.fmtMoney(store.totalCost(it)),
        fxRecorded: !!(it.fxCurrency && it.fxPrice)
      },
      moreCount:
        1 +
        (it.warrantyEnabled ? 1 : 0) +
        (it.location ? 1 : 0) +
        (it.extras && it.extras.length ? 1 : 0) +
        (it.photos && it.photos.length ? 1 : 0) +
        (it.consumable || it.maintenanceEvery ? 1 : 0),
      days: store.daysHeld(it),
      daily: store.fmtMoney(store.dailyCost(it)),
      // 顶层也挂一份，供双引擎卡直接引用（之前只写在 item 内导致永远为空）
      uses: it.uses || 0,
      perUse: (it.uses || 0) > 0 ? store.fmtMoney(store.perUseCost(it)) : '',
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
    if (!this._expandChecked) {
      this._expandChecked = true
      const pend = reminders.getReminders().some((r) => r.itemId === it.id)
      if (pend && !this.data.showMore) this.setData({ showMore: true })
    }
    wx.setNavigationBarTitle({ title: it.name })
  },

  /** 设置 / 修改目标日均 */
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

  goHome() {
    wx.switchTab({ url: '/pages/index/index' })
  },

  /**
   * 消耗品补货：记下花费并顺延下次补货日
   * 补货支出写进 extras → totalCost 自动累加，日均跟着变（成本闭环不破）
   */
  restock() {
    const it = store.getById(this.id)
    if (!it) return
    const sym = store.currencySymbol(it.currency)
    wx.showModal({
      title: '记一次补货',
      editable: true,
      placeholderText: '本次花了多少 ' + sym + '？留空 = 没花钱',
      confirmText: '记上',
      success: (r) => {
        if (!r.confirm) return
        const today = this.fmtDate(new Date())
        const amount = parseFloat(r.content)
        const extras = (it.extras || []).slice()
        if (amount > 0) extras.push({ type: '支出', name: '补货', amount, date: today })
        store.updateItem(this.id, {
          extras,
          lastRestockDate: today,
          consumable: true,
          useUpDays: it.useUpDays || 30
        })
        this.refresh()
        const nt = store.getById(this.id)
        wx.showToast({
          title: '下次补货 ' + (store.restockDate(nt) || '—'),
          icon: 'none'
        })
      }
    })
  },

  /** 保养/换芯完成：记今天并顺延下次 */
  maintenanceDone() {
    const it = store.getById(this.id)
    if (!it) return
    wx.showModal({
      title: '这次保养花了多少？',
      editable: true,
      placeholderText: '留空 = 自己做的没花钱',
      confirmText: '已完成',
      success: (r) => {
        if (!r.confirm) return
        const today = this.fmtDate(new Date())
        const amount = parseFloat(r.content)
        const extras = (it.extras || []).slice()
        if (amount > 0) extras.push({ type: '支出', name: '保养', amount, date: today })
        const patch = { extras, lastMaintenanceDate: today }
        if (!it.maintenanceEvery) patch.maintenanceEvery = 180
        store.updateItem(this.id, patch)
        this.refresh()
        wx.showToast({
          title: '下次 ' + (store.maintenanceDate(store.getById(this.id)) || '—'),
          icon: 'none'
        })
      }
    })
  },

  toggleMore() {
    this.setData({ showMore: !this.data.showMore })
  },

  /* ---------- 行内编辑：数值 / 文本 ---------- */

  /** 点字段原地变输入框（数据单一来源：editField） */
  startEdit(e) {
    const field = e.currentTarget.dataset.f
    const it = store.getById(this.id)
    if (!it || !field) return
    if (field === this.data.editField) return // 输入框冒泡上来的点击，忽略
    const cur = it[field] === undefined || it[field] === null ? '' : String(it[field])
    this._num = this._num || {}
    this._num[field] = e.currentTarget.dataset.n === '1'
    this._closed = '' // 本次编辑允许提交一次
    this.setData({
      editField: field,
      editValue: cur,
      editNum: this._num[field]
    })
  },

  onEditInput(e) {
    this.setData({ editValue: e.detail.value })
  },

  /**
   * blur 与 confirm 会对同一次编辑连着触发两次。
   * 值一律从事件本身取（提交后 editValue 会被清空，再读第二次就成了空值→把字段刷没）；
   * 去重按「本次编辑只提交一次」，不靠 editField 判重（先点别的行时 editField 已变，输入会被丢掉）。
   */
  commitEdit(e) {
    const field = e.currentTarget.dataset.f
    if (!field || this._closed === field) return
    const fromEvent = e.detail && e.detail.value !== undefined ? e.detail.value : null
    const raw = String(fromEvent === null ? this.data.editValue : fromEvent).trim()
    const isNum = this._num && this._num[field] !== undefined
      ? this._num[field]
      : field !== 'note' && field !== 'location'
    const patch = {}

    if (isNum) {
      if (raw === '') {
        patch[field] = 0
      } else {
        const n = parseFloat(raw)
        if (!(n >= 0)) {
          wx.showToast({ title: '填个不小于 0 的数字', icon: 'none' })
          this.setData({ editField: '', editValue: '' })
          return
        }
        patch[field] = field === 'uses' ? parseInt(n, 10) : n
      }
    } else {
      patch[field] = raw
    }
    if (field === 'uses' && patch.uses > 0) patch.useCountEnabled = true
    if (field === 'targetDaily') {
      // 设目标时已达标的老物品：静默标记已庆祝，避免以后弹窗突袭
      const it = store.getById(this.id)
      const be = store.breakEven(Object.assign({}, it, { targetDaily: patch.targetDaily }))
      if (be && be.reached) patch.celebrated = true
    }

    this._closed = field
    this.setData({ editField: '', editValue: '' })
    store.updateItem(this.id, patch)
    this.refresh()
    wx.showToast({ title: raw === '' ? '已清除' : '已更新', icon: 'success' })
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
