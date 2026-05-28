// ============================================================
//  app.js — 小程序全局入口
// ============================================================
//  职责：
//    1. 初始化云开发环境（CloudBase）
//    2. 管理全局数据（登录状态、主题色、形状动画开关等）
//    3. 提供主题变更的发布/订阅机制
//    4. 所有页面通过 getApp() 访问 globalData 共享状态
// ============================================================

// 主题变更监听器列表（发布-订阅模式）
const themeListeners = []

App({
  // ----------------------------------------------------------
  //  生命周期：小程序启动（只触发一次）
  //  @param {object} opts — 启动参数（场景值、referrerInfo 等）
  // ----------------------------------------------------------
  onLaunch(opts, data) {
    console.log('App Launch', opts)

    // 初始化云开发能力（需要基础库 >= 2.2.3）
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'cloud1-2gj8viqpaf4a9ff5',  // 云环境 ID
        traceUser: true,                   // 记录用户访问
      })
    }
  },

  // ----------------------------------------------------------
  //  生命周期：小程序从后台进入前台
  // ----------------------------------------------------------
  onShow(opts) {
    console.log('App Show', opts)
  },

  // ----------------------------------------------------------
  //  生命周期：小程序从前台进入后台
  // ----------------------------------------------------------
  onHide() {
    console.log('App Hide')
  },

  // ----------------------------------------------------------
  //  系统主题变更回调（暗黑/浅色模式切换）
  //  微信会调此方法并传入新主题值
  // ----------------------------------------------------------
  onThemeChange({ theme }) {
    this.globalData.theme = theme
    // 通知所有订阅者
    themeListeners.forEach((listener) => {
      listener(theme)
    })
  },

  // ----------------------------------------------------------
  //  订阅主题变更（用于组件/页面跟随主题变化）
  //  @param {function} listener — 回调函数，接收新 theme 值
  // ----------------------------------------------------------
  watchThemeChange(listener) {
    if (themeListeners.indexOf(listener) < 0) {
      themeListeners.push(listener)
    }
  },

  // ----------------------------------------------------------
  //  取消主题变更订阅
  // ----------------------------------------------------------
  unWatchThemeChange(listener) {
    const index = themeListeners.indexOf(listener)
    if (index > -1) {
      themeListeners.splice(index, 1)
    }
  },

  // ----------------------------------------------------------
  //  全局共享数据
  //  - theme:          系统主题（light / dark）
  //  - themeColor:     品牌主色调（全局统一使用）
  //  - hasLogin:       用户是否已登录
  //  - openid:         微信 openid（登录后填充）
  //  - shapesEnabled:  背景形状动画开关（持久化到 storage）
  // ----------------------------------------------------------
  globalData: {
    theme: wx.getSystemInfoSync().theme,
    themeColor: '#e74c3c',
    hasLogin: false,
    openid: null,
    shapesEnabled: wx.getStorageSync('shapesEnabled') !== false,
  }
})