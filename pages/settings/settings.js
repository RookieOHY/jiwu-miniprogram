const store = require('../../utils/store')
const tabAnim = require('../../utils/tabAnim')
const backup = require('../../utils/backup')
const preview = require('../../utils/preview')
const reminders = require('../../utils/reminders')
const prefs = require('../../utils/prefs')
const lock = require('../../utils/lock')

const VIEW_OPTS = [
  { key: 'list', name: '列表' },
  { key: 'card', name: '卡片' },
  { key: 'cat', name: '分类' },
  { key: 'loc', name: '位置' }
]
const WARN_OPTS = [7, 15, 30, 60]
const DUST_OPTS = [30, 60, 90, 180]

Page({
  data: {
    demoCount: 0,
    reminderCount: 0,
    // 外观
    tabbarHideText: true,
    amountHidden: false,
    viewNames: VIEW_OPTS.map((v) => v.name),
    viewIndex: 0,
    // 提醒
    warnNames: WARN_OPTS.map((n) => n + ' 天'),
    warnIndex: 2,
    dustNames: DUST_OPTS.map((n) => n + ' 天'),
    dustIndex: 2,
    budgetAlert: true,
    warnDays: 30,
    dustDays: 90,
    // 隐私
    lockOn: false,
    lockBg: true,
    hasPin: false,
    // 汇率
    rateOpen: false,
    rates: []
  },

  onShow() {
    if (lock.guard()) return
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3, hideText: store.getTabbarHideText() })
    }
    this.sync()
    tabAnim(this)
  },

  /** 所有配置项从存储回读（从锁页/提醒页返回后保持最新） */
  sync() {
    const p = prefs.get()
    const idx = (arr, v) => {
      const i = arr.indexOf(v)
      return i < 0 ? 0 : i
    }
    this.setData({
      demoCount: preview.count(),
      reminderCount: reminders.countReminders(),
      tabbarHideText: store.getTabbarHideText(),
      amountHidden: !!wx.getStorageSync('amountHidden'),
      viewIndex: Math.max(0, VIEW_OPTS.findIndex((o) => o.key === p.defaultView)),
      warnIndex: idx(WARN_OPTS, p.warnDays),
      dustIndex: idx(DUST_OPTS, p.dustDays),
      warnDays: p.warnDays,
      dustDays: p.dustDays,
      budgetAlert: p.budgetAlert !== false,
      lockOn: lock.enabled(),
      lockBg: lock.onBackground(),
      hasPin: lock.hasPin(),
      rates: store.CURRENCIES.filter((c) => c.key !== 'CNY').map((c) => ({
        code: c.key,
        label: c.name,
        symbol: c.symbol,
        rate: String(store.rateOf(c.key))
      }))
    })
  },

  /* ---------------- 外观 ---------------- */

  /** 是否隐藏底部胶囊的文本（默认开启） */
  onTabbarHideText(e) {
    const v = e.detail.value
    this.setData({ tabbarHideText: v })
    wx.setStorageSync('tabbarHideText', v)
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ hideText: v })
    }
  },

  onAmountHidden(e) {
    const v = e.detail.value
    wx.setStorageSync('amountHidden', v)
    this.setData({ amountHidden: v })
  },

  onViewPick(e) {
    const o = VIEW_OPTS[Number(e.detail.value)]
    prefs.patch({ defaultView: o.key })
    this.setData({ viewIndex: Number(e.detail.value) })
  },

  /* ---------------- 提醒 ---------------- */

  onWarnPick(e) {
    const n = WARN_OPTS[Number(e.detail.value)]
    prefs.patch({ warnDays: n })
    this.setData({ warnIndex: Number(e.detail.value), warnDays: n })
  },

  onDustPick(e) {
    const n = DUST_OPTS[Number(e.detail.value)]
    prefs.patch({ dustDays: n })
    this.setData({ dustIndex: Number(e.detail.value), dustDays: n })
  },

  onBudgetAlert(e) {
    const v = e.detail.value
    prefs.patch({ budgetAlert: v })
    this.setData({ budgetAlert: v })
  },

  goReminders() {
    wx.navigateTo({ url: '/pages/reminders/reminders' })
  },

  /* ---------------- 隐私 ---------------- */

  /** 应用锁开关：没口令时先去设口令，设完自动开启 */
  onLockSwitch(e) {
    const v = e.detail.value
    if (v && !lock.hasPin()) {
      this.setData({ lockOn: false })
      wx.navigateTo({ url: '/pages/lock/lock?mode=set&enable=1' })
      return
    }
    lock.toggle(v)
    this.setData({ lockOn: lock.enabled() })
    wx.showToast({ title: v ? '应用锁已开启' : '应用锁已关闭', icon: 'none' })
    // 开着锁就当场演示一次，别让用户猜它到底生效没
    if (v) setTimeout(() => lock.guard(), 800)
  },

  goSetPin() {
    wx.navigateTo({ url: '/pages/lock/lock?mode=set&enable=' + (this.data.lockOn ? '1' : '0') })
  },

  onLockBg(e) {
    const v = e.detail.value
    lock.setOnBackground(v)
    this.setData({ lockBg: v })
  },

  privacyNote() {
    wx.showModal({
      title: '隐私说明',
      content:
        '· 所有数据只存在这台设备的微信里，不上传服务器\n' +
        '· 应用锁防的是随手翻看，口令为本地哈希，不是加密存储\n' +
        '· 忘记口令可直接重置，物品数据不会丢失\n' +
        '· 备份文件是明文，导出后请勿发送到群聊',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  /* ---------------- 汇率 ---------------- */

  toggleRates() {
    this.setData({ rateOpen: !this.data.rateOpen })
  },

  /** 汇率行内编辑：只写存储，不回写 input，避免打字时光标跳动 */
  onRateInput(e) {
    prefs.setRate(e.currentTarget.dataset.c, e.detail.value)
  },

  resetRates() {
    this.data.rates.forEach((r) => prefs.setRate(r.code, ''))
    this.sync()
    wx.showToast({ title: '已恢复默认汇率', icon: 'none' })
  },

  /* ---------------- 数据 ---------------- */

  loadDemo() {
    const added = preview.seed()
    this.setData({ demoCount: preview.count() })
    wx.showToast({ title: added ? '已载入 ' + added + ' 件演示物品' : '演示数据已存在', icon: 'none' })
  },

  clearDemo() {
    preview.clear()
    this.setData({ demoCount: 0 })
    wx.showToast({ title: '已清除演示数据', icon: 'none' })
  },

  backupMenu() {
    wx.showActionSheet({
      itemList: ['导出 JSON 文件（可恢复）', '导出 CSV 表格（Excel 可看）', '复制 JSON 到剪贴板', '从文件恢复数据'],
      success: (r) => {
        if (r.tapIndex === 0) this.exportFile('json')
        else if (r.tapIndex === 1) this.exportFile('csv')
        else if (r.tapIndex === 2) this.exportData()
        else this.importFile()
      }
    })
  },

  exportFile(kind) {
    if (!store.getAll().length) {
      wx.showToast({ title: '还没有数据可导出', icon: 'none' })
      return
    }
    wx.showModal({
      title: '备份为明文',
      content: '导出文件包含物品名称、价格、备注等全部数据，接收方能直接看到内容。请勿发送到群聊或陌生对话。',
      confirmText: '继续导出',
      success: (m) => {
        if (!m.confirm) return
        wx.showLoading({ title: '生成中' })
        backup.exportFile(kind, (err, name) => {
          wx.hideLoading()
          if (!err) wx.showToast({ title: '已生成 ' + name, icon: 'none' })
          else if (err === 'cancel') wx.showToast({ title: '已取消分享', icon: 'none' })
          else if (err === 'preview') wx.showToast({ title: '已打开文件', icon: 'none' })
          else wx.showToast({ title: '导出失败（模拟器不支持，请用真机）', icon: 'none' })
        })
      }
    })
  },

  /** 从聊天文件恢复 */
  importFile() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['json'],
      success: (r) => {
        const file = r.tempFiles[0]
        wx.getFileSystemManager().readFile({
          filePath: file.path,
          encoding: 'utf8',
          success: (res) => {
            const obj = backup.parse(res.data)
            if (!obj) {
              wx.showToast({ title: '不是有效的备份文件', icon: 'none' })
              return
            }
            wx.showModal({
              title: '恢复方式',
              content: '备份含 ' + obj.items.length + ' 件物品。\n「合并」保留现有数据、只补新记录；\n「覆盖」用备份完全替换当前数据。',
              confirmText: '合并',
              cancelText: '覆盖',
              success: (m) => {
                const out = m.confirm ? backup.merge(obj) : backup.replace(obj)
                wx.showToast({ title: (m.confirm ? '合并' : '覆盖') + '完成：' + out.total + ' 件', icon: 'none' })
                this.sync()
              }
            })
          },
          fail: () => wx.showToast({ title: '读取文件失败', icon: 'none' })
        })
      }
    })
  },

  /** 导出全部数据：JSON 复制到剪贴板 */
  exportData() {
    const items = store.getAll()
    if (!items.length) {
      wx.showToast({ title: '还没有数据可导出', icon: 'none' })
      return
    }
    const payload = {
      app: '记物',
      exportedAt: new Date().toISOString(),
      count: items.length,
      items
    }
    wx.setClipboardData({
      data: JSON.stringify(payload, null, 2),
      success: () => wx.showToast({ title: '已复制到剪贴板', icon: 'none' })
    })
  },

  /** 清空全部数据（二次确认） */
  clearData() {
    const count = store.getAll().length
    if (!count) {
      wx.showToast({ title: '当前没有数据', icon: 'none' })
      return
    }
    wx.showModal({
      title: '清空全部数据',
      content: '共 ' + count + ' 件物品记录将被删除，且无法恢复。确定清空？',
      confirmText: '清空',
      confirmColor: '#c05a4d',
      success: (m) => {
        if (m.confirm) {
          wx.setStorageSync('items', [])
          this.sync()
          wx.showToast({ title: '已清空', icon: 'none' })
        }
      }
    })
  }
})
