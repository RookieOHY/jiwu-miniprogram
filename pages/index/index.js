const store = require('../../utils/store')
const cats = require('../../utils/cats')
const poster = require('../../utils/poster')
const tabAnim = require('../../utils/tabAnim')

Page({
  data: {
    items: [],
    totalSpend: '0',
    count: 0,
    heldCount: 0,
    retiredCount: 0,
    soldCount: 0,
    filter: 'all', // all | 持有中 | 已退役 | 已卖出
    viewMode: 'list', // list | card
    heroHidden: false,
    totalDaily: '0',
    amountHidden: false,
    totalPeriod: 'day',
    totalPeriodValue: '0',
    periodLabel: '总日均'
  },
  /** 上滑收起顶部绿色汇总卡（迟滞阈值防抖动：>300 收起，<20 展开） */
  onPageScroll(e) {
    const st = e.scrollTop
    const cur = this.data.heroHidden
    let hide = cur
    if (!cur && st > 300) hide = true
    else if (cur && st < 20) hide = false
    if (hide !== cur) {
      this.setData({ heroHidden: hide })
    }
  },

  onShow() {
    // 同步胶囊 TabBar 选中态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0, hideText: store.getTabbarHideText() })
    }
    tabAnim(this)
    this.refresh()
  },

  onLoad() {
    // 记住用户的视图偏好
    const saved = wx.getStorageSync('viewMode')
    if (saved) this.setData({ viewMode: saved })
    // 恢复金额隐私模式与周期档位
    this.setData({ amountHidden: !!wx.getStorageSync('amountHidden') })
    const period = wx.getStorageSync('totalPeriod')
    if (period) this.setData({ totalPeriod: period })
  },

  /** 视图三态轮转：列表 → 卡片 → 分类 → 列表 */
  toggleView() {
    const order = ['list', 'card', 'cat']
    const next = order[(order.indexOf(this.data.viewMode) + 1) % 3]
    this.setData({ viewMode: next })
    wx.setStorageSync('viewMode', next)
    this.refresh()
  },

  /** 直接选择视图（list | card），不做切换翻转 */
  setView(e) {
    const viewMode = e.currentTarget.dataset.v
    if (viewMode === this.data.viewMode) return
    this.setData({ viewMode })
    wx.setStorageSync('viewMode', viewMode)
  },

  refresh() {
    const all = store.getAll()
    const today = this.fmtDate(new Date())
    const totalSpend = all.reduce((s, it) => s + store.toCNY(it.price, it.currency), 0)
    // 总日均：持有中物品的日均成本之和（折算人民币）
    const totalDaily = all
      .filter((it) => !it.retired)
      .reduce((s, it) => s + store.toCNY(store.dailyCost(it), it.currency), 0)
    // 按当前周期档位换算：日 / 月 / 年
    const mult = this.data.totalPeriod === 'month' ? 30 : this.data.totalPeriod === 'year' ? 365 : 1
    const totalPeriodValue = store.fmtMoney(totalDaily * mult)
    const periodLabel = this.data.totalPeriod === 'month' ? '总月均' : this.data.totalPeriod === 'year' ? '总年均' : '总日均'

    const items = all
      .filter((it) => {
        if (this.data.filter === '持有中' && it.retired) return false
        if (this.data.filter === '已退役' && (!it.retired || it.sold)) return false
        if (this.data.filter === '已卖出' && !it.sold) return false
        return true
      })
      .map((it) => ({
        id: it.id,
        name: it.name,
        price: store.fmtMoney(it.price),
        buyDate: it.buyDate,
        category: it.category,
        categoryGroup: it.categoryGroup || '',
        catName: store.getCategoryName(it.category),
        platform: it.platform,
        platformName: store.getPlatformName(it.platform),
        symbol: store.currencySymbol(it.currency),
        retired: it.retired,
        sold: !!it.sold,
        pinned: !!it.pinned,
        daily: store.fmtMoney(store.dailyCost(it)),
        days: store.daysHeld(it)
      }))
      // 置顶的排最前，其余保持最新买入在前的顺序
      .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))

    // 分类视图：按大分类分组，节头带 3D 图标
    const allGroups = cats.getGroups()
    const catView = []
    const catIndex = {}
    items.forEach((it) => {
      // 大分类：详细添加的物品记了 categoryGroup；legacy 物品用分类中文名
      const name = it.categoryGroup || it.catName || '其他'
      if (catIndex[name] === undefined) {
        const g = allGroups.find((x) => x.name === name)
        catIndex[name] = catView.length
        catView.push({ name, icon: g ? g.icon : '/assets/3d/package.png', items: [] })
      }
      catView[catIndex[name]].items.push(it)
    })
    catView.sort((a, b) => b.items.length - a.items.length)

    // 筛选角标
    const heldCount = all.filter((it) => !it.retired).length
    const retiredCount = all.filter((it) => it.retired && !it.sold).length
    const soldCount = all.filter((it) => it.sold).length

    this.setData({
      items,
      count: all.length,
      heldCount,
      retiredCount,
      soldCount,
      totalSpend: store.fmtMoney(totalSpend),
      totalDaily: store.fmtMoney(totalDaily),
      totalPeriodValue,
      periodLabel,
      catView
    })
    // 回本日检测：有物品刚达标且未庆祝过 → 弹庆祝卡
    this.checkCelebration()
  },

  /** 隐藏/显示金额（隐私模式，记忆状态） */
  toggleHide() {
    const amountHidden = !this.data.amountHidden
    this.setData({ amountHidden })
    wx.setStorageSync('amountHidden', amountHidden)
  },

  /** 切换总均周期：日 → 月 → 年 → 日 */
  cyclePeriod() {
    const order = ['day', 'month', 'year']
    const next = order[(order.indexOf(this.data.totalPeriod) + 1) % 3]
    this.setData({ totalPeriod: next })
    wx.setStorageSync('totalPeriod', next)
    this.refresh()
  },

  /** 值回票价日：扫一遍持有中物品，找到第一个刚达标未庆祝的 */
  checkCelebration() {
    const all = store.getAll()
    for (const it of all) {
      if (it.retired || !(it.targetDaily > 0) || it.celebrated) continue
      const be = store.breakEven(it)
      if (!be || !be.reached) continue
      store.updateItem(it.id, { celebrated: true })
      this.setData({
        celebrating: {
          id: it.id,
          name: it.name,
          price: store.fmtMoney(it.price),
          symbol: store.currencySymbol(it.currency),
          days: be.held,
          need: be.need,
          due: be.due
        }
      })
      this._poster = null
      this._ensurePoster()
      return
    }
  },

  closeCelebration() {
    this.setData({ celebrating: null })
  },

  /** 生成庆祝海报（离屏 canvas，一次生成，分享和保存共用） */
  _ensurePoster() {
    if (this._poster || !this.data.celebrating) return
    wx.createSelectorQuery()
      .select('#celeCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0] || !res[0].node) return
        poster.drawCelebration(res[0].node, this.data.celebrating, (path) => {
          if (path) this._poster = path
        })
      })
  },

  /** 保存海报到相册（发朋友圈用） */
  savePoster() {
    if (!this._poster) {
      wx.showToast({ title: '海报生成中，再点一次', icon: 'none' })
      return
    }
    wx.saveImageToPhotosAlbum({
      filePath: this._poster,
      success: () => wx.showToast({ title: '已保存，发朋友圈吧', icon: 'none' }),
      fail: (r) => {
        // 首次会拒授权，引导去设置里开
        if (r.errMsg && r.errMsg.includes('auth')) {
          wx.showModal({
            title: '需要相册权限',
            content: '去设置里允许保存到相册，再来保存这张海报',
            confirmText: '去设置',
            success: (m) => {
              if (m.confirm) wx.openSetting()
            }
          })
        }
      }
    })
  },

  /** 转发：庆祝中的物品走专属文案 + 海报图 */
  onShareAppMessage() {
    const c = this.data.celebrating
    if (c) {
      return {
        title: '「' + c.name + '」今天回本了！' + c.symbol + c.price + ' 用了 ' + c.days + ' 天，之后每个使用日都是赚的',
        path: '/pages/detail/detail?id=' + c.id,
        imageUrl: this._poster || undefined
      }
    }
    return { title: '记物 · 一件东西用得越久，每天就越便宜', path: '/pages/index/index' }
  },

  /** 分享朋友圈（快照形式，精细图走「保存图片」） */
  onShareTimeline() {
    return { title: '记物 · 一件东西用得越久，每天就越便宜' }
  },

  fmtDate(d) {
    const p = (n) => (n < 10 ? '0' + n : '' + n)
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
  },

  setFilter(e) {
    this.setData({ filter: e.currentTarget.dataset.f }, () => this.refresh())
  },

  goDetail(e) {
    wx.navigateTo({ url: '/pages/detail/detail?id=' + e.currentTarget.dataset.id })
  },

  /** 长按物品：置顶 / 编辑 / 删除 */
  onItemLongPress(e) {
    const id = e.currentTarget.dataset.id
    const it = store.getById(id)
    if (!it) return
    wx.showActionSheet({
      itemList: [it.pinned ? '取消置顶' : '置顶', '编辑', '删除'],
      itemColor: '#2b2b2b',
      success: (r) => {
        if (r.tapIndex === 0) {
          if (!it.pinned && store.pinnedCount() >= store.PIN_LIMIT) {
            wx.showToast({ title: '最多置顶 ' + store.PIN_LIMIT + ' 件', icon: 'none' })
            return
          }
          store.updateItem(id, { pinned: !it.pinned })
          this.refresh()
          wx.showToast({ title: it.pinned ? '已取消置顶' : '已置顶', icon: 'none' })
        } else if (r.tapIndex === 1) {
          wx.navigateTo({ url: '/pages/add/add?id=' + id })
        } else if (r.tapIndex === 2) {
          wx.showModal({
            title: '删除物品',
            content: '删除「' + it.name + '」后无法恢复，确定删除？',
            confirmText: '删除',
            confirmColor: '#c05a4d',
            success: (m) => {
              if (m.confirm) {
                store.removeItem(id)
                this.refresh()
              }
            }
          })
        }
      }
    })
  },

  goStats() {
    wx.switchTab({ url: '/pages/stats/stats' })
  }
})
