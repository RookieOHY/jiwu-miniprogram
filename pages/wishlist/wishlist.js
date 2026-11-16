const store = require('../../utils/store')

Page({
  onShow() {
    // 同步胶囊 TabBar 选中态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 })
    }
  }
})
