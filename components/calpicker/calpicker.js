const WEEK = ['日', '一', '二', '三', '四', '五', '六']

Component({
  options: { addGlobalClass: true },
  properties: {
    visible: { type: Boolean, value: false },
    value: { type: String, value: '' },
    title: { type: String, value: '选择日期' },
    allowFuture: { type: Boolean, value: true }
  },
  data: {
    year: 2026,
    month: 1,
    sel: '',
    today: '',
    grid: [],
    week: WEEK,
    titleText: ''
  },
  observers: {
    'visible, value': function (visible, value) {
      if (visible) this.init(value)
    }
  },
  methods: {
    init(value) {
      const now = new Date()
      const p = (n) => (n < 10 ? '0' + n : '' + n)
      const todayStr = now.getFullYear() + '-' + p(now.getMonth() + 1) + '-' + p(now.getDate())
      let y = now.getFullYear()
      let m = now.getMonth() + 1
      if (value && /^\d{4}-\d{2}/.test(value)) {
        const b = value.split('-')
        y = Number(b[0])
        m = Number(b[1])
      }
      this.setData({ year: y, month: m, sel: value || '', today: todayStr })
      this.build()
    },
    build() {
      const { year, month, sel, today } = this.data
      const first = new Date(year, month - 1, 1)
      const days = new Date(year, month, 0).getDate()
      const lead = first.getDay()
      const p = (n) => (n < 10 ? '0' + n : '' + n)
      const grid = []
      for (let i = 0; i < lead; i++) grid.push({ empty: true })
      for (let d = 1; d <= days; d++) {
        const date = year + '-' + p(month) + '-' + p(d)
        grid.push({
          day: d,
          date,
          sel: date === sel,
          today: date === today
        })
      }
      while (grid.length % 7 !== 0) grid.push({ empty: true })
      this.setData({ grid, titleText: year + '年' + month + '月' })
    },
    prev() {
      let { year, month } = this.data
      month--
      if (month < 1) { month = 12; year-- }
      this.setData({ year, month })
      this.build()
    },
    next() {
      let { year, month } = this.data
      month++
      if (month > 12) { month = 1; year++ }
      this.setData({ year, month })
      this.build()
    },
    /** 快选：今天 / 近N天 */
    tapQuick(e) {
      const n = Number(e.currentTarget.dataset.d) || 0
      const d = new Date()
      d.setDate(d.getDate() - n)
      const p = (x) => (x < 10 ? '0' + x : '' + x)
      const date = d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
      this.setData({ sel: date })
      // 同步日历视图到所选月份
      this.setData({ year: d.getFullYear(), month: d.getMonth() + 1 })
      this.build()
      this.triggerEvent('select', { date })
    },

    tapDay(e) {
      const d = e.currentTarget.dataset
      if (!d.date) return
      if (!this.data.allowFuture && d.date > this.data.today) {
        wx.showToast({ title: '不能选择未来日期', icon: 'none' })
        return
      }
      this.triggerEvent('select', { date: d.date })
    },
    close() {
      this.triggerEvent('close')
    },
    noop() {}
  }
})
