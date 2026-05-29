// ============================================================
//  page/login/login.js — 登录页
// ============================================================
//  职责：
//    1. 展示 MBTI 主题色标语动画
//    2. 微信云函数一键登录（无需用户授权信息）
//    3. 背景几何形状飘落动画（可开关）
//    4. 登录成功后跳转到主页
// ============================================================

// 标语库 —— 从数据模块引入
const { list: sloganList } = require('../../data/mbtiBanner')

// ----------------------------------------------------------
//  四个字母的边框描边颜色（渐变循环）
// ----------------------------------------------------------
const LETTER_COLORS = ['#A78BFA', '#4ECDC4', '#3B82F6', '#FFD166']

// ----------------------------------------------------------
//  几何形状颜色（半透明，用于背景飘落）
// ----------------------------------------------------------
const SHAPE_COLORS = [
  'rgba(167,139,250,0.13)',
  'rgba(255,209,102,0.13)',
  'rgba(78,205,196,0.13)',
  'rgba(59,130,246,0.13)'
]

// 几何形状类型
const SHAPE_TYPES = ['square', 'circle', 'diamond', 'triangle']

// ----------------------------------------------------------
//  工具：Fisher-Yates 洗牌算法
//  用于随机分配字母颜色，避免每次相同
// ----------------------------------------------------------
function shuffle(arr) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ----------------------------------------------------------
//  工具：构建单个形状的内联样式
//  三角形需特殊处理（CSS border 模拟）
// ----------------------------------------------------------
function buildInlineStyle(item) {
  if (item.type === 'triangle') {
    // 三角形 = 0 宽高 + 三边 border（仅 bottom 有颜色）
    return 'left:' + item.left + 'rpx; width:0; height:0; background:transparent; border-left:' + (item.size / 2) + 'rpx solid transparent; border-right:' + (item.size / 2) + 'rpx solid transparent; border-bottom:' + item.size + 'rpx solid ' + item.color + '; animation: shape-fall ' + item.duration + 's ' + item.delay + 's linear infinite;'
  }
  // 正方形 / 圆形 / 菱形
  return 'left:' + item.left + 'rpx; width:' + item.size + 'rpx; height:' + item.size + 'rpx; background-color:' + item.color + '; animation: shape-fall ' + item.duration + 's ' + item.delay + 's linear infinite;'
}

// ----------------------------------------------------------
//  工具：生成一批随机形状对象
//  @param {number} count — 形状数量
//  @returns {array} [{ type, color, left, size, duration, delay, inlineStyle }]
// ----------------------------------------------------------
function generateShapes(count) {
  const shapes = []
  for (let i = 0; i < count; i++) {
    const item = {
      type: SHAPE_TYPES[Math.floor(Math.random() * SHAPE_TYPES.length)],
      color: SHAPE_COLORS[Math.floor(Math.random() * SHAPE_COLORS.length)],
      left: Math.floor(Math.random() * 700),                    // 横向位置 0~700rpx
      size: 16 + Math.floor(Math.random() * 32),                 // 大小 16~48rpx
      duration: 6 + Math.random() * 8,                           // 动画时长 6~14s
      delay: Math.random() * 10                                  // 延迟 0~10s
    }
    item.inlineStyle = buildInlineStyle(item)
    shapes.push(item)
  }
  return shapes
}

Page({
  // ----------------------------------------------------------
  //  页面数据
  // ----------------------------------------------------------
  data: {
    userInfo: null,            // 用户信息（登录成功后）
    isNewUser: false,          // 是否新用户
    currentSlogan: '',         // 当前展示的标语
    letterColors: [],          // 四个字母的颜色数组

    // 登录按钮状态
    btnText: '微信快捷登录',
    btnDisabled: false,
    btnShaking: false,

    // 背景形状动画
    shapes: [],               // 形状对象数组
    shapesVisible: true,      // 形状是否可见

    // 形状开关按钮
    toggleLabel: 'O',         // O=显示 / \=关闭
    toggleShaking: false,
  },

  // ----------------------------------------------------------
  //  页面加载：随机选标语，生成形状，随机化字母颜色
  // ----------------------------------------------------------
  onLoad() {
    const randomIndex = Math.floor(Math.random() * sloganList.length)
    this.setData({
      currentSlogan: sloganList[randomIndex],
      letterColors: shuffle(LETTER_COLORS),
      shapes: generateShapes(18)   // 18 个形状飘落
    })
  },

  // ----------------------------------------------------------
  //  切换背景形状动画的显示/隐藏
  // ----------------------------------------------------------
  toggleShapes() {
    const show = !this.data.shapesVisible
    this.setData({
      toggleShaking: true,
      toggleLabel: show ? 'O' : '\\',
      shapesVisible: show
    })
    setTimeout(() => {
      this.setData({ toggleShaking: false })
    }, 500)
  },

  // ----------------------------------------------------------
  //  工具：设置登录按钮状态
  // ----------------------------------------------------------
  _setBtn(text, disabled, shaking) {
    this.setData({
      btnText: text,
      btnDisabled: !!disabled,
      btnShaking: !!shaking
    })
  },

  // ----------------------------------------------------------
  //  工具：恢复按钮到默认状态
  // ----------------------------------------------------------
  _revertBtn() {
    this.setData({
      btnText: '微信快捷登录',
      btnDisabled: false,
      btnShaking: false
    })
  },

  // ----------------------------------------------------------
  //  微信快捷登录流程
  //  1. 调用云函数 login（无需用户授权）
  //  2. 获取 openid + 用户信息
  //  3. 标记全局登录状态
  //  4. 600ms 后跳转到主页
  // ----------------------------------------------------------
  async handleWechatLogin() {
    this._setBtn('登录中...', true)

    try {
      const res = await wx.cloud.callFunction({ name: 'login' })
      const result = res.result

      if (!result.success) {
        this._setBtn('登录失败', true, true)
        setTimeout(() => this._revertBtn(), 2000)
        console.error('Login failed:', result.error)
        return
      }

      // 登录成功 — 保存用户信息
      this.setData({
        userInfo: result.user,
        isNewUser: result.isNewUser
      })

      // 写入全局状态
      const app = getApp()
      app.globalData.hasLogin = true
      app.globalData.openid = result.user.openid || null

      // 显示欢迎文案
      this._setBtn(result.isNewUser ? '已创建新用户' : '欢迎回来', true)

      console.log('Login success:', result)

      // 600ms 后启动 shell 页（全新实例，避免页面栈残留）
      setTimeout(() => {
        wx.reLaunch({ url: '/page/shell/index' })
      }, 600)

    } catch (err) {
      console.error('Cloud function call failed:', err)
      this._setBtn('云端服务获取失败', true, true)
      setTimeout(() => this._revertBtn(), 2000)
    }
  }
})