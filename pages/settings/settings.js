const store = require('../../utils/store')
const tabAnim = require('../../utils/tabAnim')
const backup = require('../../utils/backup')
const preview = require('../../utils/preview')
const reminders = require('../../utils/reminders')
const prefs = require('../../utils/prefs')
const lock = require('../../utils/lock')
const notify = require('../../utils/notify')

// 设置项索引：分组 + 搜索关键词（WXML 不能调方法，匹配逻辑全在这里算好）
const ROWS = [
  { key: 'dark', sec: '外观', label: '深色模式', kw: ['深色', '夜间', '黑色', '主题', 'dark'] },
  { key: 'hideAmount', sec: '外观', label: '隐藏所有金额', kw: ['金额', '隐藏', '打码', '脱敏', '隐私', '钱', '数字'] },
  { key: 'hideTabText', sec: '外观', label: '隐藏底部胶囊文本', kw: ['底部', '胶囊', '文本', '导航', '图标', 'tabbar'] },
  { key: 'view', sec: '外观', label: '默认视图', kw: ['视图', '列表', '卡片', '分类', '位置', '默认'] },
  { key: 'center', sec: '提醒', label: '到期提醒', kw: ['到期', '提醒', '保修', '补货', '保养', '吃灰', '续费', '退役', '提醒中心'] },
  { key: 'warnDays', sec: '提醒', label: '提前几天提醒', kw: ['提前', '几天', '天数', '预警', '阈值'] },
  { key: 'dustDays', sec: '提醒', label: '多久算吃灰', kw: ['吃灰', '闲置', '没用', '多久', '阈值'] },
  { key: 'budgetAlert', sec: '提醒', label: '预算超支提醒', kw: ['预算', '超支', '上限'] },
  { key: 'notify', sec: '提醒', label: '微信提醒（订阅消息）', kw: ['微信', '推送', '订阅', '消息', '通知', '服务通知', 'push'] },
  { key: 'notifyTmpl', sec: '提醒', label: '模板 ID', kw: ['模板', 'id', 'tmpl'] },
  { key: 'notifyAsk', sec: '提醒', label: '攒一次授权', kw: ['授权', '额度', '订阅次数'] },
  { key: 'notifyTest', sec: '提醒', label: '试发最紧急的一条', kw: ['试发', '测试', '发送', '试试'] },
  { key: 'notifyHelp', sec: '提醒', label: '开通步骤', kw: ['开通', '步骤', '怎么弄', '教程', '部署', '帮助'] },
  { key: 'appLock', sec: '隐私', label: '应用锁', kw: ['锁', '密码', '口令', '加密', '防偷看', 'pin'] },
  { key: 'setPin', sec: '隐私', label: '设置口令', kw: ['口令', '密码', '修改密码', 'pin', '锁', 'unlock'] },
  { key: 'lockBg', sec: '隐私', label: '切后台自动上锁', kw: ['后台', '切后台', '自动上锁', '重新输入'] },
  { key: 'privacyNote', sec: '隐私', label: '数据存在哪里', kw: ['隐私', '说明', '服务器', '上传', '明文', '安全', '存储'] },
  { key: 'backup', sec: '数据', label: '备份与恢复', kw: ['备份', '恢复', '导出', '导入', 'json', 'csv', '文件'] },
  { key: 'loadDemo', sec: '数据', label: '载入演示数据', kw: ['演示', '示例', '测试数据', 'demo'] },
  { key: 'clearDemo', sec: '数据', label: '清除演示数据', kw: ['清除演示', '删演示', 'demo'] },
  { key: 'clearAll', sec: '数据', label: '清空全部数据', kw: ['清空', '删除所有', '重置', '全部'] },
  { key: 'rates', sec: '汇率', label: '外币折算汇率', kw: ['汇率', '美元', 'usd', '欧元', '日元', '英镑', '换算', '折算', '外币'] },
  { key: 'version', sec: '关于', label: '版本', kw: ['版本', '关于', 'mvp'] }
]
const SECS = ['外观', '提醒', '隐私', '数据', '汇率', '关于']
const NOTIFY_KEYS = ['notify', 'notifyTmpl', 'notifyAsk', 'notifyTest', 'notifyHelp']

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
    itemCount: 0,
    wishCount: 0,
    // 搜索与折叠
    q: '',
    searching: false,
    visibleKeys: ROWS.map((r) => r.key),
    visibleSecs: SECS,
    notifyOpen: false,
    notifySummary: '未配置——提醒只能打开小程序才看得到',
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
    // 微信提醒（订阅消息）
    notifyOn: false,
    tmplEditing: false,
    tmplValue: '',
    notifyTmplId: '',
    notifyQuota: 0,
    notifyErr: '',
    notifyReady: false,
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
      itemCount: store.getAll().length,
      wishCount: store.getWishes().length,
      notifySummary: this._notifySummary(),
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
      notifyTmplId: notify.tmplId(),
      notifyQuota: notify.quota(),
      notifyOn: !!notify.tmplId(),
      notifyReady: notify.ready(),
      notifyErr: notify.get().lastErr || '',
      rates: store.CURRENCIES.filter((c) => c.key !== 'CNY').map((c) => ({
        code: c.key,
        label: c.name,
        symbol: c.symbol,
        rate: String(store.rateOf(c.key))
      }))
    })
  },

  /* ---------------- 搜索与分组过滤 ---------------- */

  onSearch(e) {
    const q = String(e.detail.value || '')
    this.setData(this._filter(q), () => {
      if (q.trim() && !this.data.visibleKeys.length) {
        wx.showToast({ title: '没找到匹配的设置项', icon: 'none' })
      }
    })
  },

  clearSearch() {
    this.setData(this._filter(''))
  },

  _filter(rawQ) {
    const q = String(rawQ || '').trim().toLowerCase()
    if (!q) {
      return {
        q: '',
        searching: false,
        visibleKeys: ROWS.map((r) => r.key),
        visibleSecs: SECS,
        notifyOpen: !!this._notifyUser
      }
    }
    const hit = (r) => {
      if (String(r.label).toLowerCase().indexOf(q) >= 0) return true
      for (let i = 0; i < r.kw.length; i++) {
        const k = r.kw[i].toLowerCase()
        if (k.indexOf(q) >= 0 || q.indexOf(k) >= 0) return true
      }
      return false
    }
    // 命中分组名（如输入「提醒」）则该组全部显示
    const secHit = SECS.filter((n) => n.toLowerCase().indexOf(q) >= 0)
    const keys = ROWS.filter((r) => secHit.indexOf(r.sec) >= 0 || hit(r)).map((r) => r.key)
    const secs = SECS.filter((n) => keys.some((k) => (ROWS.find((r) => r.key === k) || {}).sec === n))
    // 搜到微信提醒的子项时自动展开，否则用户看不到命中结果
    const notifyHit = keys.some((k) => NOTIFY_KEYS.indexOf(k) >= 0)
    return {
      q: rawQ,
      searching: true,
      visibleKeys: keys,
      visibleSecs: secs,
      // 手动展开过 或 搜索命中了子项才展开，清空搜索后回到手动状态
      notifyOpen: !!this._notifyUser || notifyHit
    }
  },

  toggleNotify() {
    this._notifyUser = !this.data.notifyOpen
    this.setData({ notifyOpen: this._notifyUser })
  },

  _notifySummary() {
    const id = notify.tmplId()
    if (!id) return '未配置——提醒只能打开小程序才看得到'
    if (!notify.ready()) return '模板已填，但云开发不可用（检查环境 ID）'
    const n = notify.quota()
    return n > 0 ? '已开启，还能推 ' + n + ' 条' : '已配置，但授权额度用完了'
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

  /* ---------------- 微信提醒（订阅消息） ---------------- */

  /** 模板 ID 行内编辑 */
  startTmpl() {
    this.setData({ tmplEditing: true, tmplValue: notify.tmplId() })
  },

  onTmplInput(e) {
    this.setData({ tmplValue: e.detail.value })
  },

  commitTmpl() {
    if (!this.data.tmplEditing) return
    const id = notify.setTmplId(this.data.tmplValue)
    this.setData({ tmplEditing: false, notifyTmplId: id, notifyOn: !!id, notifyReady: notify.ready() })
    wx.showToast({ title: id ? '模板已保存' : '已清除，微信提醒关闭', icon: 'none' })
  },

  /** 攒一次推送额度 */
  askNotify() {
    notify.ask((r) => {
      this.setData({ notifyQuota: notify.quota(), notifyErr: notify.get().lastErr || '', notifyReady: notify.ready(), notifySummary: this._notifySummary() })
      wx.showToast({ title: r.msg, icon: r.ok ? 'success' : 'none' })
    })
  },

  /** 试发最紧急的一条，用来验证模板字段是否对得上 */
  testNotify() {
    wx.showLoading({ title: '发送中' })
    notify.send(null, (r) => {
      wx.hideLoading()
      this.setData({ notifyQuota: notify.quota(), notifyErr: notify.get().lastErr || '', notifySummary: this._notifySummary() })
      if (r.needAuth) {
        wx.showModal({
          title: '需要先授权',
          content: '微信规定：每授权一次，才能推送一条。要现在授权吗？',
          confirmText: '授权',
          success: (m) => {
            if (m.confirm) this.askNotify()
          }
        })
        return
      }
      wx.showToast({ title: r.msg, icon: r.ok ? 'success' : 'none' })
    })
  },

  notifyHelp() {
    wx.showModal({
      title: '怎么开通微信提醒',
      content:
        '1. 小程序后台 → 订阅消息 → 从公共模板库选一个到期提醒类模板\n' +
        '2. 模板字段建议包含：物品名称(thing1)、提醒类型(thing2)、到期日期(date3)\n' +
        '3. 复制模板 ID 填到上面这一行\n' +
        '4. 右键 cloudfunctions/notify → 上传并部署：云端安装依赖\n' +
        '5. 点「攒一次授权」，之后到期当天就能收到服务通知\n\n' +
        '注意：微信限制每次授权只能发一条，用完需要再点一次。',
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
