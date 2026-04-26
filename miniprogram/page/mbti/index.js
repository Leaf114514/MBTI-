
// 引用题库
const questionBank = require('../../data/question-bank')

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
  },

  onLoad() {},

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

  onGenderPickerChange(e) {
    this.setData({
      genderPickerValue: e.detail.value,
      currentGenderDisplay: GENDERS[e.detail.value[0]],
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
  onStartQuiz() {
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

    // 预生成题目
    const questions = questionBank.getRandomQuestions(QUESTION_COUNT)
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
      answeredPercent: Math.round((newCount / QUESTION_COUNT) * 100) + '%',
    }
    if (cancelConfirmPending) updates.cancelConfirmPending = false
    this.setData(updates)
  },

  /** 下一题（右翻页动画） */
  onNextQuestion() {
    const { currentIndex, questions, questionAnim } = this.data
    if (currentIndex >= questions.length - 1 || questionAnim) return

    // 当前题向左滑出
    this.setData({ questionAnim: 'anim-flip-out-left' })

    setTimeout(() => {
      const newIdx = currentIndex + 1
      this.setData({
        currentIndex: newIdx,
        progress: (newIdx + 1) + '/' + QUESTION_COUNT,
        progressPercent: ((newIdx + 1) / QUESTION_COUNT) * 100,
        cancelConfirmPending: false,
        questionAnim: 'anim-flip-in-right',
      })
      setTimeout(() => { this.setData({ questionAnim: '' }) }, FLIP_DURATION)
    }, FLIP_DURATION - 30)
  },

  /** 上一题（左翻页动画） */
  onPrevQuestion() {
    const { currentIndex, questionAnim } = this.data
    if (currentIndex <= 0 || questionAnim) return

    this.setData({ questionAnim: 'anim-flip-out-right' })

    setTimeout(() => {
      const newIdx = currentIndex - 1
      this.setData({
        currentIndex: newIdx,
        progress: (newIdx + 1) + '/' + QUESTION_COUNT,
        progressPercent: ((newIdx + 1) / QUESTION_COUNT) * 100,
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
    const { answers, selectedMbti, selectedGender } = this.data
    console.log('提交答案:', { answers, mbti: selectedMbti, gender: selectedGender })
  },

  // =============================================
  //   其他
  // =============================================

  onViewHistory() {},
  noop() {},

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
})
