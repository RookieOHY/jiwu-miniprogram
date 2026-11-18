const store = require('../../utils/store')
const cats = require('../../utils/cats')
const tagsUtil = require('../../utils/tags')
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
    filter: 'all', // all | 持有中 | 已退役 | 已卖出（旧状态保留兼容）
    viewMode: 'list', // list | card | cat
    heroHidden: false,
    // 查询与排序
    searchKeyword: '',
    showFilter: false,
    filterCount: 0,
    activeChips: [],
    statuses: [],
    statusOptions: ['持有中', '已退役', '已卖出'],
    catGroups: [],
    selGroup: '',
    selSub: '',
    platforms: [],
    selPlatforms: [],
    minPrice: '',
    maxPrice: '',
    dateFrom: '',
    dateTo: '',
    allTags: [],
    selTags: [],
    currencies: [],
    selCurrency: '',
    sortBy: 'default',
    sortOptions: [
      { key: 'default', name: '默认（置顶+最新）' },
      { key: 'dailyDesc', name: '日均 高→低' },
      { key: 'dailyAsc', name: '日均 低→高' },
      { key: 'priceDesc', name: '价格 高→低' },
      { key: 'daysDesc', name: '持有天数 长→短' },
      { key: 'nameAsc', name: '名称 A→Z' }
    ],
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
    // 查询条件候选
    this.setData({
      catGroups: cats.getGroups(),
      platforms: store.PLATFORMS,
      currencies: store.CURRENCIES,
      allTags: tagsUtil.getTags()
    })
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

  /** 直接选择视图（list | card | cat） */
  setView(e) {
    const viewMode = e.currentTarget.dataset.v
    if (viewMode === this.data.viewMode) return
    this.setData({ viewMode })
    wx.setStorageSync('viewMode', viewMode)
    this.refresh()
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

    const d = this.data
    const kw = (d.searchKeyword || '').trim().toLowerCase()
    const items = all
      .filter((it) => {
        // 状态多选
        if (d.statuses.length) {
          const st = it.sold ? '已卖出' : it.retired ? '已退役' : '持有中'
          if (d.statuses.indexOf(st) < 0) return false
        }
        // 分类：大分类 + 子分类
        if (d.selGroup) {
          const groupName = it.categoryGroup || store.getCategoryName(it.category)
          if (groupName !== d.selGroup) return false
          if (d.selSub && it.category !== d.selSub && store.getCategoryName(it.category) !== d.selSub) return false
        }
        // 渠道多选
        if (d.selPlatforms.length && d.selPlatforms.indexOf(it.platform || 'other') < 0) return false
        // 价格区间（折算人民币）
        const priceCNY = store.toCNY(it.price, it.currency)
        if (d.minPrice !== '' && priceCNY < parseFloat(d.minPrice)) return false
        if (d.maxPrice !== '' && priceCNY > parseFloat(d.maxPrice)) return false
        // 购买日期范围（YYYY-MM-DD 字典序即可比较）
        if (d.dateFrom && it.buyDate < d.dateFrom) return false
        if (d.dateTo && it.buyDate > d.dateTo) return false
        // 标签多选（任一命中）
        if (d.selTags.length && !(it.tags || []).some((t) => d.selTags.indexOf(t) >= 0)) return false
        // 币种
        if (d.selCurrency && (it.currency || 'CNY') !== d.selCurrency) return false
        // 关键词：名称 / 备注 / 分类 / 渠道 / 标签
        if (kw) {
          const hay = [it.name, it.note, store.getCategoryName(it.category), store.getPlatformName(it.platform), (it.tags || []).join(' ')].join(' ').toLowerCase()
          if (hay.indexOf(kw) < 0) return false
        }
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
        iconSrc: cats.getSubIcon(it.category, (cats.getGroups().find((g) => g.name === (it.categoryGroup || '')) || {}).icon || '') || '/assets/3d/package.png',
        platform: it.platform,
        platformName: store.getPlatformName(it.platform),
        symbol: store.currencySymbol(it.currency),
        currency: it.currency || 'CNY',
        note: it.note || '',
        tags: it.tags || [],
        retired: it.retired,
        sold: !!it.sold,
        pinned: !!it.pinned,
        daily: store.fmtMoney(store.dailyCost(it)),
        dailyNum: store.toCNY(store.dailyCost(it), it.currency),
        priceNum: store.toCNY(it.price, it.currency),
        days: store.daysHeld(it)
      }))
      .sort((a, b) => {
        switch (d.sortBy) {
          case 'dailyDesc': return b.dailyNum - a.dailyNum
          case 'dailyAsc': return a.dailyNum - b.dailyNum
          case 'priceDesc': return b.priceNum - a.priceNum
          case 'daysDesc': return b.days - a.days
          case 'nameAsc': return a.name.localeCompare(b.name)
          default: return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)
        }
      })

    // 生效条件胶囊 + 计数
    const activeChips = []
    d.statuses.forEach((s) => activeChips.push({ key: 'status:' + s, label: s }))
    if (d.selGroup) activeChips.push({ key: 'group', label: '分类:' + (d.selSub || d.selGroup) })
    d.selPlatforms.forEach((p) => activeChips.push({ key: 'platform:' + p, label: store.getPlatformName(p) }))
    if (d.minPrice !== '' || d.maxPrice !== '') activeChips.push({ key: 'price', label: '¥' + (d.minPrice || '0') + '-' + (d.maxPrice || '∞') })
    if (d.dateFrom || d.dateTo) activeChips.push({ key: 'date', label: (d.dateFrom || '…') + '~' + (d.dateTo || '…') })
    d.selTags.forEach((t) => activeChips.push({ key: 'tag:' + t, label: t }))
    if (d.selCurrency) activeChips.push({ key: 'currency', label: d.selCurrency })
    if (kw) activeChips.push({ key: 'kw', label: '搜索:' + kw })
    if (d.sortBy !== 'default') {
      const so = d.sortOptions.find((o) => o.key === d.sortBy)
      activeChips.push({ key: 'sort', label: so ? so.name : '排序' })
    }
    const filterCount = activeChips.length

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
      totalPeriodValue: store.fmtMoney(totalPeriodValue),
      periodLabel,
      catView,
      activeChips,
      filterCount,
      numSize: (function () {
        // +1 是 ¥ 符号；三列各约 210rpx，按最长值选字号保证不溢出
        const maxLen = Math.max(
          String(store.fmtMoney(totalSpend)).length + 1,
          String(store.fmtMoney(totalDaily * mult)).length + 1,
          String(all.length).length
        )
        if (maxLen <= 6) return 'num-lg'
        if (maxLen <= 8) return 'num-md'
        if (maxLen <= 10) return 'num-sm'
        return 'num-xs'
      })()
    })
    // 回本日检测：有物品刚达标且未庆祝过 → 弹庆祝卡
    this.checkCelebration()
  },

  /* ---------- 查询与筛选 ---------- */

  onSearch(e) {
    this.setData({ searchKeyword: e.detail.value }, () => this.refresh())
  },

  clearSearch() {
    this.setData({ searchKeyword: '' }, () => this.refresh())
  },

  openFilter() {
    this.setData({
      showFilter: true,
      allTags: Array.from(new Set(tagsUtil.getTags().concat(
        store.getAll().reduce((acc, it) => acc.concat(it.tags || []), [])
      )))
    })
  },

  closeFilter() {
    this.setData({ showFilter: false })
  },

  noop() {},

  toggleStatus(e) {
    const v = e.currentTarget.dataset.v
    const list = this.data.statuses.slice()
    const i = list.indexOf(v)
    if (i >= 0) list.splice(i, 1)
    else list.push(v)
    this.setData({ statuses: list }, () => this.refresh())
  },

  setGroup(e) {
    const name = e.currentTarget.dataset.name
    this.setData({ selGroup: this.data.selGroup === name ? '' : name, selSub: '' }, () => this.refresh())
  },

  setSub(e) {
    const sub = e.currentTarget.dataset.sub
    this.setData({ selSub: this.data.selSub === sub ? '' : sub }, () => this.refresh())
  },

  togglePlatform(e) {
    const v = e.currentTarget.dataset.v
    const list = this.data.selPlatforms.slice()
    const i = list.indexOf(v)
    if (i >= 0) list.splice(i, 1)
    else list.push(v)
    this.setData({ selPlatforms: list }, () => this.refresh())
  },

  toggleTag(e) {
    const v = e.currentTarget.dataset.v
    const list = this.data.selTags.slice()
    const i = list.indexOf(v)
    if (i >= 0) list.splice(i, 1)
    else list.push(v)
    this.setData({ selTags: list }, () => this.refresh())
  },

  onMinPrice(e) { this.setData({ minPrice: e.detail.value }, () => this.refresh()) },
  onMaxPrice(e) { this.setData({ maxPrice: e.detail.value }, () => this.refresh()) },
  onDateFrom(e) { this.setData({ dateFrom: e.detail.value }, () => this.refresh()) },
  onDateTo(e) { this.setData({ dateTo: e.detail.value }, () => this.refresh()) },

  setCurrency(e) {
    const v = e.currentTarget.dataset.v
    this.setData({ selCurrency: this.data.selCurrency === v ? '' : v }, () => this.refresh())
  },

  setSort(e) {
    this.setData({ sortBy: e.currentTarget.dataset.v }, () => this.refresh())
  },

  resetFilter() {
    this.setData({
      statuses: [], selGroup: '', selSub: '', selPlatforms: [],
      minPrice: '', maxPrice: '', dateFrom: '', dateTo: '',
      selTags: [], selCurrency: '', sortBy: 'default', searchKeyword: ''
    }, () => this.refresh())
  },

  removeChip(e) {
    const key = e.currentTarget.dataset.k
    if (key.indexOf('status:') === 0) {
      const v = key.slice(7)
      this.setData({ statuses: this.data.statuses.filter((s) => s !== v) }, () => this.refresh())
    } else if (key.indexOf('platform:') === 0) {
      const v = key.slice(9)
      this.setData({ selPlatforms: this.data.selPlatforms.filter((s) => s !== v) }, () => this.refresh())
    } else if (key.indexOf('tag:') === 0) {
      const v = key.slice(4)
      this.setData({ selTags: this.data.selTags.filter((s) => s !== v) }, () => this.refresh())
    } else {
      const map = { group: { selGroup: '', selSub: '' }, price: { minPrice: '', maxPrice: '' }, date: { dateFrom: '', dateTo: '' }, currency: { selCurrency: '' }, kw: { searchKeyword: '' }, sort: { sortBy: 'default' } }
      this.setData(map[key] || {}, () => this.refresh())
    }
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
          wx.navigateTo({ url: '/pages/fulladd/fulladd?id=' + id })
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
