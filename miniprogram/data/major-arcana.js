/**
 * 22张大阿卡纳牌数据
 * 每张牌包含：id、中文名、编号、CSS图形数据（shapes）、关键词主题（themes）
 * shapes 在 280×360rpx 的牌面框架内定位，使用 rpx 坐标
 */

// 原始牌面数据（线段在导出时预计算角度和长度）
var CARDS = [
  {
    id: 0, name: '愚 者', numeral: '0',
    shapes: [
      { type: 'circle', x: 185, y: 100, r: 22 },
      { type: 'line', x1: 40, y1: 255, x2: 240, y2: 280 },
      { type: 'circle', x: 125, y: 175, r: 10 },
      { type: 'line', x1: 125, y1: 185, x2: 115, y2: 250 },
      { type: 'line', x1: 125, y1: 185, x2: 150, y2: 235 },
    ],
    themes: ['自由', '好奇']
  },
  {
    id: 1, name: '魔术师', numeral: 'I',
    shapes: [
      { type: 'circle', x: 115, y: 145, r: 28 },
      { type: 'circle', x: 165, y: 145, r: 28 },
      { type: 'line', x1: 35, y1: 235, x2: 245, y2: 235 },
    ],
    themes: ['创造', '专注']
  },
  {
    id: 2, name: '女 祭 司', numeral: 'II',
    shapes: [
      { type: 'line', x1: 65, y1: 80, x2: 65, y2: 280 },
      { type: 'line', x1: 215, y1: 80, x2: 215, y2: 280 },
      { type: 'circle', x: 140, y: 165, r: 32 },
    ],
    themes: ['洞察', '深度']
  },
  {
    id: 3, name: '女 皇', numeral: 'III',
    shapes: [
      { type: 'line', x1: 75, y1: 185, x2: 110, y2: 115 },
      { type: 'line', x1: 110, y1: 115, x2: 140, y2: 160 },
      { type: 'line', x1: 140, y1: 160, x2: 170, y2: 115 },
      { type: 'line', x1: 170, y1: 115, x2: 205, y2: 185 },
      { type: 'line', x1: 60, y1: 185, x2: 220, y2: 185 },
    ],
    themes: ['温暖', '慷慨']
  },
  {
    id: 4, name: '皇 帝', numeral: 'IV',
    shapes: [
      { type: 'line', x1: 140, y1: 90, x2: 140, y2: 275 },
      { type: 'line', x1: 95, y1: 130, x2: 185, y2: 130 },
      { type: 'line', x1: 100, y1: 190, x2: 180, y2: 190 },
      { type: 'circle', x: 140, y: 88, r: 10 },
    ],
    themes: ['坚定', '稳定']
  },
  {
    id: 5, name: '教 皇', numeral: 'V',
    shapes: [
      { type: 'line', x1: 140, y1: 85, x2: 140, y2: 275 },
      { type: 'line', x1: 105, y1: 105, x2: 175, y2: 105 },
      { type: 'line', x1: 95, y1: 150, x2: 185, y2: 150 },
      { type: 'line', x1: 105, y1: 195, x2: 175, y2: 195 },
    ],
    themes: ['信任', '忠诚']
  },
  {
    id: 6, name: '恋 人', numeral: 'VI',
    shapes: [
      { type: 'circle', x: 105, y: 170, r: 12 },
      { type: 'circle', x: 175, y: 170, r: 12 },
      { type: 'line', x1: 117, y1: 170, x2: 163, y2: 170 },
      { type: 'line', x1: 140, y1: 95, x2: 105, y2: 140 },
      { type: 'line', x1: 140, y1: 95, x2: 175, y2: 140 },
    ],
    themes: ['浪漫', '真诚']
  },
  {
    id: 7, name: '战 车', numeral: 'VII',
    shapes: [
      { type: 'rect', x: 85, y: 140, w: 110, h: 55 },
      { type: 'circle', x: 110, y: 220, r: 18 },
      { type: 'circle', x: 170, y: 220, r: 18 },
      { type: 'line', x1: 140, y1: 80, x2: 140, y2: 140 },
      { type: 'circle', x: 140, y: 75, r: 8 },
    ],
    themes: ['勇气', '行动']
  },
  {
    id: 8, name: '力 量', numeral: 'VIII',
    shapes: [
      { type: 'circle', x: 115, y: 140, r: 28 },
      { type: 'circle', x: 165, y: 140, r: 28 },
      { type: 'circle', x: 140, y: 225, r: 24 },
      { type: 'line', x1: 122, y1: 249, x2: 100, y2: 268 },
      { type: 'line', x1: 158, y1: 249, x2: 180, y2: 268 },
    ],
    themes: ['韧性', '耐心']
  },
  {
    id: 9, name: '隐 者', numeral: 'IX',
    shapes: [
      { type: 'rect', x: 75, y: 150, w: 55, h: 65 },
      { type: 'circle', x: 102, y: 135, r: 10 },
      { type: 'line', x1: 170, y1: 80, x2: 170, y2: 280 },
      { type: 'line', x1: 102, y1: 150, x2: 102, y2: 125 },
    ],
    themes: ['宁静', '独立']
  },
  {
    id: 10, name: '命运 之轮', numeral: 'X',
    shapes: [
      { type: 'circle', x: 140, y: 170, r: 70 },
      { type: 'circle', x: 140, y: 170, r: 45 },
      { type: 'circle', x: 140, y: 170, r: 18 },
      { type: 'line', x1: 140, y1: 100, x2: 140, y2: 240 },
      { type: 'line', x1: 70, y1: 170, x2: 210, y2: 170 },
    ],
    themes: ['灵感', '直觉']
  },
  {
    id: 11, name: '正 义', numeral: 'XI',
    shapes: [
      { type: 'line', x1: 140, y1: 80, x2: 140, y2: 270 },
      { type: 'line', x1: 100, y1: 205, x2: 180, y2: 205 },
      { type: 'line', x1: 55, y1: 130, x2: 225, y2: 130 },
      { type: 'circle', x: 75, y: 148, r: 10 },
      { type: 'circle', x: 205, y: 148, r: 10 },
    ],
    themes: ['逻辑', '坦率']
  },
  {
    id: 12, name: '倒 吊 人', numeral: 'XII',
    shapes: [
      { type: 'line', x1: 55, y1: 80, x2: 225, y2: 80 },
      { type: 'line', x1: 140, y1: 80, x2: 140, y2: 135 },
      { type: 'circle', x: 140, y: 155, r: 12 },
      { type: 'circle', x: 140, y: 155, r: 18 },
      { type: 'line', x1: 140, y1: 167, x2: 140, y2: 235 },
      { type: 'line', x1: 140, y1: 195, x2: 110, y2: 215 },
      { type: 'line', x1: 140, y1: 195, x2: 170, y2: 215 },
    ],
    themes: ['开放', '灵活']
  },
  {
    id: 13, name: '死 神', numeral: 'XIII',
    shapes: [
      { type: 'line', x1: 55, y1: 85, x2: 175, y2: 265 },
      { type: 'circle', x: 155, y: 125, r: 48 },
      { type: 'line', x1: 35, y1: 285, x2: 245, y2: 285 },
    ],
    themes: ['果断']
  },
  {
    id: 14, name: '节 制', numeral: 'XIV',
    shapes: [
      { type: 'rect', x: 70, y: 115, w: 50, h: 40 },
      { type: 'rect', x: 160, y: 205, w: 50, h: 40 },
      { type: 'line', x1: 120, y1: 145, x2: 160, y2: 205 },
      { type: 'line', x1: 140, y1: 80, x2: 140, y2: 280 },
    ],
    themes: ['和谐', '平静']
  },
  {
    id: 15, name: '恶 魔', numeral: 'XV',
    shapes: [
      { type: 'line', x1: 75, y1: 105, x2: 205, y2: 105 },
      { type: 'line', x1: 205, y1: 105, x2: 140, y2: 250 },
      { type: 'line', x1: 140, y1: 250, x2: 75, y2: 105 },
      { type: 'circle', x: 140, y: 165, r: 22 },
    ],
    themes: ['机智']
  },
  {
    id: 16, name: '塔', numeral: 'XVI',
    shapes: [
      { type: 'rect', x: 100, y: 95, w: 80, h: 190 },
      { type: 'line', x1: 55, y1: 75, x2: 90, y2: 145 },
      { type: 'line', x1: 90, y1: 145, x2: 65, y2: 185 },
      { type: 'line', x1: 65, y1: 185, x2: 100, y2: 210 },
      { type: 'circle', x: 140, y: 88, r: 10 },
    ],
    themes: ['远见']
  },
  {
    id: 17, name: '星 星', numeral: 'XVII',
    shapes: [
      { type: 'circle', x: 140, y: 125, r: 12 },
      { type: 'line', x1: 140, y1: 100, x2: 140, y2: 80 },
      { type: 'line', x1: 140, y1: 150, x2: 140, y2: 170 },
      { type: 'line', x1: 115, y1: 125, x2: 95, y2: 125 },
      { type: 'line', x1: 165, y1: 125, x2: 185, y2: 125 },
      { type: 'circle', x: 105, y: 235, r: 5 },
      { type: 'circle', x: 140, y: 248, r: 5 },
      { type: 'circle', x: 175, y: 235, r: 5 },
    ],
    themes: ['清晰']
  },
  {
    id: 18, name: '月 亮', numeral: 'XVIII',
    shapes: [
      { type: 'circle', x: 140, y: 130, r: 35 },
      { type: 'circle', x: 155, y: 120, r: 28 },
      { type: 'line', x1: 75, y1: 220, x2: 75, y2: 270 },
      { type: 'line', x1: 205, y1: 220, x2: 205, y2: 270 },
      { type: 'line', x1: 50, y1: 270, x2: 230, y2: 270 },
    ],
    themes: ['共情']
  },
  {
    id: 19, name: '太 阳', numeral: 'XIX',
    shapes: [
      { type: 'circle', x: 140, y: 155, r: 30 },
      { type: 'line', x1: 140, y1: 115, x2: 140, y2: 85 },
      { type: 'line', x1: 140, y1: 195, x2: 140, y2: 225 },
      { type: 'line', x1: 100, y1: 155, x2: 70, y2: 155 },
      { type: 'line', x1: 180, y1: 155, x2: 210, y2: 155 },
      { type: 'line', x1: 112, y1: 127, x2: 90, y2: 105 },
      { type: 'line', x1: 168, y1: 127, x2: 190, y2: 105 },
      { type: 'line', x1: 112, y1: 183, x2: 90, y2: 205 },
      { type: 'line', x1: 168, y1: 183, x2: 190, y2: 205 },
    ],
    themes: ['玩乐', '热情']
  },
  {
    id: 20, name: '审 判', numeral: 'XX',
    shapes: [
      { type: 'line', x1: 95, y1: 100, x2: 140, y2: 155 },
      { type: 'line', x1: 185, y1: 100, x2: 140, y2: 155 },
      { type: 'line', x1: 140, y1: 155, x2: 140, y2: 210 },
      { type: 'line', x1: 40, y1: 260, x2: 240, y2: 260 },
      { type: 'circle', x: 140, y: 90, r: 10 },
    ],
    themes: ['细致']
  },
  {
    id: 21, name: '世 界', numeral: 'XXI',
    shapes: [
      { type: 'circle', x: 140, y: 165, r: 65 },
      { type: 'line', x1: 140, y1: 100, x2: 140, y2: 230 },
      { type: 'line', x1: 75, y1: 165, x2: 205, y2: 165 },
    ],
    themes: ['幽默']
  },
]

// 预处理线段：计算长度和旋转角度（同 constellation-ring 模式）
function _processShapes(cards) {
  return cards.map(function(card) {
    return Object.assign({}, card, {
      shapes: card.shapes.map(function(s) {
        if (s.type === 'line') {
          var dx = s.x2 - s.x1
          var dy = s.y2 - s.y1
          return Object.assign({}, s, {
            len: Math.sqrt(dx * dx + dy * dy),
            angle: Math.atan2(dy, dx) * 180 / Math.PI
          })
        }
        return s
      })
    })
  })
}

var processedCards = _processShapes(CARDS)

/**
 * 根据签语关键词匹配最佳大阿卡纳牌
 * @param {string[]} keywords - 签语关键词数组
 * @returns {object} 匹配的大阿卡纳牌对象
 */
function getArcanaByKeywords(keywords) {
  if (!keywords || !keywords.length) return processedCards[0]
  var bestCard = processedCards[0]
  var bestScore = -1
  for (var i = 0; i < processedCards.length; i++) {
    var card = processedCards[i]
    var score = 0
    for (var j = 0; j < keywords.length; j++) {
      if (card.themes.indexOf(keywords[j]) !== -1) score++
    }
    if (score > bestScore) {
      bestScore = score
      bestCard = card
    }
  }
  if (bestScore === 0) {
    var hash = 0
    for (var k = 0; k < keywords.length; k++) {
      hash += keywords[k].charCodeAt(0)
    }
    return processedCards[hash % processedCards.length]
  }
  return bestCard
}

module.exports = {
  cards: processedCards,
  getArcanaByKeywords: getArcanaByKeywords
}
