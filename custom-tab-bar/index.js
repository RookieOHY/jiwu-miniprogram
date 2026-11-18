/**
 * 自定义胶囊 TabBar：左侧胶囊（滑动高亮块 + 图标），右侧独立的 ➕ 圆钮
 * 选中态由组件自感知：pageLifetimes.show 里按页面栈顶路由反推，无需各页 onShow 手动同步
 */
const store = require('../utils/store')

Component({
  lifetimes: {
    attached() {
      // 读取用户的文本显示配置（未设置过默认隐藏）
      this.setData({ hideText: store.getTabbarHideText() })
      this._syncFromRoute()
    }
  },

  pageLifetimes: {
    /** 组件所在页面显示时：按当前页面路径自动同步选中态（不依赖各页 onShow，避免时序竞态） */
    show() {
      this._syncFromRoute()
    }
  },

  data: {
    selected: 0,
    hideText: true,
    plusTip: '记物品',
    list: [
      { pagePath: '/pages/index/index', text: '物品' },
      { pagePath: '/pages/wishlist/wishlist', text: '种草' },
      { pagePath: '/pages/stats/stats', text: '统计' },
      { pagePath: '/pages/settings/settings', text: '设置' }
    ]
  },

  methods: {
    /** 用页面栈顶的真实路径反推选中索引 */
    _syncFromRoute() {
      const pages = getCurrentPages()
      const cur = pages.length ? '/' + pages[pages.length - 1].route : ''
      const idx = this.data.list.findIndex((it) => it.pagePath === cur)
      // ➕ 气泡跟随当前 tab：种草页种一株，其余记物品
      const plusTip = idx === 1 ? '种一株' : '记物品'
      if (idx >= 0 && (idx !== this.data.selected || plusTip !== this.data.plusTip)) {
        this.setData({ selected: idx, plusTip })
      }
      const hideText = store.getTabbarHideText()
      if (hideText !== this.data.hideText) {
        this.setData({ hideText })
      }
    },

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
