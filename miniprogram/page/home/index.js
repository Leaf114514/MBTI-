const compatibilityData = require('../../data/compatibility-data')
const fallingShapes = require('../../behaviors/falling-shapes')

const MBTI_HEAD = ['IN', 'IS', 'EN', 'ES']
const MBTI_TAIL = ['TJ', 'TP', 'FJ', 'FP']

Page({
  behaviors: [fallingShapes],
  data: {
    pageAnim: '',
    userMbti: '',
    calcExpanded: false,

    // 翻牌控制
    cardFlipMode: 0,
    cardRevealed: false,

    backSparks: [],

    // 配对选择器
    MBTI_HEAD,
    MBTI_TAIL,
    leftType: '',
    rightType: '',
    pickerActive: '',
    tempHead: '',
    tempTail: '',

    // 配对结果
    resultScores: null,
    aiComment: '',
    commentLoading: false,
  },

  onLoad() {
    this._loadUserMbti()
    this._genSparks()
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 })
    }
    this._playPageAnim()
    const app = getApp()
    if (!app.globalData.hasLogin) {
      wx.navigateTo({ url: '/page/login/login' })
    }
    this._loadUserMbti()
    this._checkCardFlip()
  },

  _loadUserMbti() {
    try {
      const mbti = wx.getStorageSync('selectedMbti') || ''
      if (mbti) {
        if (mbti !== this.data.userMbti) {
          this.setData({ userMbti: mbti })
        }
      } else {
        this._loadMbtiFromCloud()
      }
    } catch (e) {
      console.warn('[Home] 读取 MBTI storage 失败', e)
      this._loadMbtiFromCloud()
    }
  },

  _loadMbtiFromCloud() {
    wx.cloud.callFunction({
      name: 'getUserProfile',
      success: (res) => {
        if (res.result && res.result.success && res.result.data && res.result.data.mbti) {
          const mbti = res.result.data.mbti
          wx.setStorageSync('selectedMbti', mbti)
          if (mbti !== this.data.userMbti) {
            this.setData({ userMbti: mbti })
          }
        }
      },
      fail: () => {}
    })
  },

  _checkCardFlip() {
    if (!this.data.userMbti) {
      this.setData({ cardRevealed: true })
      return
    }
    if (this.data.cardFlipMode === 0) {
      this.setData({ cardRevealed: false })
    } else {
      const today = new Date().toDateString()
      const lastReveal = wx.getStorageSync('lastCardReveal') || ''
      if (lastReveal === today) {
        this.setData({ cardRevealed: true })
      } else {
        this.setData({ cardRevealed: false })
      }
    }
  },

  revealCard() {
    this.setData({ cardRevealed: true })
    if (this.data.cardFlipMode === 1) {
      wx.setStorageSync('lastCardReveal', new Date().toDateString())
    }
  },

  _genSparks() {
    const syms = ['✦', '✧', '◇', '⋄', '✶', '∗', '˙']
    const sparks = []
    for (let i = 0; i < 12; i++) {
      sparks.push({
        top: (8 + Math.random() * 80) + '%',
        left: (5 + Math.random() * 85) + '%',
        size: (16 + Math.random() * 24) + 'rpx',
        rot: Math.floor(Math.random() * 360) + 'deg',
        sym: syms[Math.floor(Math.random() * syms.length)],
      })
    }
    this.setData({ backSparks: sparks })
  },

  _playPageAnim() {
    const app = getApp()
    const dir = app.globalData.tabSwitchDirection
    if (!dir) return
    app.globalData.tabSwitchDirection = null
    this.setData({ pageAnim: dir === 'right' ? 'page-slide-in-right' : 'page-slide-in-left' })
    setTimeout(() => { this.setData({ pageAnim: '' }) }, 320)
  },

  // =============================================
  //   折叠抽屉
  // =============================================

  toggleCalc() {
    this.setData({ calcExpanded: !this.data.calcExpanded })
  },

  // =============================================
  //   签语卡片事件
  // =============================================

  onFortuneTypeTap() {
    wx.switchTab({ url: '/page/profile/index' })
  },

  onShareFortune() {
    wx.showShareMenu({ withShareTicket: true })
  },

  onShareAppMessage() {
    const mbti = this.data.userMbti || 'MBTI'
    return {
      title: `我的${mbti}每日签语，来看看你的吧！`,
      path: '/page/home/index'
    }
  },

  // =============================================
  //   配对选择器 - 两步内联
  // =============================================

  openPicker(e) {
    const side = e.currentTarget.dataset.side
    if (this.data.pickerActive === side) {
      this.setData({ pickerActive: '', tempHead: '', tempTail: '' })
      return
    }
    const currentType = side === 'left' ? this.data.leftType : this.data.rightType
    this.setData({
      pickerActive: side,
      tempHead: currentType ? currentType.slice(0, 2) : '',
      tempTail: currentType ? currentType.slice(2) : '',
    })
  },

  pickHead(e) {
    this.setData({ tempHead: e.currentTarget.dataset.val })
  },

  pickTail(e) {
    this.setData({ tempTail: e.currentTarget.dataset.val })
  },

  confirmInlinePicker() {
    if (!this.data.tempHead || !this.data.tempTail) return
    const { pickerActive, tempHead, tempTail } = this.data
    const result = tempHead + tempTail
    if (pickerActive === 'left') {
      this.setData({ leftType: result, pickerActive: '', tempHead: '', tempTail: '' })
    } else {
      this.setData({ rightType: result, pickerActive: '', tempHead: '', tempTail: '' })
    }
    this._tryCalcResult()
  },

  // =============================================
  //   配对计算
  // =============================================

  _tryCalcResult() {
    const { leftType, rightType } = this.data
    if (!leftType || !rightType) return

    const key = [leftType, rightType].sort().join('-')
    const scores = compatibilityData.scores[key]

    if (scores) {
      this.setData({ resultScores: scores, aiComment: '', commentLoading: true })
      this._fetchAiComment(leftType, rightType)
    }
  },

  async _fetchAiComment(typeA, typeB) {
    try {
      const res = await wx.cloud.callFunction({
        name: 'getCompatibility',
        data: { typeA, typeB }
      })
      if (res.result && res.result.success) {
        this.setData({ aiComment: res.result.data.comment, commentLoading: false })
      } else {
        this.setData({ aiComment: '配对分析暂时不可用', commentLoading: false })
      }
    } catch (e) {
      console.error('[Home] AI 评语失败:', e)
      this.setData({ aiComment: '配对分析暂时不可用', commentLoading: false })
    }
  },

  onTryAnother() {
    this.setData({
      leftType: '',
      rightType: '',
      resultScores: null,
      aiComment: '',
      commentLoading: false,
    })
  },

  noop() {},
})
