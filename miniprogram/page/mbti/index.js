
// 引用题库
const questionService = require('../../services/question-service')
const storyService = require('../../services/story-service')

// MBTI 头部——第一列滚轮选项
const MBTI_HEAD = ['IN', 'IS', 'EN', 'ES']

// MBTI 尾部——第二列滚轮选项
const MBTI_TAIL = ['TJ', 'TP', 'FJ', 'FP']

// 性别选项——单列滚轮
const GENDERS = ['男', '女']

// 退场动画持续时间（ms），需与 WXSS 中 expand-out 保持一致
const ANIM_OUT_DURATION = 260

// 每轮答题数量
const QUESTION_COUNT = 5

// 翻页动画时长
const FLIP_DURATION = 250

Page({
  data: {
    // ——— 页面阶段 ———
    phase: 'select', // 'select' 选择阶段 | 'quiz' 答题阶段

    // ——— 转场标记（转场期间保留旧阶段 DOM） ———
    selectLeaving: false, // 选择器正在掉落离场
    quizLeaving: false,   // 答题区正在上升离场

    // ——— 滚轮数据源 ———
    MBTI_HEAD,
    MBTI_TAIL,
    GENDERS,

    // ——— MBTI 选择器状态 ———
    isMbtiSelecting: false,
    isMbtiHiding: false,
    mbtiPickerValue: [0, 0],
    confirmedMbtiValue: [0, 0],
    selectedMbti: '',
    currentMbtiDisplay: MBTI_HEAD[0] + MBTI_TAIL[0],

    // ——— 性别选择器状态 ———
    isGenderSelecting: false,
    isGenderHiding: false,
    genderPickerValue: [0],
    confirmedGenderValue: [0],
    selectedGender: '',
    currentGenderDisplay: GENDERS[0],

    // ——— 答题状态 ———
    questions: [],
    currentIndex: 0,
    answers: {},
    answerCount: 0,
    progress: '1/' + QUESTION_COUNT,
    progressPercent: (1 / QUESTION_COUNT) * 100,
    answeredPercent: '0%',
    cancelConfirmPending: false,
    isSubmitting: false,

    // ——— 故事已生成标记（返回时按钮变"查看故事"） ———
    storyGenerated: false,
    storyBtnAnim: '',

    // ——— 按钮提示状态 ———
    startBtnWarn: '',
    startBtnShaking: false,
    submitBtnWarn: '',
    submitBtnShaking: false,

    // ——— 元素动画 class ———
    mbtiCardAnim: '',
    genderCardAnim: '',
    startBtnAnim: '',
    questionAnim: '',
    progressAnim: '',
    actionsAnim: '',

    // ——— 元素随机掉落时长（inline style） ———
    mbtiCardDur: '',
    genderCardDur: '',
    startBtnDur: '',

    // ——— 续写模式（预留） ———
    isContinueMode: false,
    currentRound: 0,

    // ——— 故事结果 ———
    storyTitle: '',
    storyContent: '',
    sessionId: '',
    storyWordCount: 0,
    canContinue: false,
  },

  onLoad() {},

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 })
    }
    this._playPageAnim()
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

    // 其次：故事已生成（按钮变"查看故事"）
    const sessionId = app.globalData.lastStorySessionId
    if (sessionId && this.data.phase === 'quiz') {
      this.setData({
        storyGenerated: true,
        sessionId,
        storyTitle: app.globalData.lastStoryTitle || '你的 MBTI 故事',
      })
      setTimeout(() => {
        this.setData({ storyBtnAnim: 'anim-story-btn-in' })
      }, 50)
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

  /** 进入续写答题模式（2 道题） */
  async _enterContinueMode({ sessionId, currentRound }) {
    const result = await questionService.getRandomQuestions({ count: 2 })
    if (!result.success || !result.data || !result.data.questions) {
      // 加载失败，回到选择阶段
      this.setData({ phase: 'select' })
      return
    }
    const questions = this._mapCloudQuestions(result.data.questions)

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
      questionAnim: 'anim-drop-in',
      progressAnim: 'anim-hidden',
      actionsAnim: 'anim-hidden',
    })
    setTimeout(() => { this.setData({ progressAnim: 'anim-fade-in' }) }, 200)
    setTimeout(() => { this.setData({ actionsAnim: 'anim-fade-in' }) }, 350)
    setTimeout(() => { this.setData({ questionAnim: '', progressAnim: '', actionsAnim: '' }) }, 700)
  },

  // =============================================
  //   MBTI 选择器
  // =============================================

  onToggleMbtiPicker() {
    const { isMbtiSelecting, isMbtiHiding } = this.data
    if (isMbtiHiding) return

    if (isMbtiSelecting) {
      this.setData({ isMbtiHiding: true })
      setTimeout(() => {
        this.setData({
          isMbtiSelecting: false,
          isMbtiHiding: false,
          mbtiPickerValue: [...this.data.confirmedMbtiValue],
        })
      }, ANIM_OUT_DURATION)
    } else {
      const updates = { isMbtiSelecting: true }
      if (this.data.isGenderSelecting) {
        updates.isGenderSelecting = false
        updates.isGenderHiding = false
      }
      this.setData(updates)
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
    const confirmed = [...mbtiPickerValue]

    this.setData({ isMbtiHiding: true })
    setTimeout(() => {
      this.setData({
        selectedMbti: result,
        confirmedMbtiValue: confirmed,
        isMbtiSelecting: false,
        isMbtiHiding: false,
      })
    }, ANIM_OUT_DURATION)
  },

  // =============================================
  //   性别选择器
  // =============================================

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

  onSelectGenderOption(e) {
    const index = Number(e.currentTarget.dataset.index)
    this.setData({
      genderPickerValue: [index],
      currentGenderDisplay: GENDERS[index],
    })
  },

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
  //   页面转场
  // =============================================

  /**
   * 开始答题 —— 选择器掉落 → 题目落下 → 进度条/按钮淡入
   */
  async onStartQuiz() {
    const { selectedMbti, selectedGender, selectLeaving } = this.data
    if (selectLeaving) return
    if (!selectedMbti) {
      this._shakeButton('start', '请先选择 MBTI 类型')
      return
    }
    if (!selectedGender) {
      this._shakeButton('start', '请先选择性别')
      return
    }

    // 先从云函数获取题目
    const result = await questionService.getRandomQuestions({ count: QUESTION_COUNT })
    if (!result.success || !result.data || !result.data.questions) {
      this._shakeButton('start', '题目加载失败，请重试')
      return
    }
    const questions = this._mapCloudQuestions(result.data.questions)

    // 校验题目数据完整性
    const badQ = questions.find(q => !q.question || typeof q.question !== 'string' || q.question.trim() === '')
    if (badQ) {
      console.error('[MBTI] 题目数据异常，缺少 question 字段。原始云函数返回:', JSON.stringify(result.data.questions).substring(0, 500))
      this._shakeButton('start', '题目数据异常，请联系开发者')
      return
    }

    // 三个元素各自随机掉落时长 300~600ms
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

    // 掉落结束后切换到答题阶段
    setTimeout(() => {
      const d = this._pendingQuiz
      this.setData({
        phase: 'quiz',
        selectLeaving: false,
        mbtiCardAnim: '', genderCardAnim: '', startBtnAnim: '',
        mbtiCardDur: '', genderCardDur: '', startBtnDur: '',
        ...d,
        questionAnim: 'anim-drop-in',
        progressAnim: 'anim-hidden',
        actionsAnim: 'anim-hidden',
      })
      // 题目落下后，进度条和按钮依次淡入
      setTimeout(() => { this.setData({ progressAnim: 'anim-fade-in' }) }, 200)
      setTimeout(() => { this.setData({ actionsAnim: 'anim-fade-in' }) }, 350)
      setTimeout(() => {
        this.setData({ questionAnim: '', progressAnim: '', actionsAnim: '' })
      }, 700)
    }, maxDur + 80)
  },

  /**
   * 取消答题 —— 进度条/按钮淡出 → 题目上升 → 选择器从下升起
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
          mbtiCardAnim: 'anim-rise-in',
          genderCardAnim: 'anim-rise-in',
          startBtnAnim: 'anim-fade-in',
        })
        // 清除选择器入场动画
        setTimeout(() => {
          this.setData({ mbtiCardAnim: '', genderCardAnim: '', startBtnAnim: '' })
        }, 500)
      }, 450)
    } else {
      this.setData({ cancelConfirmPending: true })
    }
  },

  // =============================================
  //   答题逻辑
  // =============================================

  /** 左侧按钮统一入口 */
  onLeftBtnTap() {
    if (this.data.storyGenerated) {
      this.onNewStory()
    } else if (this.data.currentIndex === 0) {
      this.onCancelQuiz()
    } else {
      this.onPrevQuestion()
    }
  },

  /** 右侧主按钮统一入口 */
  onRightBtnTap() {
    if (this.data.storyGenerated) {
      this.onViewStory()
    } else {
      this.onSubmit()
    }
  },

  onSelectOption(e) {
    const { questionId, optionKey } = e.currentTarget.dataset
    const { answers, answerCount, cancelConfirmPending } = this.data

    const newAnswers = { ...answers }
    const wasEmpty = !newAnswers[questionId]
    newAnswers[questionId] = optionKey

    const newCount = answerCount + (wasEmpty ? 1 : 0)
    const updates = {
      answers: newAnswers,
      answerCount: newCount,
      answeredPercent: Math.round((newCount / this.data.questions.length) * 100) + '%',
    }
    if (cancelConfirmPending) updates.cancelConfirmPending = false
    this.setData(updates)
  },

  /** 下一题（右翻页动画） */
  onNextQuestion() {
    const { currentIndex, questions, questionAnim } = this.data
    if (currentIndex >= questions.length - 1 || questionAnim) return

    this.setData({ questionAnim: 'anim-flip-out-left' })

    setTimeout(() => {
      const newIdx = currentIndex + 1
      const total = questions.length
      this.setData({
        currentIndex: newIdx,
        progress: (newIdx + 1) + '/' + total,
        progressPercent: ((newIdx + 1) / total) * 100,
        cancelConfirmPending: false,
        questionAnim: 'anim-flip-in-right',
      })
      setTimeout(() => { this.setData({ questionAnim: '' }) }, FLIP_DURATION)
    }, FLIP_DURATION - 30)
  },

  /** 上一题（左翻页动画） */
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

  /** 提交答案 */
  onSubmit() {
    const { answerCount, questions } = this.data
    if (answerCount < questions.length) {
      this._shakeButton('submit', '请答完所有题目')
      return
    }
    if (this.data.isSubmitting) return

    const { answers, selectedMbti, selectedGender, isContinueMode, sessionId } = this.data

    // 将本地答题数据转换为云函数期望的格式
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
      // 首次生成模式
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
  //   其他
  // =============================================

  onViewHistory() {
    wx.navigateTo({ url: '/page/history/history' })
  },
  noop() {},

  /** 查看已生成的故事 */
  onViewStory() {
    if (!this.data.sessionId) return
    wx.navigateTo({
      url: `/page/Story/Story?sessionId=${this.data.sessionId}`
    })
  },

  /** 续写故事 */
  onContinueStory() {},

  /** 开始新故事 — 重置到选择阶段 */
  onNewStory() {
    storyService.resetSession()
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

  _shakeButton(prefix, message) {
    this.setData({
      [prefix + 'BtnWarn']: message,
      [prefix + 'BtnShaking']: false,
    })
    setTimeout(() => {
      this.setData({ [prefix + 'BtnShaking']: true })
    }, 30)
    clearTimeout(this['_' + prefix + 'Timer'])
    this['_' + prefix + 'Timer'] = setTimeout(() => {
      this.setData({
        [prefix + 'BtnWarn']: '',
        [prefix + 'BtnShaking']: false,
      })
    }, 1500)
  },

  /** 将云函数返回的题目格式转换为页面所需格式 */
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
})
