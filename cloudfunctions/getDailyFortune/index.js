const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const ALL_TYPES = ['INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP',
  'ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP']

exports.main = async (event) => {
  const { type } = event || {}
  if (!type || !ALL_TYPES.includes(type)) {
    return { success: false, error: { code: 'INVALID_TYPE', message: '无效的MBTI类型' } }
  }

  try {
    const countResult = await db.collection('fortunes')
      .where({ type })
      .count()

    const total = countResult.total
    if (total === 0) {
      return { success: false, error: { code: 'NO_FORTUNE', message: '暂无签语数据' } }
    }

    const dayIndex = Math.floor(Date.now() / 86400000)
    const typeIdx = ALL_TYPES.indexOf(type)
    const idx = ((dayIndex * 7 + typeIdx * 13) % total + total) % total

    const queryResult = await db.collection('fortunes')
      .where({ type })
      .skip(idx)
      .limit(1)
      .get()

    const fortune = queryResult.data[0]
    if (!fortune) {
      return { success: false, error: { code: 'NO_FORTUNE', message: '签语获取失败' } }
    }

    return {
      success: true,
      data: {
        message: fortune.message,
        luckyColor: fortune.luckyColor,
        keywords: fortune.keywords
      }
    }
  } catch (err) {
    console.error('[getDailyFortune] error:', err)
    return { success: false, error: { code: 'QUERY_ERROR', message: '查询失败' } }
  }
}
