// ============================================================
//  components/fortune-card/index.js — 每日签语卡片组件
// ============================================================
//  职责：
//    1. 根据 mbtiType 调用云函数 getDailyFortune 获取当日的签语/AI 解读
//    2. 展示签语消息、幸运色、关键词等信息
//    3. 翻牌动效：卡背→卡面后多阶段动画（大阿卡纳→牌名坠落→正文渐显）
//    4. 同一类型+同一天内缓存请求，避免重复调用云函数
// ============================================================

const cornerDecor = require('../../common/corner-decorations/decorations')
const arcanaData = require('../../data/major-arcana')

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
    cornerDecor: null,
    arcanaCard: null,             // 匹配到的大阿卡纳牌对象
    animPhase: 0,                 // 动画阶段：0=待机 1=牌面渐显 2=牌名坠落+牌面淡出 3=正文渐显 4=完成
    isLightAccent: false,         // 当前强调色是否为浅色（驱动暗色主题）
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
        // 重置动画阶段
        this._clearAnimTimers()
        this.setData({ animPhase: 0 })
        // 翻牌动画（1.04s）完成后启动多阶段动画
        this._animTimer1 = setTimeout(() => {
          // Phase 1: 大阿卡纳牌面渐显
          this.setData({ animPhase: 1 })
          // Phase 2: 600ms 后牌名坠落 + 牌面淡出 + 关键词渐显
          this._animTimer2 = setTimeout(() => {
            this.setData({ animPhase: 2 })
            // Phase 3: 400ms 后正文渐显
            this._animTimer3 = setTimeout(() => {
              this.setData({ animPhase: 3 })
              // Phase 4: 标记完成
              this._animTimer4 = setTimeout(() => {
                this.setData({ animPhase: 4 })
              }, 500)
            }, 400)
          }, 600)
        }, 1040)
        // 翻牌 1.04s 后渐变换色（等待翻转动效完成）
        setTimeout(() => {
          this._applyAccentTransition()
        }, 1040)
      } else {
        // 翻回：重置动画，恢复默认酒红色
        this._clearAnimTimers()
        this.setData({ animPhase: 0 })
        this._resetToWine()
      }
    }
  },

  lifetimes: {
    // 组件挂载时初始化日期 + 随机四角装饰
    attached() {
      this._updateDate()
      this.setData({
        cornerDecor: cornerDecor.getCornerDecor(),
        animPhase: this.data.cardRevealed ? 4 : 0,
      })
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
    //  工具：判断颜色是否为浅色（亮度 > 阈值）
    // ----------------------------------------------------------
    _isLightColor(hex) {
      const r = parseInt(hex.slice(1, 3), 16)
      const g = parseInt(hex.slice(3, 5), 16)
      const b = parseInt(hex.slice(5, 7), 16)
      return (0.299 * r + 0.587 * g + 0.114 * b) > 160
    },

    // ----------------------------------------------------------
    //  应用强调色并同步暗色主题状态
    // ----------------------------------------------------------
    _applyAccent(hex) {
      const isLight = this._isLightColor(hex)
      this.setData({
        accentColor: hex,
        accentRgb: this._hexToRgb(hex),
        isLightAccent: isLight,
      })
      this.triggerEvent('themeChange', { isLight: isLight, accentColor: hex })
    },

    // ----------------------------------------------------------
    //  恢复为酒红色（卡背面的默认色）
    // ----------------------------------------------------------
    _resetToWine() {
      this.setData({
        accentColor: '#4A1942',
        accentRgb: '74,25,66',
        isLightAccent: false,
      })
      this.triggerEvent('themeChange', { isLight: false, accentColor: '#4A1942' })
    },

    // ----------------------------------------------------------
    //  翻牌后应用幸运色渐变过渡
    // ----------------------------------------------------------
    _applyAccentTransition() {
      const hex = this.data.luckyColor && this.data.luckyColor.hex ? this.data.luckyColor.hex : '#FF6B6B'
      this._applyAccent(hex)
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
            const keywords = res.result.data.keywords || []
            const arcanaCard = arcanaData.getArcanaByKeywords(keywords)
            this.setData({
              showPrompt: false,
              message: res.result.data.message,
              luckyColor: res.result.data.luckyColor,
              keywords: keywords,
              arcanaCard: arcanaCard,
              loadError: false,
              loading: false,
            })
            // 已翻牌状态立即应用强调色
            if (this.data.cardRevealed) {
              this._applyAccent(hex)
            }
            // 异步竞态处理：数据迟到但翻牌已完成且动画未启动
            if (this.data.cardRevealed && this.data.animPhase === 0) {
              this.setData({ animPhase: 1 })
              this._startPhaseTimers()
            }
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
    //  清理所有动画计时器
    // ----------------------------------------------------------
    _clearAnimTimers() {
      if (this._animTimer1) clearTimeout(this._animTimer1)
      if (this._animTimer2) clearTimeout(this._animTimer2)
      if (this._animTimer3) clearTimeout(this._animTimer3)
      if (this._animTimer4) clearTimeout(this._animTimer4)
      if (this._animTimer5) clearTimeout(this._animTimer5)
      this._animTimer1 = this._animTimer2 = this._animTimer3 = null
      this._animTimer4 = this._animTimer5 = null
    },

    // ----------------------------------------------------------
    //  从 Phase 2 开始的计时器链（用于数据迟到时手动启动）
    // ----------------------------------------------------------
    _startPhaseTimers() {
      this._animTimer2 = setTimeout(() => {
        this.setData({ animPhase: 2 })
        this._animTimer3 = setTimeout(() => {
          this.setData({ animPhase: 3 })
          this._animTimer4 = setTimeout(() => {
            this.setData({ animPhase: 4 })
          }, 500)
        }, 400)
      }, 600)
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