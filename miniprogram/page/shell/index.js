// ============================================================
//  page/shell/index.js — Shell 页（唯一页面）
// ============================================================
//  职责：
//    1. 管理 swiper 的 currentTab 切换
//    2. 统一管理导航栏颜色、页面背景色
//    3. 管理 tabbar 状态
//    4. 委托分享给活跃 tab 组件
//    5. 处理从其他页面返回的 pendingTab
// ============================================================

Page({
  data: {
    currentTab: 0,
    darkTheme: false,
    themeColor: '#FF6B6B',
  },

  // ----------------------------------------------------------
  //  页面加载：从 URL 参数恢复 tab（处理 wx.reLaunch 场景）
  // ----------------------------------------------------------
  onLoad(options) {
    if (options && options.tab !== undefined) {
      this.setData({ currentTab: parseInt(options.tab) })
    }
    // 登录检查：未登录直接替换为登录页（避免主页闪现）
    const app = getApp()
    if (!app.globalData.hasLogin) {
      wx.redirectTo({ url: '/page/login/login' })
    }
  },

  // ----------------------------------------------------------
  //  页面显示：同步主题 + 通知活跃 tab + 处理 pendingTab
  // ----------------------------------------------------------
  onShow() {
    // 从 Story 页返回时，通过 globalData 指定目标 tab
    const app = getApp()
    const pending = app.globalData.pendingTab
    if (pending !== undefined) {
      delete app.globalData.pendingTab
      if (pending !== this.data.currentTab) {
        this.setData({ currentTab: pending })
      }
    }
    // 同步主题
    const isDark = !!app.globalData.darkTheme
    const accentColor = app.globalData.darkThemeAccent || '#FF6B6B'
    this.setData({ darkTheme: isDark, themeColor: accentColor })
    this._applyTheme()
    // 已登录才通知活跃 tab（避免未登录时触发翻牌动画）
    if (app.globalData.hasLogin) {
      this._callActiveTab('onTabActive')
    }
  },

  // ----------------------------------------------------------
  //  委托分享给活跃 tab 组件
  // ----------------------------------------------------------
  onShareAppMessage() {
    const comp = this._getActiveTabComponent()
    if (comp && typeof comp.getShareMessage === 'function') {
      return comp.getShareMessage()
    }
    return { title: 'MBTI', path: '/page/shell/index' }
  },

  // =============================================
  //   Swiper 滑动切换
  // =============================================
  onSwiperChange(e) {
    const index = e.detail.current
    if (index === this.data.currentTab) return
    this._callActiveTab('onTabInactive')
    // 切 tab 前从 globalData 同步最新主题状态，避免翻牌后切页颜色延迟
    const app = getApp()
    this.setData({
      currentTab: index,
      darkTheme: !!app.globalData.darkTheme,
      themeColor: app.globalData.darkThemeAccent || '#FF6B6B',
    })
    this._callActiveTab('onTabActive')
    this._applyTheme()
  },

  // =============================================
  //   TabBar 点击 / 子组件 switchTab 事件
  // =============================================
  onSwitchTab(e) {
    const index = e.detail ? e.detail.index : e.currentTarget.dataset.index
    if (index === undefined || index === this.data.currentTab) return
    this._callActiveTab('onTabInactive')
    this.setData({ currentTab: index })
    // swiper bindchange 会自动触发 onSwiperChange
  },

  // =============================================
  //   子组件 themeChange 事件
  // =============================================
  onThemeUpdate(e) {
    const { isDark, accentColor } = e.detail
    const app = getApp()
    app.globalData.darkTheme = isDark
    app.globalData.darkThemeAccent = accentColor || '#FF6B6B'
    this.setData({ darkTheme: isDark, themeColor: accentColor || '#FF6B6B' })
    this._applyTheme()
  },

  // =============================================
  //   内部工具方法
  // =============================================

  _applyTheme() {
    // 始终从 globalData 读取最新值，确保翻牌后切 tab 导航栏也即时更新
    const app = getApp()
    const isDark = !!app.globalData.darkTheme
    const accentColor = app.globalData.darkThemeAccent || '#FF6B6B'
    this.setData({ darkTheme: isDark, themeColor: accentColor })
    wx.setBackgroundColor({ backgroundColor: isDark ? '#1A1A28' : '#FFFBFB' })
    wx.setNavigationBarColor({
      frontColor: isDark ? '#ffffff' : '#000000',
      backgroundColor: isDark ? '#1E1E2A' : '#ffffff',
      animation: { duration: 200, timingFunc: 'easeIn' }
    })
  },

  _getActiveTabComponent() {
    const ids = ['tab-home', 'tab-mbti', 'tab-profile']
    return this.selectComponent('#' + ids[this.data.currentTab])
  },

  _callActiveTab(method) {
    const comp = this._getActiveTabComponent()
    if (comp && typeof comp[method] === 'function') {
      comp[method]()
    }
  },
})
