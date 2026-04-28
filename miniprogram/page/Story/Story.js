// ===== API 配置（保留接口，生产环境替换） =====
const API_BASE = 'https://your-api-endpoint.com/api'
const TEST_CONTENT = require('./test-content.js')

Page({
  data: {
    // 测试参数: 0=显示错误状态, 1=使用 test.txt 内容, 2=持续 Loading, 3=关闭测试走 API
    test: 0,

    // 页面状态
    isLoading: true,
    loadingText: '正在加载故事...',
    hasError: false,
    errorMsg: '',

    // 故事模式: 'generate'=逐轮生成, 'history'=历史回看
    mode: 'history',
    currentRound: 1,
    maxRounds: 5,

    // 故事数据
    storySegments: [],
    canContinue: true,
    storyTitle: '你的 MBTI 故事',

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
    this.setData({
      statusBarHeight: statusBarHeight,
      navBarHeight: statusBarHeight + 80,
      progressTop: statusBarHeight + 90,
      progressBottom: 100
    })

    if (options.mode) {
      this.setData({ mode: options.mode })
    }
    if (options.round) {
      this.setData({ currentRound: parseInt(options.round) })
    }
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

    const { test } = this.data

    if (test === 0) {
      // 展示错误状态：进度条直接走完再显示
      this._finishLoadingProgress(() => {
        this.setData({
          isLoading: false,
          hasError: true,
          errorMsg: '网络连接失败，请检查网络后重试'
        })
      })
    } else if (test === 1) {
      this.loadTestData()
    } else if (test === 2) {
      // 持续 Loading：进度条跑到 80% 暂停
      return
    } else {
      this.fetchStoryFromAPI()
    }
  },

  // Loading 进度条：60 秒匀速到 80%，然后暂停
  _startLoadingProgress() {
    this._loadingTick = 0
    const totalTicks = 600  // 60s × 10次/s
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
    const ticks = 20  // 1s × 20次/s
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

  // ----- 生产 API 接口 -----
  fetchStoryFromAPI() {
    wx.request({
      url: `${API_BASE}/story`,
      method: 'GET',
      data: {
        mode: this.data.mode,
        round: this.data.currentRound
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data) {
          const segments = this.parseStoryContent(res.data.content || '')
          this._finishLoadingProgress(() => {
            this.setData({
              isLoading: false,
              storySegments: segments,
              storyTitle: res.data.title || '你的 MBTI 故事',
              currentRound: res.data.currentRound || this.data.currentRound,
              maxRounds: res.data.maxRounds || this.data.maxRounds,
              continueCount: res.data.continueCount || 1,
              canContinue: (res.data.currentRound || this.data.currentRound)
                < (res.data.maxRounds || this.data.maxRounds)
            }, () => this.queryBodyPosition())
          })
        } else {
          this._finishLoadingProgress(() => {
            this.setData({
              isLoading: false,
              hasError: true,
              errorMsg: res.data?.message || '加载失败，请稍后重试'
            })
          })
        }
      },
      fail: () => {
        this._finishLoadingProgress(() => {
          this.setData({
            isLoading: false,
            hasError: true,
            errorMsg: '网络连接失败，请检查网络后重试'
          })
        })
      }
    })
  },

  // ----- 加载本地测试数据 -----
  loadTestData() {
    const content = TEST_CONTENT

    // 解析标题（第一行）
    const lines = content.split('\n')
    let title = '你的 MBTI 故事'
    if (lines.length > 0 && lines[0].trim()) {
      title = lines[0].trim().replace(/《|》/g, '')
    }

    const segments = this.parseStoryContent(content)
    const annotationCount = segments.filter(s => s.type === 'annotation').length

    // 进度条走完后切换到内容
    this._finishLoadingProgress(() => {
      this.setData({
        isLoading: false,
        storySegments: segments,
        storyTitle: title,
        currentRound: annotationCount,
        maxRounds: 5,
        canContinue: true
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

      // 跳过标题行
      if (i === 0 && /^《.*》$/.test(line)) continue

      // 注释块 【...】
      if (line.startsWith('【') && line.endsWith('】')) {
        if (currentText.trim()) {
          segments.push({ type: 'text', content: currentText.trim() })
          currentText = ''
        }
        segments.push({
          type: 'annotation',
          content: line.slice(1, -1).trim(),
          expanded: false
        })
        continue
      }

      // 空行 = 段落分隔
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

    // 标记紧跟注释的正文段落，用于去掉间距
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

  // 错误状态 -> 重试
  onRetry() {
    this.loadStory()
  },

  // 通用二级确认：抖动 → 字样变更 → 3s 超时恢复 → 二次点击执行
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
    if (this.data.hasError) {
      wx.switchTab({ url: '/page/mbti/index' })
      return
    }
    this._confirmAction('backConfirming', '_backTimer', () => {
      wx.switchTab({ url: '/page/mbti/index' })
    })
  },

  goContinue() {
    this._confirmAction('continueConfirming', '_continueTimer', () => {
      wx.navigateTo({ url: '/page/continue/continue' })
    })
  },

  goHistory() {
    this._confirmAction('historyConfirming', '_historyTimer', () => {
      wx.navigateTo({ url: '/page/history/history' })
    })
  },

  // 返回主页
  goHome() {
    wx.switchTab({ url: '/page/home/index' })
  },

  // 折叠/展开注释
  toggleAnnotation(e) {
    const index = e.currentTarget.dataset.index
    const key = `storySegments[${index}].expanded`
    this.setData({ [key]: !this.data.storySegments[index].expanded }, () => {
      // 展开/折叠改变了内容高度，重新查询
      this.queryBodyPosition()
    })
  },

  // ============================
  //  阅读进度条
  // ============================

  queryBodyPosition() {
    this.createSelectorQuery()
      .select('.story-body')
      .boundingClientRect()
      .exec((res) => {
        if (res && res[0]) {
          this._bodyTop = res[0].top + this._scrollTop
          this._bodyHeight = res[0].height
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
