/**
 * 自定义胶囊 TabBar：左侧 3 个 tab 收进一个胶囊，右侧独立的 ➕ 圆钮
 * 每个 tab 页需在 onShow 里调用 getTabBar().setData({ selected }) 同步选中态
 */
Component({
  data: {
    selected: 0,
    list: [
      { pagePath: '/pages/index/index', text: '物品' },
      { pagePath: '/pages/stats/stats', text: '统计' },
      { pagePath: '/pages/settings/settings', text: '设置' }
    ]
  },

  methods: {
    switchTab(e) {
      const index = e.currentTarget.dataset.index
      wx.switchTab({ url: this.data.list[index].pagePath })
    },

    goAdd() {
      wx.navigateTo({ url: '/pages/add/add' })
    }
  }
})
