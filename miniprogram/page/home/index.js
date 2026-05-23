const compatibilityData = require('../../data/compatibility-data')

const MBTI_HEAD = ['IN', 'IS', 'EN', 'ES']
const MBTI_TAIL = ['TJ', 'TP', 'FJ', 'FP']
const ANIM_OUT_DURATION = 260

Page({
  data: {
    pageAnim: '',
    userMbti: '',

    // 配对选择器
    MBTI_HEAD,
    MBTI_TAIL,
    leftType: '',
    rightType: '',
    leftPickerValue: [0, 0],
    rightPickerValue: [0, 0],
    leftSelecting: false,
    rightSelecting: false,
    leftHiding: false,
    rightHiding: false,

    // 配对结果
    resultScores: null,
    aiComment: '',
    commentLoading: false,
  },

  onLoad() {
    this._loadUserMbti()
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

  _playPageAnim() {
    const app = getApp()
    const dir = app.globalData.tabSwitchDirection
    if (!dir) return
    app.globalData.tabSwitchDirection = null
    this.setData({ pageAnim: dir === 'right' ? 'page-slide-in-right' : 'page-slide-in-left' })
    setTimeout(() => { this.setData({ pageAnim: '' }) }, 320)
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
  //   配对选择器 - 左侧
  // =============================================

  onToggleLeftPicker() {
    const { leftSelecting, leftHiding, rightSelecting } = this.data
    if (leftHiding) return
    if (leftSelecting) {
      this.setData({ leftHiding: true })
      setTimeout(() => {
        this.setData({ leftSelecting: false, leftHiding: false })
      }, ANIM_OUT_DURATION)
    } else {
      const updates = { leftSelecting: true }
      if (rightSelecting) {
        updates.rightSelecting = false
        updates.rightHiding = false
      }
      this.setData(updates)
    }
  },

  onLeftPickerChange(e) {
    const [h, t] = e.detail.value
    this.setData({ leftPickerValue: e.detail.value })
  },

  onConfirmLeft() {
    const { leftPickerValue } = this.data
    const result = MBTI_HEAD[leftPickerValue[0]] + MBTI_TAIL[leftPickerValue[1]]
    this.setData({ leftHiding: true })
    setTimeout(() => {
      this.setData({ leftType: result, leftSelecting: false, leftHiding: false })
      this._tryCalcResult()
    }, ANIM_OUT_DURATION)
  },

  // =============================================
  //   配对选择器 - 右侧
  // =============================================

  onToggleRightPicker() {
    const { rightSelecting, rightHiding, leftSelecting } = this.data
    if (rightHiding) return
    if (rightSelecting) {
      this.setData({ rightHiding: true })
      setTimeout(() => {
        this.setData({ rightSelecting: false, rightHiding: false })
      }, ANIM_OUT_DURATION)
    } else {
      const updates = { rightSelecting: true }
      if (leftSelecting) {
        updates.leftSelecting = false
        updates.leftHiding = false
      }
      this.setData(updates)
    }
  },

  onRightPickerChange(e) {
    const [h, t] = e.detail.value
    this.setData({ rightPickerValue: e.detail.value })
  },

  onConfirmRight() {
    const { rightPickerValue } = this.data
    const result = MBTI_HEAD[rightPickerValue[0]] + MBTI_TAIL[rightPickerValue[1]]
    this.setData({ rightHiding: true })
    setTimeout(() => {
      this.setData({ rightType: result, rightSelecting: false, rightHiding: false })
      this._tryCalcResult()
    }, ANIM_OUT_DURATION)
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
      leftPickerValue: [0, 0],
      rightPickerValue: [0, 0],
      resultScores: null,
      aiComment: '',
      commentLoading: false,
    })
  },

  noop() {},
})
