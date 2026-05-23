Component({
  properties: {
    mbtiType: { type: String, value: '' }
  },

  data: {
    loading: false,
    dateStr: '',
    weekday: '',
    message: '',
    luckyColor: null,
    keywords: [],
    showPrompt: true,
  },

  observers: {
    mbtiType(val) {
      this._updateDate()
      if (val) {
        this._loadFortune(val)
      } else {
        this.setData({ showPrompt: true, message: '', luckyColor: null, keywords: [] })
      }
    }
  },

  lifetimes: {
    attached() {
      this._updateDate()
    }
  },

  methods: {
    _updateDate() {
      const now = new Date()
      const pad = n => (n < 10 ? '0' + n : '' + n)
      const weekdays = ['日', '一', '二', '三', '四', '五', '六']
      this.setData({
        dateStr: now.getFullYear() + '.' + pad(now.getMonth() + 1) + '.' + pad(now.getDate()),
        weekday: '星期' + weekdays[now.getDay()]
      })
    },

    _loadFortune(type) {
      if (this._lastType === type && this._lastDay === new Date().getDate()) return
      this._lastType = type
      this._lastDay = new Date().getDate()

      this.setData({ loading: true })
      wx.cloud.callFunction({
        name: 'getDailyFortune',
        data: { type },
        success: (res) => {
          if (res.result && res.result.success) {
            this.setData({
              showPrompt: false,
              message: res.result.data.message,
              luckyColor: res.result.data.luckyColor,
              keywords: res.result.data.keywords || [],
              loading: false,
            })
          } else {
            this.setData({ loading: false })
          }
        },
        fail: () => {
          this.setData({ loading: false })
        }
      })
    },

    onTypeTap() {
      this.triggerEvent('typeTap')
    },

    onGoSelect() {
      this.triggerEvent('typeTap')
    },

    onShare() {
      this.triggerEvent('shareTap')
    }
  }
})
