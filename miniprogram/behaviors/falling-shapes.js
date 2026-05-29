const SHAPE_COLORS = [
  'rgba(255, 107, 107, 0.10)',
  'rgba(255, 142, 142, 0.08)',
  'rgba(255, 209, 102, 0.08)',
  'rgba(167, 139, 250, 0.08)',
]

const SHAPE_TYPES = ['square', 'circle', 'diamond', 'triangle']

function buildInlineStyle(item) {
  if (item.type === 'triangle') {
    return `left:${item.left}rpx;width:0;height:0;background:transparent;border-left:${item.size / 2}rpx solid transparent;border-right:${item.size / 2}rpx solid transparent;border-bottom:${item.size}rpx solid ${item.color};animation:shape-fall ${item.duration}s ${item.delay}s linear infinite;`
  }
  return `left:${item.left}rpx;width:${item.size}rpx;height:${item.size}rpx;background-color:${item.color};animation:shape-fall ${item.duration}s ${item.delay}s linear infinite;`
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
      delay: Math.random() * 10,
    }
    item.inlineStyle = buildInlineStyle(item)
    shapes.push(item)
  }
  return shapes
}

module.exports = Behavior({
  data: {
    shapes: [],
    shapesHidden: false,
  },

  attached() {
    this.setData({ shapes: generateShapes(12) })
  },

  // active 属性 observer：swiper 切换 tab 时由 shell 控制
  observers: {
    active(val) {
      if (val) {
        const enabled = getApp().globalData.shapesEnabled !== false
        this.setData({ shapesHidden: !enabled })
      } else {
        this.setData({ shapesHidden: true })
      }
    }
  },

  // 保留 pageLifetimes 用于整个应用前后台切换
  pageLifetimes: {
    show() {
      if (this.data.active === undefined) {
        const enabled = getApp().globalData.shapesEnabled !== false
        this.setData({ shapesHidden: !enabled })
      }
    },
    hide() {
      if (this.data.active === undefined) {
        this.setData({ shapesHidden: true })
      }
    },
  },
})
