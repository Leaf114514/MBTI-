// ============================================================
//  components/fortune-card/index.js — 每日签语卡片组件
// ============================================================
//  职责：
//    1. 根据 mbtiType 调用云函数 getDailyFortune 获取当日的签语/AI 解读
//    2. 展示签语消息、幸运色、关键词等信息
//    3. 翻牌动效：卡背→卡面翻转时同步变换强调色
//    4. 同一类型+同一天内缓存请求，避免重复调用云函数
// ============================================================

Component({
  // ----------------------------------------------------------
  //  Props
  //  - mbtiType:     MBTI 类型字符串（如 "ENFP"），驱动云函数查询
  //  - cardRevealed: 是否翻牌（true=卡面，false=卡背）
  // ----------------------------------------------------------
  properties: {
    mbtiType: { type: String, value: '' },
    cardRevealed: { type: Boolean, value: true }
  },

  // ----------------------------------------------------------
  //  内部状态
  //  - loading:      是否正在请求云函数
  //  - loadError:    请求是否失败（用于重试按钮显示）
  //  - dateNum:      日期展示 "M·D" 格式
  //  - message:      签语消息正文
  //  - luckyColor:   幸运色对象 { hex, name }
  //  - accentColor:  当前强调色（翻牌时渐变过渡）
  //  - accentRgb:    强调色的 RGB 分量（用于半透明背景）
  //  - keywords:     关键词列表
  //  - showPrompt:   是否显示引导提示（未选择 MBTI 时）
  // ----------------------------------------------------------
  data: {
    loading: false,
    loadError: false,
    dateNum: '',
    message: '',
    luckyColor: null,
    accentColor: '#4A1942',       // 默认酒红色
    accentRgb: '74,25,66',
    keywords: [],
    showPrompt: true,
  },

  // ----------------------------------------------------------
  //  数据观察器
  //  - mbtiType 变化时：重置状态，重新请求签语
  //  - cardRevealed 变化时：翻牌 → 渐变换色 / 翻回 → 恢复酒红
  // ----------------------------------------------------------
  observers: {
    mbtiType(val) {
      this._updateDate()
      if (val) {
        // 有 MBTI 类型：隐藏提示，发起请求
        this.setData({ showPrompt: false, loadError: false })
        this._loadFortune(val)
      } else {
        // 无 MBTI 类型：显示提示，重置数据
        this.setData({ showPrompt: true, loadError: false, message: '', luckyColor: null, keywords: [] })
      }
    },

    cardRevealed(val) {
      if (val) {
        // 翻牌 1.04s 后渐变换色（等待翻转动效完成）
        setTimeout(() => {
          this._applyAccentTransition()
        }, 1040)
      } else {
        // 翻回：立即恢复默认酒红色
        this._resetToWine()
      }
    }
  },

  lifetimes: {
    // 组件挂载时更新日期显示
    attached() {
      this._updateDate()
    }
  },

  methods: {
    // ----------------------------------------------------------
    //  工具：获取当前日期 "月·日" 格式
    // ----------------------------------------------------------
    _updateDate() {
      const now = new Date()
      const day = now.getDate()
      const month = now.getMonth() + 1
      this.setData({
        dateNum: month + '·' + day
      })
    },

    // ----------------------------------------------------------
    //  工具：HEX 颜色 → RGB 分量字符串
    //  如 "#FF6B6B" → "255,107,107"
    // ----------------------------------------------------------
    _hexToRgb(hex) {
      const r = parseInt(hex.slice(1, 3), 16)
      const g = parseInt(hex.slice(3, 5), 16)
      const b = parseInt(hex.slice(5, 7), 16)
      return r + ',' + g + ',' + b
    },

    // ----------------------------------------------------------
    //  恢复为酒红色（卡背面的默认色）
    // ----------------------------------------------------------
    _resetToWine() {
      this.setData({
        accentColor: '#4A1942',
        accentRgb: '74,25,66'
      })
    },

    // ----------------------------------------------------------
    //  翻牌后应用幸运色渐变过渡
    // ----------------------------------------------------------
    _applyAccentTransition() {
      const hex = this.data.luckyColor && this.data.luckyColor.hex ? this.data.luckyColor.hex : '#FF6B6B'
      this.setData({
        accentColor: hex,
        accentRgb: this._hexToRgb(hex)
      })
    },

    // ----------------------------------------------------------
    //  从云函数加载签语
    //  内置缓存：同一 type + 同一天内不会重复请求
    //  @param {string} type — MBTI 类型
    // ----------------------------------------------------------
    _loadFortune(type) {
      // 同类型 + 同一天 = 命中缓存，跳过
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
              // 根据当前翻牌状态决定是否立即应用幸运色
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

    // ----------------------------------------------------------
    //  事件：点击 MBTI 类型文字 → 跳转到个人中心选择
    // ----------------------------------------------------------
    onTypeTap() {
      this.triggerEvent('typeTap')
    },

    // ----------------------------------------------------------
    //  事件：点击引导中的"去选择"按钮
    // ----------------------------------------------------------
    onGoSelect() {
      this.triggerEvent('typeTap')
    },

    // ----------------------------------------------------------
    //  事件：分享按钮
    // ----------------------------------------------------------
    onShare() {
      this.triggerEvent('shareTap')
    },

    // ----------------------------------------------------------
    //  重试：清除缓存标记，重新请求
    // ----------------------------------------------------------
    onRetry() {
      this._lastType = null
      this._lastDay = null
      if (this.data.mbtiType) {
        this._loadFortune(this.data.mbtiType)
      }
    }
  }
})