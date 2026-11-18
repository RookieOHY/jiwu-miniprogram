/**
 * 功能级测试：用假 wx 环境真实驱动各页面的方法序列并断言行为
 * 用法：node test/func-test.js   （有 FAIL 退出码 1）
 */
const fs = require('fs')
const path = require('path')
const vm = require('vm')
const root = path.resolve(__dirname, '..')

let pass = 0, fails = []
const A = (cond, name) => { if (cond) { pass++; } else { fails.push(name); console.log('  ❌ ' + name) } }

/* ---------- 共享假 wx ---------- */
function makeWx(seed) {
  const wx = {
    _storage: new Map(Object.entries(seed || {})),
    setStorageSync: (k, v) => wx._storage.set(k, v),
    getStorageSync: (k) => (wx._storage.has(k) ? wx._storage.get(k) : ''),
    removeStorageSync: (k) => wx._storage.delete(k),
    _toasts: [],
    _navigations: [],
    _modals: [],
    showToast: (o) => wx._toasts.push(o.title),
    showModal: (o) => { wx._modals.push(o); if (wx._modalAnswer) o.success(wx._modalAnswer) },
    navigateTo: (o) => wx._navigations.push(o.url),
    setNavigationBarTitle: () => {},
    navigateBack: () => wx._navigations.push('__back__'),
    switchTab: (o) => wx._navigations.push(o.url),
    vibrateShort: () => {},
    chooseMedia: (o) => {},
    setClipboardData: (o) => { if (o.success) o.success() },
    getFileSystemManager: () => ({ saveFile: (o) => o.success && o.success(), saveFileSync: () => {} }),
    onThemeChange: () => {},
    env: { USER_DATA_PATH: '/user' }
  }
  return wx
}

/* ---------- vm 加载页面/组件/工具 ---------- */
const utilsCache = {}
function freshUtils() { Object.keys(utilsCache).forEach((k) => delete utilsCache[k]) }
function makeSandbox(wx, requireMap) {
  const sb = { __page: null, __component: null }
  sb.wx = wx
  sb.getCurrentPages = () => wx._pages || [{ route: 'pages/index/index' }]
  sb.getApp = () => ({})
  sb.Page = (cfg) => { sb.__page = cfg }
  sb.Component = (cfg) => { sb.__component = cfg }
  sb.App = () => {}
  sb.setTimeout = (fn) => fn()
  sb.console = console
  sb.JSON = JSON; sb.Math = Math; sb.Date = Date
  sb.parseFloat = parseFloat; sb.parseInt = parseInt
  sb.Object = Object; sb.Array = Array; sb.Number = Number
  sb.String = String; sb.RegExp = RegExp; sb.Error = Error
  sb.require = (r) => {
    const clean = r.replace(/^\.\.\/\.\.\//, '').replace(/^\.\.\//, '').replace(/\.js$/, '')
    const rel = clean + '.js'
    if (utilsCache[rel]) return utilsCache[rel]
    const file = path.join(root, rel)
    const code = fs.readFileSync(file, 'utf8')
    const sub = makeSandbox(wx, requireMap)
    sub.require = sb.require
    sub.module = { exports: {} }
    sub.exports = sub.module.exports
    vm.createContext(sub)
    new vm.Script(code, { filename: rel }).runInContext(sub)
    utilsCache[rel] = sub.module.exports
    return utilsCache[rel]
  }
  return sb
}

function loadPage(rel, wx) {
  const file = path.join(root, rel)
  const sb = makeSandbox(wx)
  vm.createContext(sb)
  new vm.Script(fs.readFileSync(file, 'utf8'), { filename: rel }).runInContext(sb)
  const cfg = sb.__page
  const inst = Object.assign({}, cfg, {
    data: JSON.parse(JSON.stringify(cfg.data || {})),
    setData(p, cb) { Object.assign(this.data, p); if (cb) cb() },
    getTabBar() { return wx._tabbar }
  })
  return inst
}

function loadComponent(rel, wx) {
  const file = path.join(root, rel)
  const sb = makeSandbox(wx)
  vm.createContext(sb)
  new vm.Script(fs.readFileSync(file, 'utf8'), { filename: rel }).runInContext(sb)
  const cfg = sb.__component
  const inst = Object.assign({}, cfg.methods || {}, cfg, {
    data: JSON.parse(JSON.stringify(cfg.data || {})),
    setData(p, cb) { Object.assign(this.data, p); if (cb) cb() },
    _events: {},
    triggerEvent(name, detail) { this._events[name] = detail }
  })
  return inst
}

/* ---------- 场景 1：store 数据层 ---------- */
function testStore() {
  console.log('▶ store 数据层')
  const wx = makeWx({})
  const store = makeSandbox(wx, {}).require('../../utils/store')

  const a = store.addItem({ name: 'iPhone', price: 8999, buyDate: '2026-01-01', category: 'other', platform: 'jd', currency: 'CNY' })
  A(a.uses === undefined, '未启用次均时不写 uses 字段')
  A(store.getAll().length === 1, 'addItem 入库')

  const b = store.addItem({ name: '测试2', price: 100, buyDate: '2026-02-01', extra: { tags: ['主力机'], valuation: 500, location: '书房', extras: [{ type: '支出', amount: 50 }] } })
  A(b.tags.length === 1 && b.valuation === 500 && b.extras.length === 1, 'addItem extra 扩展字段合并')
  A(b.location === '书房', 'location 存储')

  store.updateItem(b.id, { price: 200 })
  A(store.getById(b.id).price === 200, 'updateItem 局部更新')

  store.updateItem(b.id, { retired: true, retiredDate: '2026-03-01' })
  A(store.getById(b.id).retired === true, '退役')

  A(store.daysHeld({ buyDate: '2026-01-01', retired: false }) >= 300, '天数计算')
  A(store.getTabbarHideText() === true, 'tabbar 文本默认隐藏')

  store.updateItem(a.id, { pinned: true })
  A(store.pinnedCount() === 1, '置顶计数')

  store.removeItem(b.id)
  A(store.getById(b.id) === null, 'removeItem')
}

/* ---------- 场景 2：add 页（新增 + 编辑 + 计算器） ---------- */
function testAddPage() {
  freshUtils()
  console.log('▶ 添加页')
  const wx = makeWx({})
  wx._tabbar = { data: {}, setData(p) { Object.assign(this.data, p) } }
  const inst = loadPage('pages/add/add.js', wx)

  inst.setData({ name: '', price: '', canSave: false })
  inst.onName({ detail: { value: '键盘' } })
  A(inst.data.canSave === false, '只有名称时不可保存')
  inst.onPrice({ detail: { value: '199' } })
  A(inst.data.canSave === true, '名称+价格后可保存')
  inst.save()
  const saved = require(path.join(root, 'utils/store.js'))
  A(wx._navigations.includes('__back__'), '保存后返回')
  A(wx._toasts.includes('已记录'), '保存 toast')

  // 编辑模式
  const inst2 = loadPage('pages/add/add.js', wx)
  const store = makeSandbox(wx, {}).require('../../utils/store')
  const target = store.getAll()[0]
  inst2.onLoad({ id: target.id })
  A(inst2.data.isEdit === true, '编辑模式识别')
  A(inst2.data.name === '键盘', '编辑预填名称')
  A(inst2.data.price === '199', '编辑预填价格')
  inst2.onPrice({ detail: { value: '250' } })
  inst2.save()
  A(store.getById(target.id).price === 250, '编辑保存生效')

  // 计算器
  const inst3 = loadPage('pages/add/add.js', wx)
  inst3.onLoad({})
  inst3.openCalc()
  A(inst3.data.showCalc === true, '计算器打开')
  inst3.calcKey({ currentTarget: { dataset: { k: '7' } } })
  inst3.calcKey({ currentTarget: { dataset: { k: '+' } } })
  inst3.calcKey({ currentTarget: { dataset: { k: '8' } } })
  inst3.calcKey({ currentTarget: { dataset: { k: '=' } } })
  A(inst3.data.calcDisplay === '15', '计算器 7+8=15')
  inst3.applyCalc()
  A(inst3.data.price === '15', '填入价格')
}

/* ---------- 场景 3：fulladd 详细添加 ---------- */
function testFullAdd() {
  freshUtils()
  console.log('▶ 详细添加页')
  const wx = makeWx({})
  wx._tabbar = { data: {}, setData(p) { Object.assign(this.data, p) } }
  const inst = loadPage('pages/fulladd/fulladd.js', wx)
  inst.onLoad({})

  inst.setData({ name: '微单相机', price: '6999', category: '摄影摄像', categoryGroup: '电子数码' })
  inst.addTag() // 空输入忽略
  inst.setData({ tagInput: '摄影' })
  inst.addTag()
  A(inst.data.tags.includes('摄影'), '标签添加')

  inst.addExtra()
  A(inst.data.extras.length === 0, '无效金额不加收支柱')
  inst.setData({ extraAmount: '300' })
  inst.addExtra()
  A(inst.data.extras.length === 1 && inst.data.extras[0].amount === 300, '附加支出添加')

  inst.save()
  A(wx._toasts.includes('已详细记录'), '详细保存 toast')
  const store = makeSandbox(wx, {}).require('../../utils/store')
  const item = store.getAll().find((x) => x.name === '微单相机')
  A(!!item, '详细添加入库')
  A(item.category === '摄影摄像', '子分类保存')
  A(item.categoryGroup === '电子数码', '大分类保存')
  A(item.valuation === 0, '估值默认 0')
  A(Array.isArray(item.photos), 'photos 字段存在')
}

/* ---------- 场景 4：日历组件 ---------- */
function testCalendar() {
  freshUtils()
  console.log('▶ 日历组件')
  const wx = makeWx({})
  const cal = loadComponent('components/calpicker/calpicker.js', wx)
  cal.init('2026-11-18')
  A(cal.data.year === 2026 && cal.data.month === 11, '打开定位到当月')
  A(cal.data.grid.filter((c) => !c.empty).length === 30, '11 月 30 天')
  A(cal.data.grid[0].date === '2026-11-01', '首位对齐（11月1日周日）')

  cal.prev()
  A(cal.data.month === 10, '上一月')
  cal.next(); cal.next()
  A(cal.data.month === 12, '下一月跨年回环')

  cal.init('2026-11-18')
  cal.tapQuick({ currentTarget: { dataset: { d: '7' } } })
  A(/2026-11-1[01]/.test(cal._events.select.date), '近7天快选')
  A(cal._events.select.date === '2026-11-11', '快选日期正确')

  // 禁未来
  const cal2 = loadComponent('components/calpicker/calpicker.js', wx)
  cal2.setData({ allowFuture: false })
  cal2.init('2026-11-18')
  const future = '2027-01-01'
  const dayCell = { currentTarget: { dataset: { date: future } } }
  cal2.setData({ allowFuture: false })
  cal2.tapDay(dayCell)
  A(!cal2._events.select, '禁未来模式拦截')
}

/* ---------- 场景 5：首页统计与筛选 ---------- */
function testIndex() {
  freshUtils()
  console.log('▶ 首页')
  const wx = makeWx({
    items: [
      { id: '1', name: 'A', price: 100, buyDate: '2026-01-01', category: 'other', platform: 'jd', currency: 'CNY', retired: false, sold: false },
      { id: '2', name: 'B', price: 200, buyDate: '2026-02-01', category: 'other', platform: 'xy', currency: 'CNY', retired: true, retiredDate: '2026-03-01', sold: false },
      { id: '3', name: 'C', price: 300, buyDate: '2026-03-01', category: 'other', platform: 'tb', currency: 'USD', retired: true, retiredDate: '2026-03-05', sold: true, soldPrice: 150 }
    ]
  })
  wx._tabbar = { data: {}, setData(p) { Object.assign(this.data, p) } }
  const inst = loadPage('pages/index/index.js', wx)
  inst.onLoad({})
  inst.onShow()

  A(inst.data.count === 3, '总件数')
  A(inst.data.heldCount === 1 && inst.data.retiredCount === 1 && inst.data.soldCount === 1, '三态计数')
  A(inst.data.totalSpend === '2460.00', '总投入折算合计（USD×7.2）')

  inst.setFilter({ currentTarget: { dataset: { f: '持有中' } } })
  A(inst.data.items.length === 1 && inst.data.items[0].name === 'A', '持有中筛选')

  inst.toggleHide()
  A(inst.data.amountHidden === true, '金额隐藏')
  inst.toggleHide()
  A(inst.data.amountHidden === false, '金额恢复')

  inst.cyclePeriod()
  A(inst.data.periodLabel === '总月均', '周期切换 日→月')
  inst.cyclePeriod()
  A(inst.data.periodLabel === '总年均', '周期切换 月→年')
  A(inst.data.totalPeriodValue !== '0.00', '年均数值非零')
}

/* ---------- 场景 6：分类体系 ---------- */
function testCats() {
  freshUtils()
  console.log('▶ 分类体系')
  const wx = makeWx({})
  const cats = makeSandbox(wx, {}).require('../../utils/cats')

  const groups = cats.getGroups()
  A(groups.length === 10, '默认 10 个大分类')
  A(groups[0].name === '电子数码' && groups[0].subs.includes('手机通讯'), '默认子分类')

  A(cats.addSub('电子数码', '平板') === true, '添加子分类')
  A(cats.addSub('电子数码', '平板') === false, '重复添加拒绝')
  cats.removeSub('电子数码', '平板')
  A(!cats.getGroups().find((g) => g.name === '电子数码').subs.includes('平板'), '删除子分类')

  A(cats.getSubIcon('手机通讯', '').includes('phone'), '子分类图标映射')

  A(cats.importJSON('不是json') === 0, '坏 JSON 拒绝导入')
  const n = cats.importJSON(JSON.stringify({ groups: [{ name: '测试组', subs: ['A'] }] }))
  A(n === 1, 'JSON 导入成功')
  cats.resetDefaults()
  A(cats.getGroups().length === 10, '恢复默认')
}

/* ---------- 场景 7：标签体系 ---------- */
function testTags() {
  freshUtils()
  console.log('▶ 标签体系')
  const wx = makeWx({})
  const tags = makeSandbox(wx, {}).require('../../utils/tags')

  const base = tags.getTags().length
  A(base >= 6, '默认标签存在')

  A(tags.addTag('摄影') === true, '添加标签')
  A(tags.addTag('摄影') === false, '重复标签拒绝')
  A(tags.addTag('  ') === false, '空白标签拒绝')

  tags.removeTag('摄影')
  A(!tags.getTags().includes('摄影'), '删除标签')

  A(tags.countFor('不存在的', [{ tags: [] }]) === 0, '计数为 0')
}

/* ---------- 场景 8：TabBar 自感知 ---------- */
function testTabBar() {
  freshUtils()
  console.log('▶ TabBar 自感知')
  const wx = makeWx({})
  wx._pages = [{ route: 'pages/wishlist/wishlist' }]
  const comp = loadComponent('custom-tab-bar/index.js', wx)

  comp._syncFromRoute()
  A(comp.data.selected === 1, '路由反推选中索引')

  wx._pages = [{ route: 'pages/settings/settings' }]
  comp._syncFromRoute()
  A(comp.data.selected === 2, '切换路由后索引更新')

  A(comp.data.hideText === true, '文本默认隐藏')
}

/* ---------- 场景 9：外币价格 ---------- */
function testFx() {
  console.log('▶ 外币价格')
  freshUtils()
  const wx = makeWx({})
  wx._tabbar = { data: {}, setData(p) { Object.assign(this.data, p) } }
  const inst = loadPage('pages/fulladd/fulladd.js', wx)
  inst.onLoad({})

  inst.setData({ name: '海淘货', price: '' })
  inst.openFxSheet()
  A(inst.data.showCalc === false, '外币弹层初始计算器关闭')
  A(inst.data.fxCurrency === 'USD', '默认外币 USD')

  inst.onFxPrice({ detail: { value: '100' } })
  A(inst.data.fxConvertedText === '720.00', '折合本位币 100USD→¥720.00')

  inst.cycleFx()
  A(inst.data.fxCurrency === 'EUR', '币种轮换到 EUR')
  A(inst.data.fxRate === 7.9, '汇率随币种更新（EUR 7.9）')

  inst.onFxPrice({ detail: { value: '50' } })
  inst.confirmFx()
  A(inst.data.currency === 'CNY', '入账币种固定人民币')
  A(inst.data.symbol === '¥', '主价格行显示 ¥ 符号')
  A(inst.data.price === '395', '价格折算 50EUR→¥395')
  A(inst.data.fxSheet === false, '弹层关闭')
  inst.save()
  const store2 = makeSandbox(wx, {}).require('../../utils/store')
  const saved = store2.getAll().find((x) => x.name === '海淘货')
  A(!!saved, '保存入库')
  A(saved.price === 395, '入库价格为折合人民币')
  A(saved.fxCurrency === 'EUR' && Number(saved.fxPrice) === 50, '外币原价留档')

  // 双向：输人民币反推外币（此时币种已是 EUR，汇率 7.9）
  inst.onFxConverted({ detail: { value: '790' } })
  A(inst.data.fxPrice === '100', '¥790 反推 100EUR')
  A(inst.data.fxConvertedText === '790', '折合输入保持')

  // 计算器填外币价
  inst.openCalc({ currentTarget: { dataset: { t: 'fx' } } })
  A(inst.data.calcTarget === 'fx', '计算器目标为外币价')
  inst.calcKey({ currentTarget: { dataset: { k: '2' } } })
  inst.calcKey({ currentTarget: { dataset: { k: '0' } } })
  inst.calcKey({ currentTarget: { dataset: { k: '=' } } })
  A(inst.data.calcDisplay === '20', '计算 20')
  inst.applyCalc()
  A(inst.data.fxPrice === '20', '填入外币价')
}

/* ---------- 运行全部 ---------- */
try { testStore() } catch (e) { fails.push('store 崩溃: ' + e.message) }
try { testAddPage() } catch (e) { fails.push('add 崩溃: ' + e.message) }
try { testFullAdd() } catch (e) { fails.push('fulladd 崩溃: ' + e.message) }
try { testCalendar() } catch (e) { fails.push('calendar 崩溃: ' + e.message) }
try { testIndex() } catch (e) { fails.push('index 崩溃: ' + e.message) }
try { testCats() } catch (e) { fails.push('cats 崩溃: ' + e.message) }
try { testTags() } catch (e) { fails.push('tags 崩溃: ' + e.message) }
try { testTabBar() } catch (e) { fails.push('tabbar 崩溃: ' + e.message) }
try { testFx() } catch (e) { fails.push('fx 崩溃: ' + e.message) }

console.log('\n✅ 功能断言通过 ' + pass + ' 项')
if (fails.length) {
  console.log('❌ 失败 ' + fails.length + ' 项：')
  fails.forEach((f) => console.log('  - ' + f))
  process.exit(1)
} else {
  console.log('🎉 功能测试全部通过')
}
