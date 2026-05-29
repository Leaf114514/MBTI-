// ============================================================
//  components/tab-home/index.js — 主页 Tab 组件
// ============================================================
//  职责：
//    1. 展示每日签语卡片（通过 fortune-card 组件）
//    2. MBTI 配对计算器（两人类型 → 兼容分数 + AI 评语）
//    3. 翻牌机制：每日首次进入需翻牌（次日重置）
//    4. 未登录通知 shell 页面处理
//    5. 卡片背面星芒装饰
// ============================================================

// 模块引入
const compatibilityData = require('../../data/compatibility-data')  // 兼容性评分数据
const fallingShapes = require('../../behaviors/falling-shapes')     // 背景形状动画 behavior
const constellationRing = require('../../common/constellation-ring')  // 星座绘制工具
const cornerDecor = require('../../common/corner-decorations/decorations')  // 四角装饰配置
const { hexToRgb } = require('../../common/color-utils')
const creditService = require('../../services/credit-service')

// MBTI 类型拼接 —— 所有类型 = 头部(2 字母) + 尾部(2 字母)
const MBTI_HEAD = ['IN', 'IS', 'EN', 'ES']
const MBTI_TAIL = ['TJ', 'TP', 'FJ', 'FP']

Component({
  // 混入背景形状动画
  behaviors: [fallingShapes],

  // ----------------------------------------------------------
  //  组件属性（由 shell 页面传入）
  // ----------------------------------------------------------
  properties: {
    active: {
      type: Boolean,
      value: false,
    },
    darkTheme: {
      type: Boolean,
      value: false,
    },
  },

  // ----------------------------------------------------------
  //  组件数据
  // ----------------------------------------------------------
  data: {
    // 当前用户的 MBTI 类型
    userMbti: '',

    // 配对计算器折叠/展开
    calcExpanded: false,

    // 翻牌控制
    cardFlipMode: 1,       // 0=每次都需翻牌 / 1=每日翻牌
    cardRevealed: false,   // 当前是否已翻牌
    themeColor: '#FF6B6B',
    themeColorRgb: '255, 107, 107',

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
  //  生命周期：组件附加到页面
  // ----------------------------------------------------------
  lifetimes: {
    attached() {
      this._loadUserMbti()
      this._genSparks()      // 生成卡背星芒
      this._genConstellation()  // 按概率生成卡背星座
      this._syncDarkTheme()
    }
  },

  // ----------------------------------------------------------
  //  方法
  // ----------------------------------------------------------
  methods: {
    // ----------------------------------------------------------
    //  Tab 激活（由 shell 页面每次切回时调用）
    // ----------------------------------------------------------
    onTabActive() {
      this._syncDarkTheme()

      const app = getApp()
      // 未登录 → 跳转登录页，跳过翻牌逻辑
      if (!app.globalData.hasLogin) {
        wx.navigateTo({ url: '/page/login/login' })
        return
      }
      // 延迟到下一帧，避免与 _syncDarkTheme 的 setData 递归
      wx.nextTick(() => {
        // 每次显示时重新读取 MBTI（可能在其他页面修改过）
        this._loadUserMbti()
        // 检查翻牌状态
        this._checkCardFlip()
      })
    },

    // ----------------------------------------------------------
    //  Tab 失活（切走时由 shell 页面调用）
    // ----------------------------------------------------------
    onTabInactive() {
      // 隐藏背景形状动画
      if (typeof this.hideShapes === 'function') {
        this.hideShapes()
      }
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
        // 每次都需翻牌模式 → 先显示卡背，等待翻牌
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
        const today = new Date().toDateString()
        const lastReveal = wx.getStorageSync('lastCardReveal') || ''
        wx.setStorageSync('lastCardReveal', today)
        // 每天第一次翻牌奖励 50 积分
        if (lastReveal !== today) {
          creditService.earnCredit(50).then(result => {
            if (result.success) {
              console.log('[Home] 翻牌奖励 50 积分，当前积分:', result.data.credit)
            }
          }).catch(e => {
            console.warn('[Home] 翻牌积分奖励失败:', e)
          })
        }
      }
    },

    // ----------------------------------------------------------
    //  按概率生成卡背星座（最多一个）
    //  通过 query 获取卡片实际尺寸，避免硬编码默认值在小屏/横屏下越界
    // ----------------------------------------------------------
    _genConstellation() {
      const self = this
      const query = wx.createSelectorQuery().in(this)
      query.select('.card-back-face').boundingClientRect(function (rect) {
        if (rect && rect.width > 0 && rect.height > 0) {
          // px → rpx 换算
          const { windowWidth } = wx.getWindowInfo()
          const ratio = 750 / windowWidth
          self.setData({
            constellation: constellationRing.maybeGenConstellation(rect.width * ratio, rect.height * ratio),
            cornerDecor: cornerDecor.getCornerDecor(),
          })
        } else {
          // 测量失败时使用默认值兜底
          self.setData({
            constellation: constellationRing.maybeGenConstellation(),
            cornerDecor: cornerDecor.getCornerDecor(),
          })
        }
      })
      query.exec()
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

    // 点击 MBTI 类型文字 → 通知 shell 切换到个人中心 Tab
    onFortuneTypeTap() {
      this.triggerEvent('switchTab', { index: 2 })
    },

    // 签语卡片主题变化（浅色幸运色 → 暗色背景）
    onThemeChange(e) {
      const { isLight, accentColor } = e.detail
      const app = getApp()
      // 翻回卡背时 fortune-card 会发 #4A1942（酒红色），不应覆盖已存储的幸运色
      const isWineReset = accentColor === '#4A1942'
      const hex = isWineReset ? (app.globalData.darkThemeAccent || '#FF6B6B') : (accentColor || '#FF6B6B')
      this.setData({ themeColor: hex, themeColorRgb: hexToRgb(hex) })
      app.globalData.darkTheme = isLight
      if (!isWineReset) {
        app.globalData.darkThemeAccent = hex
      }
      // 延迟到下一帧触发事件，避免递归 setData
      wx.nextTick(() => {
        this.triggerEvent('themeChange', { isDark: isLight, accentColor: hex })
      })
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

    // ----------------------------------------------------------
    //  同步深色主题（Tab 切换回来时恢复状态）
    // ----------------------------------------------------------
    _syncDarkTheme() {
      const app = getApp()
      const isDark = !!app.globalData.darkTheme
      const hex = app.globalData.darkThemeAccent || '#FF6B6B'
      const updates = {}
      if (hex !== this.data.themeColor) {
        updates.themeColor = hex
        updates.themeColorRgb = hexToRgb(hex)
      }
      if (Object.keys(updates).length > 0) {
        this.setData(updates)
        wx.nextTick(() => {
          this.triggerEvent('themeChange', { isDark, accentColor: hex })
        })
      }
    },
  }
})