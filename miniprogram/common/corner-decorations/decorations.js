// ============================================================
//  卡背四角装饰配置（corner-decorations）
//  用途：随机返回一种卡背四角装饰图案，四角统一
//  颜色统一使用卡背暗红色调
// ============================================================

// ──────────────────────────────────────────────
//  4 种装饰风格，随机出现一种
// ──────────────────────────────────────────────

const STYLES = [
  { sym: '✿' },   // 花朵
  { sym: '✧' },   // 四芒星
  { sym: '❖' },   // 六瓣花
  { sym: '✦' },   // 四角星
]

/**
 * 随机生成四角装饰数据（四角内容相同）
 * @returns {Object}  { sym } 装饰符号
 */
function getCornerDecor() {
  const idx = Math.floor(Math.random() * STYLES.length)
  return { sym: STYLES[idx].sym }
}

module.exports = {
  getCornerDecor: getCornerDecor,
}
