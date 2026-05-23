const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const page = Math.max(1, event.page || 1)
  const pageSize = Math.min(50, Math.max(1, event.pageSize || 20))

  try {
    const countResult = await db.collection('stories')
      .where({ openid: OPENID })
      .count()

    const total = countResult.total

    const queryResult = await db.collection('stories')
      .where({ openid: OPENID })
      .field({
        title: true,
        mbti: true,
        gender: true,
        currentRound: true,
        maxRounds: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        rounds: true,
      })
      .orderBy('updatedAt', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()

    const stories = queryResult.data.map(s => {
      let totalWordCount = 0
      if (s.rounds && Array.isArray(s.rounds)) {
        s.rounds.forEach(r => { totalWordCount += (r.wordCount || 0) })
      }
      return {
        _id: s._id,
        title: s.title,
        mbti: s.mbti,
        gender: s.gender,
        currentRound: s.currentRound,
        maxRounds: s.maxRounds,
        status: s.status,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        totalWordCount,
      }
    })

    return {
      success: true,
      data: {
        stories,
        total,
        page,
        pageSize,
      },
    }
  } catch (err) {
    console.error('getStoryHistory error:', err)
    return { success: false, error: { code: 'QUERY_ERROR', message: '查询失败' } }
  }
}
