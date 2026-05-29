// ============================================================
//  components/tab-mbti/index.js — 故事生成页（Tab 2）
// ============================================================
//  职责：
//    1. 选择阶段：MBTI 类型选择器 + 性别选择器 → 开始答题
//    2. 答题阶段：5 道题翻页交互 → 提交答案
//    3. 两种模式：首次生成 / 续写（从 Story 页返回）
//    4. 三阶段转场动画：选择器掉落→题目落下→进度条淡入
//    5. 答完全部后跳转 Story 页生成故事
// ============================================================

// 引入服务模块
const questionService = require('../../services/question-service')   // 题目获取
const storyService = require('../../services/story-service')         // 故事 session 管理
const fallingShapes = require('../../behaviors/falling-shapes')      // 背景形状动画
const { hexToRgb } = require('../../common/color-utils')

// MBTI 头部 —— 第一列滚轮选项（决定内向/外向 + 感知/直觉）
const MBTI_HEAD = ['IN', 'IS', 'EN', 'ES']

// MBTI 尾部 —— 第二列滚轮选项（决定思维/情感 + 判断/感知）
const MBTI_TAIL = ['TJ', 'TP', 'FJ', 'FP']

// 性别选项 —— 单列滚轮
const GENDERS = ['男', '女']

// 退场动画持续时间（ms），需与 WXSS 中 expand-out 保持一致
const ANIM_OUT_DURATION = 260

// 每轮答题数量
const QUESTION_COUNT = 5

// 翻页动画时长（ms）
const FLIP_DURATION = 250

Component({
  // 混入背景形状动画
  behaviors: [fallingShapes],

  // ----------------------------------------------------------
  //  组件属性
  // ----------------------------------------------------------
  properties: {
    active: { type: Boolean, value: false },
    darkTheme: { type: Boolean, value: false },
  },

  // ----------------------------------------------------------
  //  页面数据
  // ----------------------------------------------------------
  data: {
    // ——— 页面阶段 ———
    phase: 'select', // 'select' 选择阶段 | 'quiz' 答题阶段

    // ——— 转场标记（转场期间需要保留旧阶段 DOM） ———
    selectLeaving: false, // 选择器正在掉落离场
    quizLeaving: false,   // 答题区正在上升离场

    // ——— 滚轮数据源 ———
    MBTI_HEAD,
    MBTI_TAIL,
    GENDERS,

    // ——— MBTI 选择器状态 ———
    isMbtiSelecting: false,      // 选择器是否展开
    isMbtiHiding: false,         // 选择器是否在收起飞出
    mbtiPickerValue: [0, 0],     // 当前滚轮值 [头索引, 尾索引]
    confirmedMbtiValue: [0, 0],  // 已确认的滚轮值（取消时恢复）
    selectedMbti: '',            // 已确认的 MBTI 类型字符串
    currentMbtiDisplay: MBTI_HEAD[0] + MBTI_TAIL[0], // 实时预览文本

    // ——— 性别选择器状态 ———
    isGenderSelecting: false,
    isGenderHiding: false,
    genderPickerValue: [0],
    confirmedGenderValue: [0],
    selectedGender: '',
    currentGenderDisplay: GENDERS[0],

    // ——— 答题状态 ———
    questions: [],               // 题目列表
    currentIndex: 0,             // 当前题目索引（0-based）
    answers: {},                 // 答案映射 { questionId: optionKey }
    answerCount: 0,              // 已答数量
    progress: '1/' + QUESTION_COUNT,  // 进度文本 "2/5"
    progressPercent: (1 / QUESTION_COUNT) * 100, // 进度条百分比
    answeredPercent: '0%',       // 已答题占比
    cancelConfirmPending: false, // 取消按钮是否在等待二次确认
    isSubmitting: false,         // 是否正在提交

    // ——— 故事已生成标记（返回时按钮变"查看故事"） ———
    storyGenerated: false,
    storyBtnAnim: '',

    // ——— 按钮提示状态 ———
    startBtnWarn: '',            // 开始按钮警告文字
    startBtnShaking: false,      // 开始按钮抖动
    submitBtnWarn: '',           // 提交按钮警告文字
    submitBtnShaking: false,     // 提交按钮抖动

    // ——— 元素动画 class ———
    mbtiCardAnim: '',            // MBTI 卡片动画
    genderCardAnim: '',          // 性别卡片动画
    startBtnAnim: '',            // 开始按钮动画
    questionAnim: '',            // 题目区域动画
    progressAnim: '',            // 进度条动画
    actionsAnim: '',             // 底部按钮区动画

    // ——— 元素随机掉落时长（inline style） ———
    mbtiCardDur: '',
    genderCardDur: '',
    startBtnDur: '',

    // ——— 续写模式（预留） ———
    isContinueMode: false,       // 是否处于续写答题流程
    currentRound: 0,             // 当前续写轮次

    // ——— 故事结果 ———
    storyTitle: '',
    storyContent: '',
    sessionId: '',               // 故事会话 ID
    storyWordCount: 0,
    canContinue: false,

    themeColor: '#FF6B6B',
    themeColorRgb: '255, 107, 107',
  },

  lifetimes: {
    attached() {
      const app = getApp()
      const isDark = !!app.globalData.darkTheme
      const hex = app.globalData.darkThemeAccent || '#FF6B6B'
      this.setData({
        darkTheme: isDark,
        themeColor: hex,
        themeColorRgb: hexToRgb(hex),
      })
    },
  },

  methods: {
  // ----------------------------------------------------------
  //  Tab 激活时：
  //  1. 检查是否有待处理的续写请求
  //  2. 检查是否已有生成的故事 → 按钮变"查看故事"
  // ----------------------------------------------------------
  onTabActive() {
    this._syncDarkTheme()

    // 如果上次提交未完成（页面被切走了），重置提交状态
    if (this.data.isSubmitting) {
      this.setData({ isSubmitting: false })
    }

    const app = getApp()

    // 优先：续写模式（从 Story 页点击"续写"返回）
    const continueReq = app.globalData.pendingContinueRequest
    if (continueReq) {
      delete app.globalData.pendingContinueRequest
      this._enterContinueMode(continueReq)
      return
    }

    // 其次：故事已生成 → 显示"查看故事"按钮
    const sessionId = app.globalData.lastStorySessionId
    if (sessionId && this.data.phase === 'quiz') {
      this.setData({
        storyGenerated: true,
        sessionId,
        storyTitle: app.globalData.lastStoryTitle || '你的 MBTI 故事',
      })
      // 延迟让按钮淡入动画触发
      setTimeout(() => {
        this.setData({ storyBtnAnim: 'anim-story-btn-in' })
      }, 50)
    }
  },

  onTabInactive() {
    // no-op
  },

  _syncDarkTheme() {
    const app = getApp()
    const isDark = !!app.globalData.darkTheme
    const hex = app.globalData.darkThemeAccent || '#FF6B6B'
    const updates = {}
    if (isDark !== this.data.darkTheme) updates.darkTheme = isDark
    if (hex !== this.data.themeColor) {
      updates.themeColor = hex
      updates.themeColorRgb = hexToRgb(hex)
    }
    if (Object.keys(updates).length > 0) {
      this.setData(updates)
      this.triggerEvent('themeChange', { isDark, accentColor: hex })
    }
  },

  // ----------------------------------------------------------
  //  进入续写答题模式（2 道题，sessionId + 轮次来自 Story 页）
  // ----------------------------------------------------------
  async _enterContinueMode({ sessionId, currentRound }) {
    const result = await questionService.getRandomQuestions({ count: 2 })
    if (!result.success || !result.data || !result.data.questions) {
      this.setData({ phase: 'select' })
      return
    }
    const questions = this._mapCloudQuestions(result.data.questions)

    // 校验题目完整性
    const badQ = questions.find(q => !q.question || typeof q.question !== 'string' || q.question.trim() === '')
    if (badQ) {
      console.error('[MBTI] 续写题目数据异常。原始:', JSON.stringify(result.data.questions).substring(0, 500))
      this.setData({ phase: 'select' })
      return
    }

    this.setData({
      phase: 'quiz',
      isContinueMode: true,
      currentRound: currentRound || 1,
      sessionId,
      storyGenerated: false,
      storyBtnAnim: '',
      questions,
      currentIndex: 0,
      answers: {},
      answerCount: 0,
      progress: '1/2',
      progressPercent: 50,
      answeredPercent: '0%',
      cancelConfirmPending: false,
      isSubmitting: false,
      // 题目落下动画
      questionAnim: 'anim-drop-in',
      progressAnim: 'anim-hidden',
      actionsAnim: 'anim-hidden',
    })
    // 依次淡入进度条和按钮
    setTimeout(() => { this.setData({ progressAnim: 'anim-fade-in' }) }, 200)
    setTimeout(() => { this.setData({ actionsAnim: 'anim-fade-in' }) }, 350)
    setTimeout(() => { this.setData({ questionAnim: '', progressAnim: '', actionsAnim: '' }) }, 700)
  },

  // =============================================
  //   MBTI 选择器 — 双列滚轮展开/收起
  // =============================================

  // 切换 MBTI 选择器（展开/收起）
  // 收起时：先播退出动画 → 动画完成后隐藏 → 恢复为已确认的值
  onToggleMbtiPicker() {
    const { isMbtiSelecting, isMbtiHiding } = this.data
    if (isMbtiHiding) return  // 动画进行中，忽略

    if (isMbtiSelecting) {
      // 收起
      this.setData({ isMbtiHiding: true })
      setTimeout(() => {
        this.setData({
          isMbtiSelecting: false,
          isMbtiHiding: false,
          mbtiPickerValue: [...this.data.confirmedMbtiValue], // 恢复确认值
        })
      }, ANIM_OUT_DURATION)
    } else {
      // 展开（同时关闭性别选择器，互斥）
      const updates = { isMbtiSelecting: true }
      if (this.data.isGenderSelecting) {
        updates.isGenderSelecting = false
        updates.isGenderHiding = false
      }
      this.setData(updates)
    }
  },

  // MBTI 滚轮值变化 → 实时预览
  onMbtiPickerChange(e) {
    const [h, t] = e.detail.value
    this.setData({
      mbtiPickerValue: e.detail.value,
      currentMbtiDisplay: MBTI_HEAD[h] + MBTI_TAIL[t],
    })
  },

  // 确认 MBTI 选择 → 持久化到 storage + 云端同步
  onConfirmMbti() {
    const { mbtiPickerValue } = this.data
    const result = MBTI_HEAD[mbtiPickerValue[0]] + MBTI_TAIL[mbtiPickerValue[1]]
    const confirmed = [...mbtiPickerValue]

    this.setData({ isMbtiHiding: true })
    setTimeout(() => {
      this.setData({
        selectedMbti: result,
        confirmedMbtiValue: confirmed,
        isMbtiSelecting: false,
        isMbtiHiding: false,
      })
      wx.setStorageSync('selectedMbti', result)
      // 异步同步到云端（不阻塞 UI）
      wx.cloud.callFunction({
        name: 'updateMbti',
        data: { mbti: result },
        fail: () => {}
      })
    }, ANIM_OUT_DURATION)
  },

  // =============================================
  //   性别选择器 — 单列选项展开/收起
  // =============================================

  // 切换性别选择器（逻辑与 MBTI 选择器类似）
  onToggleGenderPicker() {
    const { isGenderSelecting, isGenderHiding } = this.data
    if (isGenderHiding) return

    if (isGenderSelecting) {
      this.setData({ isGenderHiding: true })
      setTimeout(() => {
        this.setData({
          isGenderSelecting: false,
          isGenderHiding: false,
          genderPickerValue: [...this.data.confirmedGenderValue],
        })
      }, ANIM_OUT_DURATION)
    } else {
      const updates = { isGenderSelecting: true }
      if (this.data.isMbtiSelecting) {
        updates.isMbtiSelecting = false
        updates.isMbtiHiding = false
      }
      this.setData(updates)
    }
  },

  // 点击性别选项（不使用 picker 组件，用自定义 DOM）
  onSelectGenderOption(e) {
    const index = Number(e.currentTarget.dataset.index)
    this.setData({
      genderPickerValue: [index],
      currentGenderDisplay: GENDERS[index],
    })
  },

  // 确认性别选择
  onConfirmGender() {
    const { genderPickerValue } = this.data
    const result = GENDERS[genderPickerValue[0]]
    const confirmed = [...genderPickerValue]

    this.setData({ isGenderHiding: true })
    setTimeout(() => {
      this.setData({
        selectedGender: result,
        confirmedGenderValue: confirmed,
        isGenderSelecting: false,
        isGenderHiding: false,
      })
    }, ANIM_OUT_DURATION)
  },

  // =============================================
  //   页面转场：选择阶段 → 答题阶段
  // =============================================

  /**
   * 开始答题 —— 三个阶段动画：
   * 1. 从云函数获取题目（早于动画开始，确保数据就绪）
   * 2. 选择器卡片掉落（三个元素各自随机 300~600ms 时长）
   * 3. 题目从上方落下 + 进度条/按钮依次淡入
   */
  async onStartQuiz() {
    const { selectedMbti, selectedGender, selectLeaving } = this.data
    if (selectLeaving) return  // 动画进行中，防止重复点击

    // 校验必选项
    if (!selectedMbti) {
      this._shakeButton('start', '请先选择 MBTI 类型')
      return
    }
    if (!selectedGender) {
      this._shakeButton('start', '请先选择性别')
      return
    }

    // 1. 先从云函数获取题目
    const result = await questionService.getRandomQuestions({ count: QUESTION_COUNT })
    if (!result.success || !result.data || !result.data.questions) {
      this._shakeButton('start', '题目加载失败，请重试')
      return
    }
    const questions = this._mapCloudQuestions(result.data.questions)

    // 校验题目数据完整性（缺少 question 字段则报错）
    const badQ = questions.find(q => !q.question || typeof q.question !== 'string' || q.question.trim() === '')
    if (badQ) {
      console.error('[MBTI] 题目数据异常，缺少 question 字段。原始云函数返回:', JSON.stringify(result.data.questions).substring(0, 500))
      this._shakeButton('start', '题目数据异常，请联系开发者')
      return
    }

    // 2. 三个元素各自随机掉落时长 300~600ms
    const dur1 = (300 + Math.random() * 300).toFixed(0) + 'ms'
    const dur2 = (300 + Math.random() * 300).toFixed(0) + 'ms'
    const dur3 = (300 + Math.random() * 300).toFixed(0) + 'ms'
    const maxDur = Math.max(parseInt(dur1), parseInt(dur2), parseInt(dur3))

    // 收起已展开的选择器，开始掉落动画
    this.setData({
      selectLeaving: true,
      isMbtiSelecting: false,
      isGenderSelecting: false,
      isMbtiHiding: false,
      isGenderHiding: false,
      mbtiCardAnim: 'anim-fall-out',
      genderCardAnim: 'anim-fall-out',
      startBtnAnim: 'anim-fall-out',
      mbtiCardDur: 'animation-duration:' + dur1,
      genderCardDur: 'animation-duration:' + dur2,
      startBtnDur: 'animation-duration:' + dur3,
    })

    // 暂存答题数据（动画完成后再写入）
    this._pendingQuiz = {
      questions,
      currentIndex: 0,
      answers: {},
      answerCount: 0,
      progress: '1/' + QUESTION_COUNT,
      progressPercent: (1 / QUESTION_COUNT) * 100,
      answeredPercent: '0%',
      cancelConfirmPending: false,
      isSubmitting: false,
    }

    // 3. 掉落动画结束后切换到答题阶段
    setTimeout(() => {
      const d = this._pendingQuiz
      this.setData({
        phase: 'quiz',
        selectLeaving: false,
        mbtiCardAnim: '', genderCardAnim: '', startBtnAnim: '',
        mbtiCardDur: '', genderCardDur: '', startBtnDur: '',
        ...d,
        questionAnim: 'anim-drop-in',    // 题目下落
        progressAnim: 'anim-hidden',     // 进度条先隐藏
        actionsAnim: 'anim-hidden',      // 按钮先隐藏
      })
      // 题目落下后，进度条和按钮依次淡入
      setTimeout(() => { this.setData({ progressAnim: 'anim-fade-in' }) }, 200)
      setTimeout(() => { this.setData({ actionsAnim: 'anim-fade-in' }) }, 350)
      // 清除所有动画 class（避免干扰后续翻页）
      setTimeout(() => {
        this.setData({ questionAnim: '', progressAnim: '', actionsAnim: '' })
      }, 700)
    }, maxDur + 80)
  },

  /**
   * 取消答题 —— 反向转场：
   * 进度条/按钮淡出 → 题目上升 → 选择器从下方升起
   * 首次点击：显示二次确认文字
   * 二次点击：执行退场
   */
  onCancelQuiz() {
    if (this.data.cancelConfirmPending) {
      // 确认取消：开始退场动画
      this.setData({
        quizLeaving: true,
        progressAnim: 'anim-fade-out',
        actionsAnim: 'anim-fade-out',
        questionAnim: 'anim-rise-out',
        cancelConfirmPending: false,
      })

      // 题目上升完成后切换回选择阶段
      setTimeout(() => {
        this.setData({
          phase: 'select',
          quizLeaving: false,
          questionAnim: '', progressAnim: '', actionsAnim: '',
          mbtiCardAnim: 'anim-rise-in',       // MBTI 卡片升起
          genderCardAnim: 'anim-rise-in',     // 性别卡片升起
          startBtnAnim: 'anim-fade-in',       // 开始按钮淡入
        })
        // 清除选择器入场动画
        setTimeout(() => {
          this.setData({ mbtiCardAnim: '', genderCardAnim: '', startBtnAnim: '' })
        }, 500)
      }, 450)
    } else {
      // 首次点击 → 显示"再点一次取消"
      this.setData({ cancelConfirmPending: true })
    }
  },

  // =============================================
  //   答题逻辑 — 翻页 / 选择选项 / 提交
  // =============================================

  /**
   * 左侧按钮统一入口
   * 根据当前状态智能切换功能：
   *   故事已生成 → "新故事"
   *   第 1 题        → "取消"
   *   第 2~5 题      → "上一题"
   */
  onLeftBtnTap() {
    if (this.data.storyGenerated) {
      this.onNewStory()
    } else if (this.data.currentIndex === 0) {
      this.onCancelQuiz()
    } else {
      this.onPrevQuestion()
    }
  },

  /**
   * 右侧主按钮统一入口
   *   故事已生成 → "查看故事"
   *   答题中     → "提交答案"
   */
  onRightBtnTap() {
    if (this.data.storyGenerated) {
      this.onViewStory()
    } else {
      this.onSubmit()
    }
  },

  // 选择某个选项
  onSelectOption(e) {
    const { questionId, optionKey } = e.currentTarget.dataset
    const { answers, answerCount, cancelConfirmPending } = this.data

    const newAnswers = { ...answers }
    const wasEmpty = !newAnswers[questionId]       // 此题之前是否未答
    newAnswers[questionId] = optionKey              // 更新答案

    const newCount = answerCount + (wasEmpty ? 1 : 0)
    const updates = {
      answers: newAnswers,
      answerCount: newCount,
      answeredPercent: Math.round((newCount / this.data.questions.length) * 100) + '%',
    }
    if (cancelConfirmPending) updates.cancelConfirmPending = false  // 取消确认重置
    this.setData(updates)
  },

  /**
   * 下一题（右翻页动画）
   * 旧题向左滑出 → 新题从右滑入
   */
  onNextQuestion() {
    const { currentIndex, questions, questionAnim } = this.data
    if (currentIndex >= questions.length - 1 || questionAnim) return  // 最后一题或动画中

    this.setData({ questionAnim: 'anim-flip-out-left' })  // 旧题滑出

    setTimeout(() => {
      const newIdx = currentIndex + 1
      const total = questions.length
      this.setData({
        currentIndex: newIdx,
        progress: (newIdx + 1) + '/' + total,
        progressPercent: ((newIdx + 1) / total) * 100,
        cancelConfirmPending: false,
        questionAnim: 'anim-flip-in-right',  // 新题滑入
      })
      setTimeout(() => { this.setData({ questionAnim: '' }) }, FLIP_DURATION)
    }, FLIP_DURATION - 30)  // -30ms 微调让入场/退场有少量重叠，更流畅
  },

  /**
   * 上一题（左翻页动画）
   */
  onPrevQuestion() {
    const { currentIndex, questions, questionAnim } = this.data
    if (currentIndex <= 0 || questionAnim) return

    this.setData({ questionAnim: 'anim-flip-out-right' })

    setTimeout(() => {
      const newIdx = currentIndex - 1
      const total = questions.length
      this.setData({
        currentIndex: newIdx,
        progress: (newIdx + 1) + '/' + total,
        progressPercent: ((newIdx + 1) / total) * 100,
        cancelConfirmPending: false,
        questionAnim: 'anim-flip-in-left',
      })
      setTimeout(() => { this.setData({ questionAnim: '' }) }, FLIP_DURATION)
    }, FLIP_DURATION - 30)
  },

  /**
   * 提交答案
   * 1. 校验所有题已答
   * 2. 将答案格式化为云函数期望结构
   * 3. 区分首次生成 / 续写模式，存入 globalData 并跳转 Story 页
   */
  onSubmit() {
    const { answerCount, questions } = this.data
    // 未答完 → 抖动提示
    if (answerCount < questions.length) {
      this._shakeButton('submit', '请答完所有题目')
      return
    }
    if (this.data.isSubmitting) return  // 防止重复提交

    const { answers, selectedMbti, selectedGender, isContinueMode, sessionId } = this.data

    // 将本地答题数据转换为云函数期望的格式 [{ question, options, selected }]
    const formattedAnswers = questions.map(q => ({
      question: q.question,
      options: q.options.map(o => ({ id: o.key, text: o.text })),
      selected: answers[q.id]
    }))

    this.setData({ isSubmitting: true, submitBtnWarn: '' })

    const app = getApp()

    if (isContinueMode) {
      // 续写模式：只需 sessionId + 2 道题的答案
      app.globalData.pendingContinueSubmit = {
        sessionId,
        answers: formattedAnswers
      }
      wx.navigateTo({
        url: '/page/Story/Story?mode=continueGenerate',
        fail: () => {
          this.setData({ isSubmitting: false })
          this._shakeButton('submit', '页面跳转失败')
        }
      })
    } else {
      // 首次生成模式：传入 MBTI + 性别 + 5 道题答案
      app.globalData.pendingStoryRequest = {
        mbti: selectedMbti,
        gender: selectedGender,
        answers: formattedAnswers
      }
      wx.navigateTo({
        url: '/page/Story/Story?mode=generate',
        fail: () => {
          this.setData({ isSubmitting: false })
          this._shakeButton('submit', '页面跳转失败')
        }
      })
    }
  },

  // =============================================
  //   其他功能 — 查看故事 / 新故事 / 历史
  // =============================================

  onViewHistory() {
    wx.navigateTo({ url: '/page/history/history' })
  },

  // 空函数占位
  noop() {},

  // 查看已生成的故事
  onViewStory() {
    if (!this.data.sessionId) return
    wx.navigateTo({
      url: '/page/Story/Story?sessionId=' + this.data.sessionId
    })
  },

  // 续写故事（预留）
  onContinueStory() {},

  /**
   * 开始新故事 — 完全重置
   * 清除 storage、globalData 中所有故事相关字段
   * 回到选择阶段
   */
  onNewStory() {
    storyService.resetSession()
    wx.removeStorageSync('selectedMbti')
    const app = getApp()
    delete app.globalData.lastStorySessionId
    delete app.globalData.lastStoryTitle
    delete app.globalData.pendingContinueRequest
    delete app.globalData.pendingContinueSubmit
    delete app.globalData.prevStoryRounds
    this._usedQuestionIds = []
    this.setData({
      phase: 'select',
      selectedMbti: '',
      selectedGender: '',
      storyTitle: '',
      storyContent: '',
      sessionId: '',
      storyWordCount: 0,
      canContinue: false,
      storyGenerated: false,
      storyBtnAnim: '',
      isContinueMode: false,
      currentRound: 0,
    })
  },

  // ----------------------------------------------------------
  //  按钮抖动 + 警告文字
  //  @param {string} prefix — 'start' | 'submit'
  //  @param {string} message — 警告文字
  // ----------------------------------------------------------
  _shakeButton(prefix, message) {
    this.setData({
      [prefix + 'BtnWarn']: message,
      [prefix + 'BtnShaking']: false,   // 先重置 → 再触发（确保每次都能触发动画）
    })
    setTimeout(() => {
      this.setData({ [prefix + 'BtnShaking']: true })
    }, 30)
    // 1.5 秒后自动清除
    clearTimeout(this['_' + prefix + 'Timer'])
    this['_' + prefix + 'Timer'] = setTimeout(() => {
      this.setData({
        [prefix + 'BtnWarn']: '',
        [prefix + 'BtnShaking']: false,
      })
    }, 1500)
  },

  // ----------------------------------------------------------
  //  将云函数返回的题目格式转换为页面所需格式
  //  云函数: { _id, question, options: [{id, text}] }
  //  页面:   { id, question, options: [{key, text}] }
  // ----------------------------------------------------------
  _mapCloudQuestions(cloudQuestions) {
    return cloudQuestions.map(q => ({
      id: q._id || q.id,
      question: q.question,
      options: (q.options || []).map(o => ({
        key: o.id,
        text: o.text
      }))
    }))
  },
  },
})
