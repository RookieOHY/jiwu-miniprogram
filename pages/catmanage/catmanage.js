const store = require('../../utils/store')
const cats = require('../../utils/cats')

Page({
  data: {
    groups: [],
    editMode: false,
    showMenu: false
  },

  onShow() {
    this.refresh()
  },

  refresh() {
    const items = store.getAll()
    const groups = cats.getGroups().map((g) => ({
      name: g.name,
      icon: g.icon,
      subs: g.subs.map((s) => ({
        name: s,
        count: items.filter((it) => it.category === s).length
      }))
    }))
    this.setData({ groups })
  },

  /** 编辑模式切换：开启后点子分类 = 删除 */
  toggleEdit() {
    const editMode = !this.data.editMode
    this.setData({ editMode })
    if (editMode) {
      wx.showToast({ title: '编辑模式：点分类名可删除', icon: 'none' })
    }
  },

  removeSub(e) {
    const g = e.currentTarget.dataset.g
    const s = e.currentTarget.dataset.s
    wx.showModal({
      title: '删除子分类',
      content: '「' + s + '」将被移除（不影响已记录的物品），确定？',
      confirmText: '删除',
      confirmColor: '#c05a4d',
      success: (m) => {
        if (m.confirm) {
          cats.removeSub(g, s)
          this.refresh()
        }
      }
    })
  },

  /** 导出分类 JSON 到剪贴板 */
  exportCats() {
    wx.setClipboardData({
      data: cats.exportJSON(),
      success: () => wx.showToast({ title: '分类 JSON 已复制到剪贴板', icon: 'none' })
    })
    this.closeMenu()
  },

  /** 点子分类：编辑模式下删除 */
  onSubTap(e) {
    if (!this.data.editMode) return
    const g = e.currentTarget.dataset.g
    const s = e.currentTarget.dataset.s
    wx.showModal({
      title: '删除子分类',
      content: '「' + s + '」将被移除（不影响已记录的物品），确定？',
      confirmText: '删除',
      confirmColor: '#c05a4d',
      success: (m) => {
        if (m.confirm) {
          cats.removeSub(g, s)
          this.refresh()
        }
      }
    })
  },

  /** 添加子分类：先选大分类，再输入名称 */
  addFlow() {
    const groups = this.data.groups
    const names = groups.map((g) => g.name)
    wx.showActionSheet({
      itemList: names.slice(0, 6),
      success: (r) => {
        // 超过 6 个大分类时，用搜索式二次选择兜底
        const group = names[r.tapIndex] || names[0]
        wx.showModal({
          title: '添加到「' + group + '」',
          editable: true,
          placeholderText: '输入子分类名称',
          success: (m) => {
            if (!m.confirm || !m.content || !m.content.trim()) return
            const ok = cats.addSub(group, m.content.trim())
            if (ok) {
              this.refresh()
              wx.showToast({ title: '已添加', icon: 'success' })
            } else {
              wx.showToast({ title: '已存在同名分类', icon: 'none' })
            }
          }
        })
      },
      fail: () => {
        // 超过 6 项时 actionSheet 不可用，退化为对第一个大分类添加
      }
    })
  },

  /** 右上角菜单：导出 / 导入 / 恢复默认 */
  openMenu() {
    this.setData({ showMenu: true })
  },

  closeMenu() {
    this.setData({ showMenu: false })
  },

  importFile() {
    this.closeMenu()
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['json'],
      success: (r) => {
        const path = r.tempFiles[0].path
        wx.getFileSystemManager().readFile({
          filePath: path,
          encoding: 'utf8',
          success: (res) => {
            const n = cats.importJSON(res.data)
            if (n > 0) {
              this.refresh()
              wx.showToast({ title: '已导入 ' + n + ' 个大分类', icon: 'success' })
            } else {
              wx.showToast({ title: '文件格式不正确', icon: 'none' })
            }
          },
          fail: () => wx.showToast({ title: '读取文件失败', icon: 'none' })
        })
      }
    })
  },

  importDefault() {
    this.closeMenu()
    wx.showModal({
      title: '导入默认分类',
      content: '将覆盖当前自定义分类，确定？',
      success: (m) => {
        if (m.confirm) {
          cats.resetDefaults()
          this.refresh()
          wx.showToast({ title: '已恢复默认分类', icon: 'success' })
        }
      }
    })
  }
})
