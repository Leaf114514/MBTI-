// ============================================================
//  page/Story/Story.js — 故事阅读页
// ============================================================
//  职责：
//    1. 多种加载模式：
//       - generate: 首次生成故事（接收 mbti + gender + answers）
//       - continueGenerate: 续写故事（接收 sessionId + answers）
//       - 通过 sessionId 加载已有故事
//       - 本地测试内容
//    2. 文本解析：将 AI 返回的 Markdown 解析为 text/annotation 段落
//    3. 轮次展示：swiper 翻页查看多个续写轮次
//    4. 阅读进度条：根据滚动位置计算 0-1 进度
//    5. 注释折叠/展开（【...】标记的内容）
//    6. Loading 进度条（60 秒到 80%、数据就绪 1 秒到 100%）
// ============================================================

// ----- API 配置（保留接口，生产环境替换） -----
const API_BASE = 'https://your-api-endpoint.com/api'
const TEST_CONTENT = require('./test-content.js')          // 本地测试数据
const storyService = require('../../services/story-service') // 故事云服务
const { hexToRgb } = require('../../common/color-utils')

Page({
  // ----------------------------------------------------------
  //  页面数据
  // ----------------------------------------------------------
  data: {
    // 测试参数: 0=显示错误, 1=加载本地测试, 2=持续 Loading, 3=走 API
    test: 1,

    // 页面状态
    isLoading: true,
    loadingText: '正在加载故事...',
    hasError: false,
    errorMsg: '',

    // 故事数据 — storyRounds 二维数组，每轮一个 { segments: [...] }
    storyRounds: [],
    storyTitle: '你的 MBTI 故事',
    currentRoundIndex: 0,   // 当前显示的轮次
    canContinue: true,       // 是否可续写

    // 自定义导航栏高度
    statusBarHeight: 20,
    navBarHeight: 64,

    // 阅读进度条
    scrollProgress: 0,       // 0~1 的滚动进度
    progressTop: 100,        // 进度条顶部位置（避开导航栏）
    progressBottom: 100,     // 进度条底部留白

    // Loading 进度条 0-100
    loadingProgress: 0,

    // 按钮确认状态（二次点击防误触）
    backConfirming: false,
    historyConfirming: false,
    continueConfirming: false,

    // 续写次数（后端传入，默认 1）
    continueCount: 1,

    darkTheme: false,
    themeColor: '#FF6B6B',
    themeColorRgb: '255, 107, 107',
  },

  // ----------------------------------------------------------
  //  页面加载
  //  @param {object} options
  //    - mode: 'generate' | 'continueGenerate' | ''
  //    - sessionId: string（已有故事的 ID）
  // ----------------------------------------------------------
  onLoad(options) {
    const sysInfo = wx.getSystemInfoSync()
    const statusBarHeight = sysInfo.statusBarHeight || 20
    this._windowHeight = sysInfo.windowHeight
    this._scrollTop = 0
    this._lastProgress = 0

    // 解析路由参数
    const mode = (options && options.mode) || ''
    this._sessionId = (options && options.sessionId) || ''
    this._mode = mode

    const app = getApp()

    this.setData({
      statusBarHeight,
      navBarHeight: statusBarHeight + 80,
      progressTop: statusBarHeight + 90,  // 进度条从导航栏下方开始
      progressBottom: 100,
      darkTheme: !!app.globalData.darkTheme,
      themeColor: app.globalData.darkThemeAccent || '#FF6B6B',
      themeColorRgb: hexToRgb(app.globalData.darkThemeAccent || '#FF6B6B'),
    })

    this.loadStory()
  },

  // ----------------------------------------------------------
  //  页面卸载 → 清除所有定时器，防止内存泄漏
  // ----------------------------------------------------------
  onUnload() {
    clearTimeout(this._backTimer)
    clearTimeout(this._continueTimer)
    clearTimeout(this._historyTimer)
    clearInterval(this._loadingTimer)
    clearInterval(this._finishTimer)
  },

  // ============================
  //   加载故事 — 路由分发
  // ============================

  // 根据 mode 分发到不同的加载方法
  loadStory() {
    this.setData({ isLoading: true, hasError: false, loadingProgress: 0 })
    this._startLoadingProgress()

    // 模式优先判断
    if (this._mode === 'generate') {
      this.generateStory()
      return
    }
    if (this._mode === 'continueGenerate') {
      this.generateContinuation()
      return
    }

    // 有 sessionId → 加载已有故事
    if (this._sessionId) {
      this.loadStoryBySessionId(this._sessionId)
      return
    }

    // 测试环境兜底
    const { test } = this.data

    if (test === 0) {
      // 模拟错误
      this._finishLoadingProgress(() => {
        this.setData({ isLoading: false, hasError: true, errorMsg: '网络连接失败，请检查网络后重试' })
      })
    } else if (test === 1) {
      // 加载本地测试数据
      this.loadTestData()
    } else if (test === 2) {
      // 持续 Loading（用于调试 Loading UI）
      return
    } else {
      // 生产 API
      this.fetchStoryFromAPI()
    }
  },

  // ----------------------------------------------------------
  //  Loading 进度条：60 秒匀速到 80%，然后暂停等待数据
  // ----------------------------------------------------------
  _startLoadingProgress() {
    this._loadingTick = 0
    const totalTicks = 600    // 600 次 * 100ms = 60 秒
    const target = 80

    this._loadingTimer = setInterval(() => {
      this._loadingTick++
      const progress = Math.min(target, (this._loadingTick / totalTicks) * target)
      this.setData({ loadingProgress: progress })

      if (progress >= target) {
        clearInterval(this._loadingTimer)  // 到 80% 后暂停
      }
    }, 100)
  },

  // ----------------------------------------------------------
  //  数据就绪：从当前进度 1 秒内匀速到 100%，完成后回调
  // ----------------------------------------------------------
  _finishLoadingProgress(callback) {
    clearInterval(this._loadingTimer)

    const current = this.data.loadingProgress
    const remaining = 100 - current
    const ticks = 20         // 20 次 * 50ms = 1 秒
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
          canContinue: session.status === 'active'  // 只有 active 状态可续写
        }, () => this.queryBodyPosition())  // 渲染完成后查询 body 位置
      })
    } catch (err) {
      console.error('[Story] 加载故事失败:', err)
      this._finishLoadingProgress(() => {
        this.setData({ isLoading: false, hasError: true, errorMsg: '故事加载失败，请重试' })
      })
    }
  },

  // ----------------------------------------------------------
  //  从 session 数据中构建 storyRounds
  //  兼容三种数据格式：
  //    1. rounds 数组（数据库文档格式，推荐）
  //    2. history 数组（AI 对话格式，提取 assistant 消息）
  //    3. content 字段（直接文本，作为单一轮次）
  // ----------------------------------------------------------
  _buildStoryRounds(session) {
    // 方式 1：rounds 数组（数据库文档格式）
    if (session.rounds && session.rounds.length > 0) {
      return session.rounds.map(r => ({
        segments: this.parseStoryContent(r.content || '')
      }))
    }
    // 方式 2：history 中提取 assistant 消息
    if (session.history && session.history.length > 0) {
      const assistantMsgs = session.history.filter(m => m.role === 'assistant')
      if (assistantMsgs.length > 0) {
        return assistantMsgs.map(m => ({
          segments: this.parseStoryContent(m.content || '')
        }))
      }
    }
    // 方式 3：直接 content（缓存/云函数响应格式）
    if (session.content) {
      return [{ segments: this.parseStoryContent(session.content) }]
    }
    return []
  },

  // ----- 首轮生成故事 -----
  async generateStory() {
    const app = getApp()
    // 从 globalData 中获取 mbti 页面传递的答题数据
    const params = app.globalData.pendingStoryRequest

    if (!params || !params.mbti || !params.gender || !params.answers) {
      this._finishLoadingProgress(() => {
        this.setData({ isLoading: false, hasError: true, errorMsg: '缺少答题数据，请返回重试' })
      })
      return
    }

    // 消费后清除，防止页面返回再次触发
    delete app.globalData.pendingStoryRequest
    this.setData({ loadingText: 'AI 正在为你创作故事...' })

    try {
      const result = await storyService.submitFirstRound(params)

      if (!result.success) {
        const isCreditError = result.error && result.error.code === 'INSUFFICIENT_CREDIT'
        const errorMsg = isCreditError ? '积分不足，无法生成故事' : ((result.error && result.error.message) || '故事生成失败，请重试')
        this._finishLoadingProgress(() => {
          this.setData({ isLoading: false, hasError: true, errorMsg })
        })
        return
      }

      const { sessionId, title, content } = result.data
      const segments = this.parseStoryContent(content)

      // 保存 sessionId，供后续操作使用
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
          canContinue: true,  // 首轮生成后总是可续写
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

    // 保留之前的轮次（用于 swiper 连续展示）
    const prevRounds = app.globalData.prevStoryRounds || []
    delete app.globalData.prevStoryRounds

    this.setData({ loadingText: 'AI 正在续写你的故事...' })

    try {
      const result = await storyService.submitContinueRound(params)

      if (!result.success) {
        const isCreditError = result.error && result.error.code === 'INSUFFICIENT_CREDIT'
        const errorMsg = isCreditError ? '积分不足，无法续写故事' : ((result.error && result.error.message) || '续写失败，请重试')
        this._finishLoadingProgress(() => {
          this.setData({ isLoading: false, hasError: true, errorMsg })
        })
        return
      }

      const { sessionId, title, content, meta } = result.data
      this._sessionId = sessionId
      const newSegments = this.parseStoryContent(content)

      // 将新轮次追加到已有轮次后面
      const allRounds = [...prevRounds, { segments: newSegments }]

      app.globalData.lastStorySessionId = sessionId
      app.globalData.lastStoryTitle = title || ''

      this._finishLoadingProgress(() => {
        this.setData({
          isLoading: false,
          storyRounds: allRounds,
          currentRoundIndex: allRounds.length - 1, // 自动切到最新轮次
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

  // ----- 生产 API 接口（保留） -----
  fetchStoryFromAPI() {
    wx.request({
      url: API_BASE + '/story',
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

    // 第一行如果有书名号 → 提取为标题
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

  // ============================================================
  //   文本解析器 — 将 AI 内容解析为段落数组
  //   规则：
  //     - 第一行"《...》" → 忽略（标题已在 meta 中）
  //     - 以空行分隔段落
  //     - `【...】` 行 → annoation 类型（可折叠注释）
  //     - 其他 → text 类型（正文段落）
  //     - text 段落前如果有 annotation → 标记 beforeAnnotation
  // ============================================================
  parseStoryContent(content) {
    const segments = []
    const lines = content.split('\n')
    let currentText = ''  // 当前正在累积的文本段落

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()

      // 跳过第一行的书名号标题
      if (i === 0 && /^《.*》$/.test(line)) continue

      // 【注释行】→ 闭合当前文本段落 → 添加 annotation
      if (line.startsWith('【') && line.endsWith('】')) {
        if (currentText.trim()) {
          segments.push({ type: 'text', content: currentText.trim() })
          currentText = ''
        }
        segments.push({ type: 'annotation', content: line.slice(1, -1).trim(), expanded: false })
        continue
      }

      // 空行 → 闭合当前文本段落
      if (line === '') {
        if (currentText.trim()) {
          segments.push({ type: 'text', content: currentText.trim() })
          currentText = ''
        }
        continue
      }

      // 普通文本行 → 累积（用换行分隔）
      currentText = currentText ? currentText + '\n' + line : line
    }

    // 最后的文本段落
    if (currentText.trim()) {
      segments.push({ type: 'text', content: currentText.trim() })
    }

    // 后处理：标记那些前面紧邻 annotation 的 text 段落
    // 用于渲染时在正文前添加小标记
    for (let i = 0; i < segments.length - 1; i++) {
      if (segments[i].type === 'text' && segments[i + 1].type === 'annotation') {
        segments[i].beforeAnnotation = true
      }
    }

    return segments
  },

  // ============================
  //   按钮事件
  // ============================

  // 确认操作通用函数：首次点击变确认态，二次点击执行
  _confirmAction(dataKey, timerProp, action) {
    if (this.data[dataKey]) {
      // 二次点击 → 执行
      clearTimeout(this[timerProp])
      this.setData({ [dataKey]: false })
      action()
      return
    }
    // 首次点击 → 进入确认态（3 秒自动恢复）
    this.setData({ [dataKey]: true })
    this[timerProp] = setTimeout(() => {
      this.setData({ [dataKey]: false })
    }, 3000)
  },

  // 返回
  goBack() {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      wx.navigateBack()          // 有上一页 → 返回
      return
    }
    wx.reLaunch({ url: '/page/shell/index?tab=1' })
  },

  // 续写 → 回到 mbti 页的续写答题流程
  goContinue() {
    this._confirmAction('continueConfirming', '_continueTimer', () => {
      const app = getApp()
      // 传递续写参数
      app.globalData.pendingContinueRequest = {
        sessionId: this._sessionId,
        currentRound: this.data.continueCount,
      }
      // 保存当前所有轮次（续写完成后追加展示）
      app.globalData.prevStoryRounds = this.data.storyRounds
      app.globalData.pendingTab = 1
      wx.navigateBack()
    })
  },

  // 查看历史故事列表
  goHistory() {
    this._confirmAction('historyConfirming', '_historyTimer', () => {
      wx.navigateTo({ url: '/page/history/history' })
    })
  },

  // 跳转主页
  goHome() {
    getApp().globalData.pendingTab = 0
    wx.navigateBack()
  },

  // ----------------------------------------------------------
  //  Swiper 翻页 → 更新当前轮次索引 + 重置滚动进度
  // ----------------------------------------------------------
  onRoundChange(e) {
    this.setData({ currentRoundIndex: e.detail.current, scrollProgress: 0 })
    this._scrollTop = 0
    this._lastProgress = 0
  },

  // ----------------------------------------------------------
  //  折叠/展开注释（【...】）
  // ----------------------------------------------------------
  toggleAnnotation(e) {
    const roundIdx = e.currentTarget.dataset.roundIndex
    const segIdx = e.currentTarget.dataset.segIndex
    const key = 'storyRounds[' + roundIdx + '].segments[' + segIdx + '].expanded'
    const current = this.data.storyRounds[roundIdx].segments[segIdx].expanded
    this.setData({ [key]: !current }, () => {
      this.queryBodyPosition()  // 展开/折叠后重新查询内容高度
    })
  },

  // ============================
  //   阅读进度条
  // ============================

  // 查询当前轮次 story-body 的位置和高度
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

  // ----------------------------------------------------------
  //  滚动事件 → 计算阅读进度
  //  公式：progress = (可视区上边缘 - body顶) / (body高度 - 可视区高度)
  // ----------------------------------------------------------
  onScroll(e) {
    const scrollTop = e.detail.scrollTop
    this._scrollTop = scrollTop
    if (!this._bodyTop) return  // 还需等待 queryBodyPosition 结果

    const navH = this.data.navBarHeight
    const winH = this._windowHeight
    const barH = this.data.progressBottom

    // 可视区范围（排除了顶部导航栏和底部留白）
    const viewportTop = scrollTop + navH
    const viewportBottom = scrollTop + winH - barH
    const visibleHeight = Math.max(1, viewportBottom - viewportTop)

    // 已滚动距离 / 可滚动总量
    const scrolled = viewportTop - this._bodyTop
    const totalScrollable = this._bodyHeight - visibleHeight

    if (totalScrollable <= 0) return

    const progress = Math.max(0, Math.min(1, scrolled / totalScrollable))

    // 减少 setData 频率（变化 > 0.5% 才更新）
    if (Math.abs(progress - this._lastProgress) > 0.005) {
      this._lastProgress = progress
      this.setData({ scrollProgress: progress })
    }
  }
})