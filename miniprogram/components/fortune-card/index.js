Component({
  properties: {
    mbtiType: { type: String, value: '' },
    cardRevealed: { type: Boolean, value: true }
  },

  data: {
    loading: false,
    loadError: false,
    dateNum: '',
    message: '',
    luckyColor: null,
    accentColor: '#4A1942',
    accentRgb: '74,25,66',
    keywords: [],
    showPrompt: true,
  },

  observers: {
    mbtiType(val) {
      this._updateDate()
      if (val) {
        this.setData({ showPrompt: false, loadError: false })
        this._loadFortune(val)
      } else {
        this.setData({ showPrompt: true, loadError: false, message: '', luckyColor: null, keywords: [] })
      }
    },

    cardRevealed(val) {
      if (val) {
        setTimeout(() => {
          this._applyAccentTransition()
        }, 1040)
      } else {
        this._resetToWine()
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
      const day = now.getDate()
      const month = now.getMonth() + 1
      this.setData({
        dateNum: month + '·' + day
      })
    },

    _hexToRgb(hex) {
      const r = parseInt(hex.slice(1, 3), 16)
      const g = parseInt(hex.slice(3, 5), 16)
      const b = parseInt(hex.slice(5, 7), 16)
      return r + ',' + g + ',' + b
    },

    _resetToWine() {
      this.setData({
        accentColor: '#4A1942',
        accentRgb: '74,25,66'
      })
    },

    _applyAccentTransition() {
      const hex = this.data.luckyColor && this.data.luckyColor.hex ? this.data.luckyColor.hex : '#FF6B6B'
      this.setData({
        accentColor: hex,
        accentRgb: this._hexToRgb(hex)
      })
    },

    _loadFortune(type) {
      if (this._lastType === type && this._lastDay === new Date().getDate()) return
      this._lastType = type
      this._lastDay = new Date().getDate()

      this.setData({ loading: true, showPrompt: false })
      wx.cloud.callFunction({
        name: 'getDailyFortune',
        data: { type },
        success: (res) => {
          if (res.result && res.result.success) {
            const hex = (res.result.data.luckyColor && res.result.data.luckyColor.hex) || '#FF6B6B'
            this.setData({
              showPrompt: false,
              message: res.result.data.message,
              luckyColor: res.result.data.luckyColor,
              accentColor: this.data.cardRevealed ? hex : '#4A1942',
              accentRgb: this.data.cardRevealed ? this._hexToRgb(hex) : '74,25,66',
              keywords: res.result.data.keywords || [],
              loadError: false,
              loading: false,
            })
          } else {
            this.setData({ loadError: true, loading: false })
          }
        },
        fail: () => {
          this.setData({ loadError: true, loading: false })
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
    },

    onRetry() {
      this._lastType = null
      this._lastDay = null
      if (this.data.mbtiType) {
        this._loadFortune(this.data.mbtiType)
      }
    }
  }
})
