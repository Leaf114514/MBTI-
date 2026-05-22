// ===== API 配置（保留接口，生产环境替换） =====
const API_BASE = 'https://your-api-endpoint.com/api'
const TEST_CONTENT = require('./test-content.js')
const storyService = require('../../services/story-service')

Page({
  data: {
    // 测试参数: 0=显示错误状态, 1=使用 test.txt 内容, 2=持续 Loading, 3=关闭测试走 API
    test: 1,

    // 页面状态
    isLoading: true,
    loadingText: '正在加载故事...',
    hasError: false,
    errorMsg: '',

    // 故事数据 — storyRounds 二维数组，每轮一个 { segments: [...] }
    storyRounds: [],
    storyTitle: '你的 MBTI 故事',
    currentRoundIndex: 0,
    canContinue: true,

    // 自定义导航栏高度
    statusBarHeight: 20,
    navBarHeight: 64,

    // 阅读进度
    scrollProgress: 0,
    progressTop: 100,
    progressBottom: 100,

    // Loading 进度条 0-100
    loadingProgress: 0,

    // 返回按钮确认状态
    backConfirming: false,
    historyConfirming: false,
    continueConfirming: false,

    // 续写次数（后端传入，默认 1）
    continueCount: 1
  },

  onLoad(options) {
    const sysInfo = wx.getSystemInfoSync()
    const statusBarHeight = sysInfo.statusBarHeight || 20
    this._windowHeight = sysInfo.windowHeight
    this._scrollTop = 0
    this._lastProgress = 0
    const mode = (options && options.mode) || ''
    this._sessionId = (options && options.sessionId) || ''
    this._mode = mode
    this.setData({
      statusBarHeight,
      navBarHeight: statusBarHeight + 80,
      progressTop: statusBarHeight + 90,
      progressBottom: 100
    })

    this.loadStory()
  },

  onUnload() {
    clearTimeout(this._backTimer)
    clearTimeout(this._continueTimer)
    clearTimeout(this._historyTimer)
    clearInterval(this._loadingTimer)
    clearInterval(this._finishTimer)
  },

  // ============================
  //  加载故事
  // ============================

  loadStory() {
    this.setData({ isLoading: true, hasError: false, loadingProgress: 0 })
    this._startLoadingProgress()

    if (this._mode === 'generate') {
      this.generateStory()
      return
    }
    if (this._mode === 'continueGenerate') {
      this.generateContinuation()
      return
    }

    if (this._sessionId) {
      this.loadStoryBySessionId(this._sessionId)
      return
    }

    const { test } = this.data

    if (test === 0) {
      this._finishLoadingProgress(() => {
        this.setData({ isLoading: false, hasError: true, errorMsg: '网络连接失败，请检查网络后重试' })
      })
    } else if (test === 1) {
      this.loadTestData()
    } else if (test === 2) {
      return
    } else {
      this.fetchStoryFromAPI()
    }
  },

  // Loading 进度条：60 秒匀速到 80%，然后暂停
  _startLoadingProgress() {
    this._loadingTick = 0
    const totalTicks = 600
    const target = 80

    this._loadingTimer = setInterval(() => {
      this._loadingTick++
      const progress = Math.min(target, (this._loadingTick / totalTicks) * target)
      this.setData({ loadingProgress: progress })

      if (progress >= target) {
        clearInterval(this._loadingTimer)
      }
    }, 100)
  },

  // 数据就绪：从当前进度 1 秒内匀速到 100%，完成后回调
  _finishLoadingProgress(callback) {
    clearInterval(this._loadingTimer)

    const current = this.data.loadingProgress
    const remaining = 100 - current
    const ticks = 20
    const step = remaining / ticks
    let count = 0

    this._finishTimer = setInterval(() => {
      count++
      const progress = Math.min(100, current + step * count)
      this.setData({ loadingProgress: progress })

      if (count >= ticks) {
        clearInterval(this._finishTimer)
        if (callback) callback()
      }
    }, 50)
  },

  // ----- 通过 sessionId 加载故事 -----
  async loadStoryBySessionId(sessionId) {
    try {
      const result = await storyService.getSession(sessionId)

      if (!result.success) {
        this._finishLoadingProgress(() => {
          this.setData({ isLoading: false, hasError: true, errorMsg: (result.error && result.error.message) || '故事加载失败' })
        })
        return
      }

      const session = result.data
      const storyRounds = this._buildStoryRounds(session)

      this._finishLoadingProgress(() => {
        this.setData({
          isLoading: false,
          storyRounds,
          storyTitle: session.title || '你的 MBTI 故事',
          continueCount: session.currentRound || 1,
          canContinue: session.status === 'active'
        }, () => this.queryBodyPosition())
      })
    } catch (err) {
      console.error('[Story] 加载故事失败:', err)
      this._finishLoadingProgress(() => {
        this.setData({ isLoading: false, hasError: true, errorMsg: '故事加载失败，请重试' })
      })
    }
  },

  // 从 session 数据中构建 storyRounds
  _buildStoryRounds(session) {
    // 优先从 rounds 数组按轮次拆分（数据库文档格式）
    if (session.rounds && session.rounds.length > 0) {
      return session.rounds.map(r => ({
        segments: this.parseStoryContent(r.content || '')
      }))
    }
    // 从 history 中按 assistant 消息拆分
    if (session.history && session.history.length > 0) {
      const assistantMsgs = session.history.filter(m => m.role === 'assistant')
      if (assistantMsgs.length > 0) {
        return assistantMsgs.map(m => ({
          segments: this.parseStoryContent(m.content || '')
        }))
      }
    }
    // 兜底：直接 content（缓存/云函数响应格式）
    if (session.content) {
      return [{ segments: this.parseStoryContent(session.content) }]
    }
    return []
  },

  // ----- 首轮生成故事 -----
  async generateStory() {
    const app = getApp()
    const params = app.globalData.pendingStoryRequest

    if (!params || !params.mbti || !params.gender || !params.answers) {
      this._finishLoadingProgress(() => {
        this.setData({ isLoading: false, hasError: true, errorMsg: '缺少答题数据，请返回重试' })
      })
      return
    }

    delete app.globalData.pendingStoryRequest
    this.setData({ loadingText: 'AI 正在为你创作故事...' })

    try {
      const result = await storyService.submitFirstRound(params)

      if (!result.success) {
        this._finishLoadingProgress(() => {
          this.setData({ isLoading: false, hasError: true, errorMsg: (result.error && result.error.message) || '故事生成失败，请重试' })
        })
        return
      }

      const { sessionId, title, content } = result.data
      const segments = this.parseStoryContent(content)

      this._sessionId = sessionId
      app.globalData.lastStorySessionId = sessionId
      app.globalData.lastStoryTitle = title || ''

      this._finishLoadingProgress(() => {
        this.setData({
          isLoading: false,
          storyRounds: [{ segments }],
          currentRoundIndex: 0,
          storyTitle: title || '你的 MBTI 故事',
          continueCount: 1,
          canContinue: true,
        }, () => this.queryBodyPosition())
      })
    } catch (err) {
      console.error('[Story] 故事生成失败:', err)
      this._finishLoadingProgress(() => {
        this.setData({ isLoading: false, hasError: true, errorMsg: '故事生成失败，请重试' })
      })
    }
  },

  // ----- 续写生成 -----
  async generateContinuation() {
    const app = getApp()
    const params = app.globalData.pendingContinueSubmit

    if (!params || !params.sessionId || !params.answers) {
      this._finishLoadingProgress(() => {
        this.setData({ isLoading: false, hasError: true, errorMsg: '缺少续写数据，请返回重试' })
      })
      return
    }

    delete app.globalData.pendingContinueSubmit
    const prevRounds = app.globalData.prevStoryRounds || []
    delete app.globalData.prevStoryRounds

    this.setData({ loadingText: 'AI 正在续写你的故事...' })

    try {
      const result = await storyService.submitContinueRound(params)

      if (!result.success) {
        this._finishLoadingProgress(() => {
          this.setData({ isLoading: false, hasError: true, errorMsg: (result.error && result.error.message) || '续写失败，请重试' })
        })
        return
      }

      const { sessionId, title, content, meta } = result.data
      this._sessionId = sessionId
      const newSegments = this.parseStoryContent(content)
      const allRounds = [...prevRounds, { segments: newSegments }]

      app.globalData.lastStorySessionId = sessionId
      app.globalData.lastStoryTitle = title || ''

      this._finishLoadingProgress(() => {
        this.setData({
          isLoading: false,
          storyRounds: allRounds,
          currentRoundIndex: allRounds.length - 1,
          storyTitle: title || this.data.storyTitle,
          continueCount: (meta && meta.totalRounds) ? meta.totalRounds : this.data.continueCount + 1,
          canContinue: meta ? meta.canContinue !== false : true,
        }, () => this.queryBodyPosition())
      })
    } catch (err) {
      console.error('[Story] 续写失败:', err)
      this._finishLoadingProgress(() => {
        this.setData({ isLoading: false, hasError: true, errorMsg: '续写失败，请重试' })
      })
    }
  },

  // ----- 生产 API 接口 -----
  fetchStoryFromAPI() {
    wx.request({
      url: `${API_BASE}/story`,
      method: 'GET',
      success: (res) => {
        if (res.statusCode === 200 && res.data) {
          const segments = this.parseStoryContent(res.data.content || '')
          this._finishLoadingProgress(() => {
            this.setData({
              isLoading: false,
              storyRounds: [{ segments }],
              storyTitle: res.data.title || '你的 MBTI 故事',
              continueCount: res.data.continueCount || 1
            }, () => this.queryBodyPosition())
          })
        } else {
          this._finishLoadingProgress(() => {
            this.setData({ isLoading: false, hasError: true, errorMsg: res.data?.message || '加载失败，请稍后重试' })
          })
        }
      },
      fail: () => {
        this._finishLoadingProgress(() => {
          this.setData({ isLoading: false, hasError: true, errorMsg: '网络连接失败，请检查网络后重试' })
        })
      }
    })
  },

  // ----- 加载本地测试数据 -----
  loadTestData() {
    const content = TEST_CONTENT

    const lines = content.split('\n')
    let title = '你的 MBTI 故事'
    if (lines.length > 0 && lines[0].trim()) {
      title = lines[0].trim().replace(/《|》/g, '')
    }

    const segments = this.parseStoryContent(content)

    this._finishLoadingProgress(() => {
      this.setData({
        isLoading: false,
        storyRounds: [{ segments }],
        storyTitle: title
      }, () => this.queryBodyPosition())
    })
  },

  // ----- 解析文本为段落数组 -----
  parseStoryContent(content) {
    const segments = []
    const lines = content.split('\n')
    let currentText = ''

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()

      if (i === 0 && /^《.*》$/.test(line)) continue

      if (line.startsWith('【') && line.endsWith('】')) {
        if (currentText.trim()) {
          segments.push({ type: 'text', content: currentText.trim() })
          currentText = ''
        }
        segments.push({ type: 'annotation', content: line.slice(1, -1).trim(), expanded: false })
        continue
      }

      if (line === '') {
        if (currentText.trim()) {
          segments.push({ type: 'text', content: currentText.trim() })
          currentText = ''
        }
        continue
      }

      currentText = currentText ? currentText + '\n' + line : line
    }

    if (currentText.trim()) {
      segments.push({ type: 'text', content: currentText.trim() })
    }

    for (let i = 0; i < segments.length - 1; i++) {
      if (segments[i].type === 'text' && segments[i + 1].type === 'annotation') {
        segments[i].beforeAnnotation = true
      }
    }

    return segments
  },

  // ============================
  //  按钮事件
  // ============================

  _confirmAction(dataKey, timerProp, action) {
    if (this.data[dataKey]) {
      clearTimeout(this[timerProp])
      this.setData({ [dataKey]: false })
      action()
      return
    }
    this.setData({ [dataKey]: true })
    this[timerProp] = setTimeout(() => {
      this.setData({ [dataKey]: false })
    }, 3000)
  },

  goBack() {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      wx.navigateBack()
      return
    }
    wx.switchTab({ url: '/page/mbti/index' })
  },

  goContinue() {
    this._confirmAction('continueConfirming', '_continueTimer', () => {
      const app = getApp()
      app.globalData.pendingContinueRequest = {
        sessionId: this._sessionId,
        currentRound: this.data.continueCount,
      }
      app.globalData.prevStoryRounds = this.data.storyRounds
      wx.navigateBack()
    })
  },

  goHistory() {
    this._confirmAction('historyConfirming', '_historyTimer', () => {
      wx.navigateTo({ url: '/page/history/history' })
    })
  },

  goHome() {
    wx.switchTab({ url: '/page/home/index' })
  },

  // swiper 翻页
  onRoundChange(e) {
    this.setData({ currentRoundIndex: e.detail.current, scrollProgress: 0 })
    this._scrollTop = 0
    this._lastProgress = 0
  },

  // 折叠/展开注释
  toggleAnnotation(e) {
    const roundIdx = e.currentTarget.dataset.roundIndex
    const segIdx = e.currentTarget.dataset.segIndex
    const key = `storyRounds[${roundIdx}].segments[${segIdx}].expanded`
    const current = this.data.storyRounds[roundIdx].segments[segIdx].expanded
    this.setData({ [key]: !current }, () => {
      this.queryBodyPosition()
    })
  },

  // ============================
  //  阅读进度条
  // ============================

  queryBodyPosition() {
    this.createSelectorQuery()
      .selectAll('.story-body')
      .boundingClientRect()
      .exec((res) => {
        if (res && res[0] && res[0].length > 0) {
          const idx = this.data.currentRoundIndex
          const rect = res[0][idx]
          if (rect) {
            this._bodyTop = rect.top + this._scrollTop
            this._bodyHeight = rect.height
          }
        }
      })
  },

  onScroll(e) {
    const scrollTop = e.detail.scrollTop
    this._scrollTop = scrollTop
    if (!this._bodyTop) return

    const navH = this.data.navBarHeight
    const winH = this._windowHeight
    const barH = this.data.progressBottom

    const viewportTop = scrollTop + navH
    const viewportBottom = scrollTop + winH - barH
    const visibleHeight = Math.max(1, viewportBottom - viewportTop)

    const scrolled = viewportTop - this._bodyTop
    const totalScrollable = this._bodyHeight - visibleHeight

    if (totalScrollable <= 0) return

    const progress = Math.max(0, Math.min(1, scrolled / totalScrollable))

    if (Math.abs(progress - this._lastProgress) > 0.005) {
      this._lastProgress = progress
      this.setData({ scrollProgress: progress })
    }
  }
})
