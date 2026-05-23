const MBTI_HEAD = ['IN', 'IS', 'EN', 'ES']
const MBTI_TAIL = ['TJ', 'TP', 'FJ', 'FP']

const MBTI_DESC = {
  INTJ: '建筑师 · 独立、有远见的战略思考者',
  INTP: '逻辑学家 · 富有创造力的发明家',
  ENTJ: '指挥官 · 大胆、果断的领导者',
  ENTP: '辩论家 · 聪明好奇的思想挑战者',
  INFJ: '提倡者 · 安静而神秘的理想主义者',
  INFP: '调停者 · 诗意、善良的利他主义者',
  ENFJ: '主人公 · 富有魅力的激励者',
  ENFP: '竞选者 · 热情、有创造力的社交者',
  ISTJ: '物流师 · 务实可靠的传统守卫者',
  ISFJ: '守卫者 · 专注温暖的守护者',
  ESTJ: '总经理 · 专注有序的管理者',
  ESFJ: '执政官 · 善于关心他人的社交者',
  ISTP: '鉴赏家 · 灵活务实的工匠',
  ISFP: '探险家 · 灵活有魅力的艺术家',
  ESTP: '企业家 · 精明直接的行动派',
  ESFP: '表演者 · 自发热情的娱乐者',
}

const ANIM_OUT_DURATION = 260

Page({
  data: {
    MBTI_HEAD,
    MBTI_TAIL,
    isMbtiSelecting: false,
    isMbtiHiding: false,
    mbtiPickerValue: [0, 0],
    selectedMbti: '',
    currentMbtiDisplay: MBTI_HEAD[0] + MBTI_TAIL[0],
    mbtiDesc: '',
  },

  onLoad() {
    this._loadMbti()
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 })
    }
    this._playPageAnim()
    this._loadMbti()
  },

  _loadMbti() {
    try {
      const mbti = wx.getStorageSync('selectedMbti') || ''
      if (mbti !== this.data.selectedMbti) {
        this.setData({
          selectedMbti: mbti,
          mbtiDesc: MBTI_DESC[mbti] || '',
        })
      }
    } catch (e) {
      console.warn('[Profile] 读取 MBTI 失败', e)
    }
  },

  _playPageAnim() {
    const app = getApp()
    const dir = app.globalData.tabSwitchDirection
    if (!dir) return
    app.globalData.tabSwitchDirection = null
    this.setData({ pageAnim: dir === 'right' ? 'page-slide-in-right' : 'page-slide-in-left' })
    setTimeout(() => { this.setData({ pageAnim: '' }) }, 320)
  },

  // MBTI 选择器
  onToggleMbtiPicker() {
    const { isMbtiSelecting, isMbtiHiding } = this.data
    if (isMbtiHiding) return

    if (isMbtiSelecting) {
      this.setData({ isMbtiHiding: true })
      setTimeout(() => {
        this.setData({ isMbtiSelecting: false, isMbtiHiding: false })
      }, ANIM_OUT_DURATION)
    } else {
      this.setData({ isMbtiSelecting: true })
    }
  },

  onMbtiPickerChange(e) {
    const [h, t] = e.detail.value
    this.setData({
      mbtiPickerValue: e.detail.value,
      currentMbtiDisplay: MBTI_HEAD[h] + MBTI_TAIL[t],
    })
  },

  onConfirmMbti() {
    const { mbtiPickerValue } = this.data
    const result = MBTI_HEAD[mbtiPickerValue[0]] + MBTI_TAIL[mbtiPickerValue[1]]

    this.setData({ isMbtiHiding: true })
    setTimeout(() => {
      this.setData({
        selectedMbti: result,
        isMbtiSelecting: false,
        isMbtiHiding: false,
        mbtiDesc: MBTI_DESC[result] || '',
      })
      wx.setStorageSync('selectedMbti', result)
      this._syncMbtiToCloud(result)
    }, ANIM_OUT_DURATION)
  },

  _syncMbtiToCloud(mbti) {
    wx.cloud.callFunction({
      name: 'updateMbti',
      data: { mbti },
      success: (res) => {
        if (res.result && res.result.success) {
          console.log('[Profile] MBTI 已同步到云端')
        } else {
          console.warn('[Profile] MBTI 云端同步失败:', res.result && res.result.error)
        }
      },
      fail: (err) => {
        console.warn('[Profile] MBTI 云端同步失败:', err)
      }
    })
  },

  // 快捷入口
  onGoHistory() {
    wx.navigateTo({ url: '/page/history/history' })
  },

  onGoStory() {
    wx.switchTab({ url: '/page/mbti/index' })
  },
})
