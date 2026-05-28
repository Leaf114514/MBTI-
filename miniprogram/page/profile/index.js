// ============================================================
//  page/profile/index.js — 个人中心页（Tab 3）
// ============================================================
//  职责：
//    1. MBTI 类型选择器（双列滚轮展开/收起）
//    2. 显示已选 MBTI 的描述文案
//    3. 背景形状动画开关
//    4. 快捷入口：历史故事 / 生成故事
//    5. MBTI 变更后自动同步到云端
// ============================================================

// MBTI 选择器数据源
const MBTI_HEAD = ['IN', 'IS', 'EN', 'ES']
const MBTI_TAIL = ['TJ', 'TP', 'FJ', 'FP']

// 背景形状动画 behavior
const fallingShapes = require('../../behaviors/falling-shapes')

// ----------------------------------------------------------
//  16 种 MBTI 的中文描述（用于 Profile 页展示）
// ----------------------------------------------------------
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

// 选择器收起飞出动画时长（ms），需与 WXSS 保持一致
const ANIM_OUT_DURATION = 260

Page({
  // 混入背景形状动画
  behaviors: [fallingShapes],

  // ----------------------------------------------------------
  //  页面数据
  // ----------------------------------------------------------
  data: {
    // 选择器数据源
    MBTI_HEAD,
    MBTI_TAIL,

    // MBTI 选择器状态
    isMbtiSelecting: false,      // 选择器是否展开
    isMbtiHiding: false,         // 选择器是否在动画收起飞出
    mbtiPickerValue: [0, 0],     // 当前滚轮值
    selectedMbti: '',            // 已确认的类型（如 "ENFP"）
    currentMbtiDisplay: MBTI_HEAD[0] + MBTI_TAIL[0], // 预览文本
    mbtiDesc: '',                // 对应类型的描述文案

    // 形状动画开关
    toggleLabel: 'O',            // O=显示 / \=关闭
    toggleShaking: false,        // 开关抖动动画
  },

  // ----------------------------------------------------------
  //  页面加载：读取已有 MBTI + 同步开关状态
  // ----------------------------------------------------------
  onLoad() {
    this._loadMbti()
    const enabled = getApp().globalData.shapesEnabled !== false
    this.setData({ toggleLabel: enabled ? 'O' : '\\' })
  },

  // ----------------------------------------------------------
  //  页面显示：同步 TabBar + 入页动画 + 刷新 MBTI
  // ----------------------------------------------------------
  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 })
    }
    this._playPageAnim()
    this._loadMbti()
  },

  // ----------------------------------------------------------
  //  读取 MBTI：优先从 storage → 匹配描述
  // ----------------------------------------------------------
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

  // Tab 切换时的页面滑入动画
  _playPageAnim() {
    const app = getApp()
    const dir = app.globalData.tabSwitchDirection
    if (!dir) return
    app.globalData.tabSwitchDirection = null
    this.setData({ pageAnim: dir === 'right' ? 'page-slide-in-right' : 'page-slide-in-left' })
    setTimeout(() => { this.setData({ pageAnim: '' }) }, 320)
  },

  // =============================================
  //   MBTI 选择器
  // =============================================

  // 展开/收起 MBTI 选择器
  onToggleMbtiPicker() {
    const { isMbtiSelecting, isMbtiHiding } = this.data
    if (isMbtiHiding) return  // 动画进行中，忽略

    if (isMbtiSelecting) {
      // 收起选择器
      this.setData({ isMbtiHiding: true })
      setTimeout(() => {
        this.setData({ isMbtiSelecting: false, isMbtiHiding: false })
      }, ANIM_OUT_DURATION)
    } else {
      // 展开选择器
      this.setData({ isMbtiSelecting: true })
    }
  },

  // 滚轮值变化 → 实时预览
  onMbtiPickerChange(e) {
    const [h, t] = e.detail.value
    this.setData({
      mbtiPickerValue: e.detail.value,
      currentMbtiDisplay: MBTI_HEAD[h] + MBTI_TAIL[t],
    })
  },

  // 确认 MBTI → 持久化 storage + 同步云端 + 更新描述
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

  // ----------------------------------------------------------
  //  同步 MBTI 到云端（带完整的成功/失败日志）
  // ----------------------------------------------------------
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

  // =============================================
  //   快捷入口
  // =============================================

  // 跳转历史故事页
  onGoHistory() {
    wx.navigateTo({ url: '/page/history/history' })
  },

  // 跳转故事生成页（Tab 页）
  onGoStory() {
    wx.switchTab({ url: '/page/mbti/index' })
  },

  // =============================================
  //   形状动画开关
  // =============================================

  // 切换背景形状动画的显示/隐藏
  // 状态持久化到 globalData + storage，所有页面共享
  onToggleShapes() {
    const app = getApp()
    const current = app.globalData.shapesEnabled !== false
    const next = !current
    app.globalData.shapesEnabled = next
    wx.setStorageSync('shapesEnabled', next)
    this.setData({
      toggleShaking: true,
      toggleLabel: next ? 'O' : '\\',
      shapesHidden: !next,
    })
    setTimeout(() => {
      this.setData({ toggleShaking: false })
    }, 500)
  },
})