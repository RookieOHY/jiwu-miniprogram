/**
 * 自定义胶囊 TabBar：左侧 3 个 tab 收进一个胶囊，右侧独立的 ➕ 圆钮
 * 每个 tab 页需在 onShow 里调用 getTabBar().setData({ selected }) 同步选中态
 */
Component({
  lifetimes: {
    attached() {
      // 读取用户的文本显示配置（未设置过默认隐藏）
      const store = require('../utils/store')
      this.setData({ hideText: store.getTabbarHideText() })
    }
  },
  data: {
    selected: 0,
    hideText: true,
    list: [
      { pagePath: '/pages/index/index', text: '物品' },
      { pagePath: '/pages/wishlist/wishlist', text: '种草' },
      { pagePath: '/pages/settings/settings', text: '设置' }
    ]
  },

  methods: {
    switchTab(e) {
      const index = e.currentTarget.dataset.index
      wx.switchTab({ url: this.data.list[index].pagePath })
    },

    goAdd() {
      // 跟随当前 tab：种草页 ➕ 记种草，物品页 ➕ 记一笔
      const url = this.data.selected === 1 ? '/pages/wishlist/add' : '/pages/add/add'
      wx.navigateTo({ url })
    }
  }
})
