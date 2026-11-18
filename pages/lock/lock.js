const lock = require('../../utils/lock')

Page({
  data: {
    mode: 'unlock', // unlock | set
    stage: 0,       // set 模式：0=输入新口令，1=再确认一次
    title: '输入口令',
    sub: '',
    input: '',
    error: '',
    shake: false,
    enableAfter: false // 从设置页「开锁」进来时，设完口令顺手开启
  },

  onLoad(query) {
    // 只依赖 query 与本地存储；骨架写死在 wxml，即使这里出错页面也不会空白
    const mode = query && query.mode === 'set' ? 'set' : 'unlock'
    this.setData({
      mode,
      enableAfter: !!(query && query.enable === '1'),
      title: mode === 'set' ? '设置新口令' : '输入口令',
      sub: mode === 'set'
        ? (lock.hasPin() ? '用于替换当前口令' : '4 位数字，解锁后才能开启应用锁')
        : '日用即值已上锁'
    })
  },

  onKey(e) {
    const k = e.currentTarget.dataset.k
    if (k === 'del') return this.onDel()
    if (k === 'forget') return this.onForget()
    if (this.data.input.length >= lock.PIN_LEN) return
    const input = this.data.input + k
    this.setData({ input, error: '' })
    if (input.length === lock.PIN_LEN) setTimeout(() => this.submit(), 120)
  },

  onDel() {
    this.setData({ input: this.data.input.slice(0, -1), error: '' })
  },

  clearInput(msg) {
    this.setData({ input: '', error: msg || '', shake: !!msg })
    if (msg) setTimeout(() => this.setData({ shake: false }), 400)
  },

  submit() {
    const pin = this.data.input
    if (this.data.mode === 'unlock') {
      if (lock.verify(pin)) {
        this.clearInput('')
        lock.resume()
      } else {
        this._tries = (this._tries || 0) + 1
        this.clearInput(this._tries >= 3 ? '口令不对，忘记可重置' : '口令不对')
      }
      return
    }
    // 设置模式
    if (this.data.stage === 0) {
      this._first = pin
      this.setData({ stage: 1, title: '再输入一次', sub: '确认新口令' })
      this.clearInput('')
      return
    }
    if (pin !== this._first) {
      this.setData({ stage: 0, title: '设置新口令', sub: '两次不一致，重新开始' })
      this.clearInput('两次不一致')
      this._first = ''
      return
    }
    lock.setPin(pin)
    lock.markAuthed()
    const wasOff = !lock.enabled()
    if (this.data.enableAfter) lock.toggle(true, true) // 刚验过口令，本次不再拦
    this._first = ''
    wx.showToast({ title: this.data.enableAfter && wasOff ? '应用锁已开启' : '口令已更新', icon: 'none' })
    setTimeout(() => {
      const pages = getCurrentPages()
      if (pages.length > 1) wx.navigateBack()
      else wx.switchTab({ url: '/pages/settings/settings' })
    }, 600)
  },

  onForget() {
    wx.showModal({
      title: '忘记口令？',
      content: '可直接重置口令，你记录的物品数据不会丢失。\n（应用锁防的是随手翻看，不是专业攻击）',
      confirmText: '重置口令',
      confirmColor: '#c05a4d',
      success: (r) => {
        if (!r.confirm) return
        lock.resetPin()
        lock.resume()
      }
    })
  }
})
