// ============================================================
//  page/home/index.js — 主页（Tab 1）
// ============================================================
//  职责：
//    1. 展示每日签语卡片（通过 fortune-card 组件）
//    2. MBTI 配对计算器（两人类型 → 兼容分数 + AI 评语）
//    3. 翻牌机制：每日首次进入需翻牌（次日重置）
//    4. 未登录重定向到登录页
//    5. 卡片背面星芒装饰
// ============================================================

// 模块引入
const compatibilityData = require('../../data/compatibility-data')  // 兼容性评分数据
const fallingShapes = require('../../behaviors/falling-shapes')     // 背景形状动画 behavior
const constellationRing = require('../../common/constellation-ring')  // 星座绘制工具
const cornerDecor = require('../../common/corner-decorations/decorations')  // 四角装饰配置

// MBTI 类型拼接 —— 所有类型 = 头部(2 字母) + 尾部(2 字母)
const MBTI_HEAD = ['IN', 'IS', 'EN', 'ES']
const MBTI_TAIL = ['TJ', 'TP', 'FJ', 'FP']

Page({
  // 混入背景形状动画
  behaviors: [fallingShapes],
  // ----------------------------------------------------------
  //  页面数据
  // ----------------------------------------------------------
  data: {
    // 页面滑动动画 class（Tab 切换时）
    pageAnim: '',

    // 当前用户的 MBTI 类型
    userMbti: '',

    // 配对计算器折叠/展开
    calcExpanded: false,

    // 翻牌控制
    cardFlipMode: 0,       // 0=始终显示 / 1=每日翻牌
    cardRevealed: false,   // 当前是否已翻牌

    // 卡背星芒装饰点（随机生成的位置/符号/旋转）
    backSparks: [],

    // 配对选择器数据源
    MBTI_HEAD,
    MBTI_TAIL,

    // 配对双方类型
    leftType: '',          // 左侧（自己/他人A）
    rightType: '',         // 右侧（他人B）

    // 内联选择器状态
    pickerActive: '',      // 'left' | 'right' | '' — 当前打开的选择器
    tempHead: '',          // 临时选中的头部（IN/IS/EN/ES）
    tempTail: '',          // 临时选中的尾部（TJ/TP/FJ/FP）

    // 配对结果
    resultScores: null,    // 兼容性各项分数
    aiComment: '',         // AI 评语文本
    commentLoading: false, // AI 评语加载中
  },

  // ----------------------------------------------------------
  //  生命周期：页面加载（只一次）
  // ----------------------------------------------------------
  onLoad() {
    this._loadUserMbti()
    this._genSparks()      // 生成卡背星芒
    this._genConstellation()  // 按概率生成卡背星座
  },

  // ----------------------------------------------------------
  //  生命周期：页面显示（每次切回都触发）
  // ----------------------------------------------------------
  onShow() {
    // 同步 TabBar 选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 })
    }
    this._playPageAnim()   // 入页滑入动画

    const app = getApp()
    // 未登录 → 跳转登录页
    if (!app.globalData.hasLogin) {
      wx.navigateTo({ url: '/page/login/login' })
    }
    // 每次显示时重新读取 MBTI（可能在其他页面修改过）
    this._loadUserMbti()
    // 检查翻牌状态
    this._checkCardFlip()
  },

  // ----------------------------------------------------------
  //  读取用户 MBTI：优先 storage → 兜底云函数
  // ----------------------------------------------------------
  _loadUserMbti() {
    try {
      const mbti = wx.getStorageSync('selectedMbti') || ''
      if (mbti) {
        if (mbti !== this.data.userMbti) {
          this.setData({ userMbti: mbti })
        }
      } else {
        // storage 没有 → 尝试从云端获取
        this._loadMbtiFromCloud()
      }
    } catch (e) {
      console.warn('[Home] 读取 MBTI storage 失败', e)
      this._loadMbtiFromCloud()
    }
  },

  // ----------------------------------------------------------
  //  从云函数 getUserProfile 获取 MBTI 并缓存到 storage
  // ----------------------------------------------------------
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

  // ----------------------------------------------------------
  //  翻牌状态判断
  //  - cardFlipMode=0: 始终显示卡面
  //  - cardFlipMode=1: 每日需翻牌（当天翻过后记住）
  // ----------------------------------------------------------
  _checkCardFlip() {
    if (!this.data.userMbti) {
      // 无 MBTI → 直接显示卡面（引导提示）
      this.setData({ cardRevealed: true })
      return
    }
    if (this.data.cardFlipMode === 0) {
      // 始终模式 → 先显示卡背，等待翻牌
      this.setData({ cardRevealed: false })
    } else {
      // 每日翻牌模式 → 检查今天是否已翻过
      const today = new Date().toDateString()
      const lastReveal = wx.getStorageSync('lastCardReveal') || ''
      if (lastReveal === today) {
        this.setData({ cardRevealed: true })
      } else {
        this.setData({ cardRevealed: false })
      }
    }
  },

  // ----------------------------------------------------------
  //  翻牌动作：翻开卡面并记录日期
  // ----------------------------------------------------------
  revealCard() {
    this.setData({ cardRevealed: true })
    if (this.data.cardFlipMode === 1) {
      wx.setStorageSync('lastCardReveal', new Date().toDateString())
    }
  },

  // ----------------------------------------------------------
  //  按概率生成卡背星座（最多一个）
  // ----------------------------------------------------------
  _genConstellation() {
    this.setData({
      constellation: constellationRing.maybeGenConstellation(),
      cornerDecor: cornerDecor.getCornerDecor(),
    })
  },

  // ----------------------------------------------------------
  //  生成卡背星芒：12 个随机位置/符号的装饰点
  // ----------------------------------------------------------
  _genSparks() {
    const syms = ['✦', '✧', '◇', '⋄', '✶', '∗', '˙']
    const sparks = []
    for (let i = 0; i < 16; i++) {
      sparks.push({
        top: (8 + Math.random() * 80) + '%',       // 8%~88% 纵向
        left: (5 + Math.random() * 85) + '%',       // 5%~90% 横向
        size: (16 + Math.random() * 24) + 'rpx',    // 16~40rpx
        rot: Math.floor(Math.random() * 360) + 'deg', // 随机旋转
        sym: syms[Math.floor(Math.random() * syms.length)], // 随机符号
      })
    }
    this.setData({ backSparks: sparks })
  },

  // ----------------------------------------------------------
  //  Tab 切换时的页面滑入动画
  //  方向由 custom-tab-bar 中记录在 globalData.tabSwitchDirection
  // ----------------------------------------------------------
  _playPageAnim() {
    const app = getApp()
    const dir = app.globalData.tabSwitchDirection
    if (!dir) return
    app.globalData.tabSwitchDirection = null  // 消费后清空
    this.setData({ pageAnim: dir === 'right' ? 'page-slide-in-right' : 'page-slide-in-left' })
    setTimeout(() => { this.setData({ pageAnim: '' }) }, 320)  // 动画完成后清除 class
  },

  // =============================================
  //   折叠抽屉 — 配对计算器面板
  // =============================================

  // 展开/收起配对计算器
  toggleCalc() {
    this.setData({ calcExpanded: !this.data.calcExpanded })
  },

  // =============================================
  //   签语卡片事件
  // =============================================

  // 点击 MBTI 类型文字 → 跳转到个人中心去修改
  onFortuneTypeTap() {
    wx.switchTab({ url: '/page/profile/index' })
  },

  // 分享签语 — 唤起分享面板
  onShareFortune() {
    wx.showShareMenu({ withShareTicket: true })
  },

  // 自定义分享文案
  onShareAppMessage() {
    const mbti = this.data.userMbti || 'MBTI'
    return {
      title: `我的${mbti}每日签语，来看看你的吧！`,
      path: '/page/home/index'
    }
  },

  // =============================================
  //   配对选择器 — 两步内联选择（头→尾）
  // =============================================

  // 打开/切换某侧的选择器
  openPicker(e) {
    const side = e.currentTarget.dataset.side  // 'left' | 'right'
    // 再次点击同一侧 → 关闭
    if (this.data.pickerActive === side) {
      this.setData({ pickerActive: '', tempHead: '', tempTail: '' })
      return
    }
    // 打开选择器，预填当前已有值
    const currentType = side === 'left' ? this.data.leftType : this.data.rightType
    this.setData({
      pickerActive: side,
      tempHead: currentType ? currentType.slice(0, 2) : '',  // 前 2 字母（如 "EN"）
      tempTail: currentType ? currentType.slice(2) : '',      // 后 2 字母（如 "FP"）
    })
  },

  // 选择头部（IN/IS/EN/ES）
  pickHead(e) {
    this.setData({ tempHead: e.currentTarget.dataset.val })
  },

  // 选择尾部（TJ/TP/FJ/FP）
  pickTail(e) {
    this.setData({ tempTail: e.currentTarget.dataset.val })
  },

  // 确认选择 → 拼接完整 MBTI 并尝试计算兼容性
  confirmInlinePicker() {
    if (!this.data.tempHead || !this.data.tempTail) return
    const { pickerActive, tempHead, tempTail } = this.data
    const result = tempHead + tempTail  // "EN" + "FP" = "ENFP"
    if (pickerActive === 'left') {
      this.setData({ leftType: result, pickerActive: '', tempHead: '', tempTail: '' })
    } else {
      this.setData({ rightType: result, pickerActive: '', tempHead: '', tempTail: '' })
    }
    this._tryCalcResult()  // 双方都填好了 → 自动计算
  },

  // =============================================
  //   配对计算
  // =============================================

  // 双方都选了类型 → 查表 + 调 AI
  _tryCalcResult() {
    const { leftType, rightType } = this.data
    if (!leftType || !rightType) return

    // 排序后作为 key（兼容 A-B 和 B-A 为同一对）
    const key = [leftType, rightType].sort().join('-')
    const scores = compatibilityData.scores[key]

    if (scores) {
      this.setData({ resultScores: scores, aiComment: '', commentLoading: true })
      this._fetchAiComment(leftType, rightType)
    }
  },

  // 调用云函数获取 AI 兼容性评语
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

  // 重新选择 → 清空双方和结果
  onTryAnother() {
    this.setData({
      leftType: '',
      rightType: '',
      resultScores: null,
      aiComment: '',
      commentLoading: false,
    })
  },

  // 空函数占位（WXML 中的占位事件绑定）
  noop() {},
})