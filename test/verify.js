/**
 * 推送前自检：语法 / 绑定 / 导出 / 组件注册 全量校验
 * 用法：node test/verify.js   （有 FAIL 则退出码 1）
 */
const fs = require('fs')
const path = require('path')
const vm = require('vm')
const root = path.resolve(__dirname, '..')

let pass = 0, fails = []
const fail = (msg) => fails.push(msg)
const ok = (msg) => pass++

/* ---------- 工具 ---------- */
function listPages() {
  const app = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'))
  return app.pages.map((p) => p)
}

function stubGlobals(sandbox) {
  sandbox.wx = new Proxy({}, { get: () => () => sandbox.__wxRet })
  sandbox.__wxRet = undefined
  sandbox.getCurrentPages = () => [{ route: 'pages/index/index' }]
  sandbox.getApp = () => ({})
  sandbox.Component = (cfg) => { sandbox.__component = cfg }
  sandbox.Page = (cfg) => { sandbox.__page = cfg }
  sandbox.App = () => {}
  sandbox.console = console
  sandbox.setTimeout = () => {}
  sandbox.JSON = JSON
  sandbox.Math = Math
  sandbox.Date = Date
  sandbox.Object = Object
  sandbox.Array = Array
  sandbox.Number = Number
  sandbox.String = String
  sandbox.parseFloat = parseFloat
  sandbox.parseInt = parseInt
  sandbox.RegExp = RegExp
  sandbox.Error = Error
  return sandbox
}

function loadModule(rel) {
  const file = path.join(root, rel)
  const code = fs.readFileSync(file, 'utf8')
  const sandbox = stubGlobals({ __component: null, __page: null })
  sandbox.require = (r) => {
    if (r.endsWith('utils/store') || r.endsWith('utils/store.js')) return loadUtils('utils/store.js')
    if (r.endsWith('utils/cats')) return loadUtils('utils/cats.js')
    if (r.endsWith('utils/icons')) return loadUtils('utils/icons.js')
    if (r.endsWith('utils/tags')) return loadUtils('utils/tags.js')
    if (r.endsWith('utils/cloud')) return {}
    if (r.endsWith('utils/tabAnim')) return () => {}
    if (r.endsWith('utils/poster')) return {}
    return {}
  }
  sandbox.module = { exports: {} }
  sandbox.exports = sandbox.module.exports
  vm.createContext(sandbox)
  new vm.Script(code, { filename: rel }).runInContext(sandbox)
  return sandbox
}

const utilsCache = {}
function loadUtils(rel) {
  if (utilsCache[rel]) return utilsCache[rel]
  const file = path.join(root, rel)
  const code = fs.readFileSync(file, 'utf8')
  const sandbox = stubGlobals({ __wxRet: '' })
  sandbox.require = () => ({})
  sandbox.module = { exports: {} }
  sandbox.exports = sandbox.module.exports
  vm.createContext(sandbox)
  new vm.Script(code, { filename: rel }).runInContext(sandbox)
  utilsCache[rel] = sandbox.module.exports
  return utilsCache[rel]
}

/* ---------- 1. 语法检查所有 JS ---------- */
function syntaxAll() {
  const files = ['app.js', 'utils/store.js', 'utils/cats.js', 'utils/icons.js', 'utils/tags.js',
    'utils/cloud.js', 'utils/tabAnim.js', 'utils/poster.js',
    'custom-tab-bar/index.js']
  listPages().forEach((p) => files.push(p + '.js'))
  files.push('components/calpicker/calpicker.js')
  files.forEach((rel) => {
    try {
      const file = path.join(root, rel)
      new vm.Script(fs.readFileSync(file, 'utf8'), { filename: rel })
      ok('语法 ' + rel)
    } catch (e) {
      fail('语法 ' + rel + ' → ' + e.message)
    }
  })
}

/* ---------- 2. 页面 wxml 绑定的 handler 必须存在于 js ---------- */
function checkHandlers() {
  listPages().forEach((p) => {
    const wxml = fs.readFileSync(path.join(root, p + '.wxml'), 'utf8')
    const js = fs.readFileSync(path.join(root, p + '.js'), 'utf8')
    const handlers = [...wxml.matchAll(/(?:bind|catch)(?:tap|change|confirm|input)="([A-Za-z_]\w*)"/g)]
    handlers.forEach((m) => {
      const h = m[1]
      const re = new RegExp('(^|[^\\w])' + h + '\\s*[(:=]')
      if (!re.test(js)) fail(p + ' wxml 绑定了未定义的 handler：' + h)
      else pass++
    })
  })
  ok('handler 绑定检查完成')
}

/* ---------- 3. usingComponents 路径必须存在 ---------- */
function checkComponents() {
  listPages().forEach((p) => {
    const jsonFile = path.join(root, p + '.json')
    if (!fs.existsSync(jsonFile)) return
    const json = JSON.parse(fs.readFileSync(jsonFile, 'utf8'))
    Object.values(json.usingComponents || {}).forEach((v) => {
      const file = path.join(root, v.replace(/^\//, '') + '.json')
      if (fs.existsSync(file)) ok('组件存在 ' + v)
      else fail(p + ' usingComponents 缺失：' + v)
    })
  })
}

/* ---------- 4. app.json 页面文件齐全 ---------- */
function checkPages() {
  listPages().forEach((p) => {
    ;['js', 'wxml', 'json'].forEach((ext) => {
      if (fs.existsSync(path.join(root, p + '.' + ext))) ok(p + '.' + ext)
      else fail('页面缺文件：' + p + '.' + ext)
    })
  })
}

/* ---------- 5. 工具库导出完整性（本地实跑） ---------- */
function checkExports() {
  const src = []
  listPages().forEach((p) => src.push(fs.readFileSync(path.join(root, p + '.js'), 'utf8')))
  src.push(fs.readFileSync(path.join(root, 'custom-tab-bar/index.js'), 'utf8'))
  src.push(fs.readFileSync(path.join(root, 'app.js'), 'utf8'))
  const all = src.join('\n')

  const store = loadUtils('utils/store.js')
  const cats = loadUtils('utils/cats.js')
  const icons = loadUtils('utils/icons.js')
  const tags = loadUtils('utils/tags.js')

  // 逐文件：找到该文件的导入名，再扫其调用
  const modMap = {
    'utils/store.js': store, 'utils/cats.js': cats,
    'utils/icons.js': icons, 'utils/tags.js': tags
  }
  const files = listPages().map((p) => p + '.js')
  files.push('custom-tab-bar/index.js', 'app.js')
  files.forEach((fileRel) => {
    const src = fs.readFileSync(path.join(root, fileRel), 'utf8')
    Object.keys(modMap).forEach((mod) => {
      const shortName = mod.split('/').pop().split('.')[0]
      const reImp = new RegExp('(?:const|var)\\s+' + shortName + '\\s*=\\s*require')
      if (!reImp.test(src)) return
      const re = new RegExp('\\b' + shortName + '\\.(\\w+)\\(', 'g')
      let m
      const used = new Set()
      while ((m = re.exec(src))) used.add(m[1])
      used.forEach((fn) => {
        if (typeof modMap[mod][fn] !== 'function') fail(fileRel + ' 调用 ' + shortName + '.' + fn + ' 但未导出')
        else pass++
      })
    })
  })
  ok('工具库导出完整性检查完成')
}

/* ---------- 6. 组件标签在 wxml 中存在且已注册 ---------- */
function checkTagUsage() {
  listPages().forEach((p) => {
    const wxml = fs.readFileSync(path.join(root, p + '.wxml'), 'utf8')
    const jsonFile = path.join(root, p + '.json')
    if (!fs.existsSync(jsonFile)) return
    const json = JSON.parse(fs.readFileSync(jsonFile, 'utf8'))
    const reg = json.usingComponents || {}
    Object.keys(reg).forEach((tag) => {
      const re = new RegExp('<' + tag + '[\\s>]')
      if (re.test(wxml)) ok('组件标签使用 ' + tag)
    })
  })
  // showCal 为 true 的页面必须包含对应组件标签
  listPages().forEach((p) => {
    const wxml = fs.readFileSync(path.join(root, p + '.wxml'), 'utf8')
    const js = fs.readFileSync(path.join(root, p + '.js'), 'utf8')
    if (/showCal:\s*false/.test(js) && !/cal-picker/.test(wxml)) {
      fail(p + ' 使用了 showCal 但缺少 <cal-picker> 组件标签')
    } else pass++
  })
}

/* ---------- 运行 ---------- */
syntaxAll()
checkHandlers()
checkComponents()
checkPages()
checkExports()
checkTagUsage()

console.log('✅ 通过 ' + pass + ' 项')
if (fails.length) {
  console.log('\n❌ 失败 ' + fails.length + ' 项：')
  fails.forEach((f) => console.log('  - ' + f))
  process.exit(1)
} else {
  console.log('🎉 全部自检通过')
}
