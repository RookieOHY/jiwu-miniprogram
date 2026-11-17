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
      this._syncFromRoute()
    }
  },
  pageLifetimes: {
    /** 组件所在页面显示时：按当前页面路径自动同步选中态（不依赖各页 onShow） */
    show() {
      this._syncFromRoute()
    }
  },
  methods: {
    /** 用页面栈顶的真实路径反推选中索引，彻底避免时序竞态 */
    _syncFromRoute() {
      const pages = getCurrentPages()
      const cur = pages.length ? '/' + pages[pages.length - 1].route : ''
      const idx = this.data.list.findIndex((it) => it.pagePath === cur)
      const store = require('../utils/store')
      if (idx >= 0 && idx !== this.data.selected) {
        this.setData({ selected: idx })
      }
      const hideText = store.getTabbarHideText()
      if (hideText !== this.data.hideText) {
        this.setData({ hideText })
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
