// ============================================================
//  星座绘制工具（constellation-ring）
//  用途：卡背装饰，按概率在随机位置绘制一个完整星座
//  使用：
//    const { maybeGenConstellation, CONSTELLATION_CHANCE } = require('...')
//    this.setData({ constellation: maybeGenConstellation() })
// ============================================================

// ──────────────────────────────────────────────
//  可调参数
// ──────────────────────────────────────────────

/** 星座出现概率（0~1），0 = 永不出现，1 = 每次必出 */
const CONSTELLATION_CHANCE = 0.4

/** 星座图案边长（rpx），图案会缩放到这个正方形区域内 */
const CONSTELLATION_SIZE = 260

// ──────────────────────────────────────────────
//  12 星座连线数据
//    stars: { x, y } — 归一化坐标 0~100
//           big      — 是否主星（画大一点）
//    lines: [i, j]   — 连线索引对
// ──────────────────────────────────────────────

const PATTERNS = [
  {
    name: '白羊', symbol: '♈',
    stars: [
      { x: 18, y: 62, big: true },
      { x: 35, y: 40 },
      { x: 56, y: 28 },
      { x: 80, y: 22, big: true },
    ],
    lines: [[0, 1], [1, 2], [2, 3]],
  },
  {
    name: '金牛', symbol: '♉',
    stars: [
      { x: 28, y: 48, big: true },
      { x: 15, y: 28 },
      { x: 42, y: 25 },
      { x: 58, y: 35 },
      { x: 70, y: 18, big: true },
      { x: 48, y: 65 },
      { x: 38, y: 80 },
    ],
    lines: [[0, 1], [0, 2], [2, 3], [3, 4], [0, 5], [5, 6]],
  },
  {
    name: '双子', symbol: '♊',
    stars: [
      { x: 22, y: 18, big: true },
      { x: 28, y: 42 },
      { x: 32, y: 68 },
      { x: 62, y: 18, big: true },
      { x: 56, y: 42 },
      { x: 52, y: 68 },
      { x: 40, y: 48 },
    ],
    lines: [[0, 1], [1, 2], [3, 4], [4, 5], [1, 6], [4, 6]],
  },
  {
    name: '巨蟹', symbol: '♋',
    stars: [
      { x: 45, y: 18, big: true },
      { x: 28, y: 42 },
      { x: 62, y: 42 },
      { x: 35, y: 62 },
      { x: 55, y: 62 },
      { x: 48, y: 80 },
    ],
    lines: [[0, 1], [0, 2], [1, 3], [2, 4], [3, 5], [4, 5]],
  },
  {
    name: '狮子', symbol: '♌',
    stars: [
      { x: 18, y: 32, big: true },
      { x: 12, y: 52 },
      { x: 28, y: 68 },
      { x: 48, y: 62 },
      { x: 65, y: 42 },
      { x: 78, y: 28, big: true },
      { x: 55, y: 55 },
      { x: 42, y: 42 },
    ],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [3, 7], [7, 6], [6, 4]],
  },
  {
    name: '处女', symbol: '♍',
    stars: [
      { x: 28, y: 18, big: true },
      { x: 45, y: 38 },
      { x: 62, y: 22 },
      { x: 55, y: 55 },
      { x: 42, y: 65 },
      { x: 52, y: 80 },
      { x: 28, y: 55 },
    ],
    lines: [[0, 1], [2, 1], [1, 3], [3, 4], [4, 5], [1, 6]],
  },
  {
    name: '天秤', symbol: '♎',
    stars: [
      { x: 28, y: 28 },
      { x: 62, y: 28 },
      { x: 18, y: 52 },
      { x: 52, y: 52, big: true },
      { x: 32, y: 68 },
      { x: 58, y: 68 },
    ],
    lines: [[0, 1], [0, 2], [1, 3], [2, 3], [2, 4], [3, 5], [4, 5]],
  },
  {
    name: '天蝎', symbol: '♏',
    stars: [
      { x: 8, y: 22 },
      { x: 18, y: 32 },
      { x: 30, y: 38 },
      { x: 42, y: 40 },
      { x: 54, y: 42, big: true },
      { x: 65, y: 48 },
      { x: 75, y: 58 },
      { x: 80, y: 70 },
      { x: 72, y: 80 },
    ],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8]],
  },
  {
    name: '射手', symbol: '♐',
    stars: [
      { x: 22, y: 22 },
      { x: 38, y: 18, big: true },
      { x: 55, y: 28 },
      { x: 45, y: 48 },
      { x: 62, y: 52 },
      { x: 52, y: 68 },
      { x: 35, y: 62 },
      { x: 28, y: 42 },
    ],
    lines: [[0, 1], [1, 2], [2, 3], [3, 6], [6, 0], [3, 4], [4, 5], [5, 6], [3, 7]],
  },
  {
    name: '摩羯', symbol: '♑',
    stars: [
      { x: 18, y: 38 },
      { x: 32, y: 22, big: true },
      { x: 55, y: 28 },
      { x: 72, y: 42 },
      { x: 62, y: 58 },
      { x: 38, y: 55 },
    ],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0]],
  },
  {
    name: '水瓶', symbol: '♒',
    stars: [
      { x: 12, y: 28 },
      { x: 28, y: 22 },
      { x: 38, y: 38, big: true },
      { x: 55, y: 32 },
      { x: 65, y: 48 },
      { x: 82, y: 42 },
      { x: 32, y: 58 },
      { x: 48, y: 68 },
      { x: 65, y: 72 },
    ],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [6, 7], [7, 8]],
  },
  {
    name: '双鱼', symbol: '♓',
    stars: [
      { x: 18, y: 28 },
      { x: 28, y: 42, big: true },
      { x: 22, y: 58 },
      { x: 45, y: 48 },
      { x: 62, y: 38 },
      { x: 72, y: 28 },
      { x: 78, y: 48 },
    ],
    lines: [[0, 1], [1, 2], [1, 3], [3, 4], [4, 5], [4, 6]],
  },
]

// ──────────────────────────────────────────────
//  工具函数
// ──────────────────────────────────────────────

/**
 * 计算两点间的线段渲染参数
 * @param {number} x1  起点 x（归一化 0~100）
 * @param {number} y1  起点 y
 * @param {number} x2  终点 x
 * @param {number} y2  终点 y
 * @param {number} ox  图案左上角 x 偏移（rpx）
 * @param {number} oy  图案左上角 y 偏移（rpx）
 * @param {number} s   图案边长（rpx）
 * @returns {{ x, y, w, a }}  线段：左端坐标、长度、旋转角度
 */
function _calcLine(x1, y1, x2, y2, ox, oy, s) {
  const ax = x1 * s / 100 + ox
  const ay = y1 * s / 100 + oy
  const bx = x2 * s / 100 + ox
  const by = y2 * s / 100 + oy
  const dx = bx - ax
  const dy = by - ay
  return {
    x: ax,
    y: ay,
    w: Math.sqrt(dx * dx + dy * dy),
    a: Math.atan2(dy, dx) * 180 / Math.PI,
  }
}

// ──────────────────────────────────────────────
//  主函数：按概率生成一个星座（或返回 null）
// ──────────────────────────────────────────────

/**
 * 生成卡背星座数据
 * @param {number} [cardW=520]  卡片可用宽度（rpx）
 * @param {number} [cardH=720]  卡片可用高度（rpx）
 * @returns {Object|null}  星座渲染数据，或 null（未触发）
 *
 * 返回结构（非 null 时）：
 *   {
 *     name, symbol,
 *     stars: [{ x, y, big }],
 *     lines: [{ x, y, w, a }],
 *   }
 */
function maybeGenConstellation(cardW, cardH) {
  // 概率判断：未命中则返回 null
  if (Math.random() > CONSTELLATION_CHANCE) return null

  cardW = cardW || 520
  cardH = cardH || 720

  // 随机选取一个星座图案
  const idx = Math.floor(Math.random() * PATTERNS.length)
  const p = PATTERNS[idx]
  const size = CONSTELLATION_SIZE

  // 随机偏移，保证图案不超出卡片边界（留 20rpx 安全边距）
  const margin = 20
  const maxX = Math.max(0, cardW - size - margin * 2)
  const maxY = Math.max(0, cardH - size - margin * 2)
  const ox = margin + Math.random() * maxX
  const oy = margin + Math.random() * maxY

  // 将归一化坐标转为卡片上的绝对 rpx 坐标
  const stars = p.stars.map(function (s) {
    return {
      x: s.x * size / 100 + ox,
      y: s.y * size / 100 + oy,
      big: !!s.big,
    }
  })

  // 预计算每条连线的渲染参数（起点、长度、旋转角）
  const lines = p.lines.map(function (pair) {
    const s1 = p.stars[pair[0]]
    const s2 = p.stars[pair[1]]
    return _calcLine(s1.x, s1.y, s2.x, s2.y, ox, oy, size)
  })

  return {
    name: p.name,
    symbol: p.symbol,
    stars: stars,
    lines: lines,
  }
}

// ──────────────────────────────────────────────
//  导出
// ──────────────────────────────────────────────
module.exports = {
  CONSTELLATION_CHANCE: CONSTELLATION_CHANCE,
  CONSTELLATION_SIZE: CONSTELLATION_SIZE,
  maybeGenConstellation: maybeGenConstellation,
}
