const store = require('../../utils/store')
const tabAnim = require('../../utils/tabAnim')
const backup = require('../../utils/backup')
const preview = require('../../utils/preview')

Page({
  onShow() {
    // 同步胶囊 TabBar 选中态与文本显示配置
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3, hideText: store.getTabbarHideText() })
    }
    tabAnim(this)
  },

  data: {
    tabbarHideText: true,
    demoCount: 0
  },

  onLoad() {
    this.setData({ tabbarHideText: store.getTabbarHideText(), demoCount: preview.count() })
  },

  /** 配置：是否隐藏底部胶囊的文本（默认开启） */
  onTabbarHideText(e) {
    const v = e.detail.value
    this.setData({ tabbarHideText: v })
    wx.setStorageSync('tabbarHideText', v)
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ hideText: v })
    }
  },

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

  goReminders() {
    wx.navigateTo({ url: '/pages/reminders/reminders' })
  },

  /** 备份菜单：选择导出方式 */
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
    wx.showLoading({ title: '生成中' })
    backup.exportFile(kind, (err, name) => {
      wx.hideLoading()
      if (!err) wx.showToast({ title: '已生成 ' + name, icon: 'none' })
      else if (err === 'cancel') wx.showToast({ title: '已取消分享', icon: 'none' })
      else if (err === 'preview') wx.showToast({ title: '已打开文件', icon: 'none' })
      else wx.showToast({ title: '导出失败（模拟器不支持，请用真机）', icon: 'none' })
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
          wx.showToast({ title: '已清空', icon: 'none' })
        }
      }
    })
  }
})
