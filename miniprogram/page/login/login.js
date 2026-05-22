const { list: sloganList } = require('../../data/mbtiBanner')

const LETTER_COLORS = ['#A78BFA', '#4ECDC4', '#3B82F6', '#FFD166']

const SHAPE_COLORS = [
  'rgba(167,139,250,0.13)',
  'rgba(255,209,102,0.13)',
  'rgba(78,205,196,0.13)',
  'rgba(59,130,246,0.13)'
]

const SHAPE_TYPES = ['square', 'circle', 'diamond', 'triangle']

function shuffle(arr) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function buildInlineStyle(item) {
  if (item.type === 'triangle') {
    return `left:${item.left}rpx; width:0; height:0; background:transparent; border-left:${item.size / 2}rpx solid transparent; border-right:${item.size / 2}rpx solid transparent; border-bottom:${item.size}rpx solid ${item.color}; animation: shape-fall ${item.duration}s ${item.delay}s linear infinite;`
  }
  return `left:${item.left}rpx; width:${item.size}rpx; height:${item.size}rpx; background-color:${item.color}; animation: shape-fall ${item.duration}s ${item.delay}s linear infinite;`
}

function generateShapes(count) {
  const shapes = []
  for (let i = 0; i < count; i++) {
    const item = {
      type: SHAPE_TYPES[Math.floor(Math.random() * SHAPE_TYPES.length)],
      color: SHAPE_COLORS[Math.floor(Math.random() * SHAPE_COLORS.length)],
      left: Math.floor(Math.random() * 700),
      size: 16 + Math.floor(Math.random() * 32),
      duration: 6 + Math.random() * 8,
      delay: Math.random() * 10
    }
    item.inlineStyle = buildInlineStyle(item)
    shapes.push(item)
  }
  return shapes
}

Page({
  data: {
    userInfo: null,
    isNewUser: false,
    currentSlogan: '',
    letterColors: [],
    btnText: '微信快捷登录',
    btnDisabled: false,
    btnShaking: false,
    shapes: [],
    shapesVisible: true,
    toggleLabel: 'O',
    toggleShaking: false
  },

  onLoad() {
    const randomIndex = Math.floor(Math.random() * sloganList.length)
    this.setData({
      currentSlogan: sloganList[randomIndex],
      letterColors: shuffle(LETTER_COLORS),
      shapes: generateShapes(18)
    })
  },

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

  _setBtn(text, disabled, shaking) {
    this.setData({
      btnText: text,
      btnDisabled: !!disabled,
      btnShaking: !!shaking
    })
  },

  _revertBtn() {
    this.setData({
      btnText: '微信快捷登录',
      btnDisabled: false,
      btnShaking: false
    })
  },

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

      this.setData({
        userInfo: result.user,
        isNewUser: result.isNewUser
      })
      this._setBtn(result.isNewUser ? '已创建新用户' : '欢迎回来', true)

      console.log('Login success:', result)
      setTimeout(() => {
        wx.switchTab({ url: '/page/home/index' })
      }, 600)
    } catch (err) {
      console.error('Cloud function call failed:', err)
      this._setBtn('云端服务获取失败', true, true)
      setTimeout(() => this._revertBtn(), 2000)
    }
  }
})
