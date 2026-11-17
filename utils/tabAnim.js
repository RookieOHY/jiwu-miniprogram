/**
 * 胶囊 Tab 切换动画（方案 B：方向感知滑入）
 * 每个 tab 页在 onShow 里调用 tabAnim(this)，并根据切换方向给根节点加动画类：
 *   - 切到右边的 tab：内容从右侧滑入
 *   - 切到左边的 tab：内容从左侧滑入
 *   - 首次进入 / 同 tab 重复显示：纯淡入
 * 页面 WXML 根节点需绑定：<view class="page {{tabAnim}}">
 */
module.exports = function tabAnim(page) {
  const bar = typeof page.getTabBar === 'function' && page.getTabBar()
  if (!bar) return

  const cur = bar.data.selected
  const last = page._lastTab
  page._lastTab = cur

  let cls = 'tab-anim-fade'
  if (last !== undefined && last !== cur) {
    cls = cur > last ? 'tab-anim-right' : 'tab-anim-left'
  }

  // 先清空再赋值，强制重新触发 CSS 动画（tab 页常驻内存，onShow 会多次触发）
  page.setData({ tabAnim: '' }, () => {
    page.setData({ tabAnim: cls })
  })
}
