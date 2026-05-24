const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const VALID_MBTI_TYPES = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP'
]

exports.main = async (event, context) => {
  try {
    const wxContext = cloud.getWXContext()
    const openid = wxContext.OPENID

    if (!openid) {
      return { success: false, error: { code: 'NOT_AUTHORIZED', message: '无法获取用户身份' } }
    }

    const { mbti } = event || {}
    if (!mbti || !VALID_MBTI_TYPES.includes(mbti)) {
      return { success: false, error: { code: 'INVALID_MBTI', message: '无效的MBTI类型' } }
    }

    const userQuery = await db.collection('users').where({ openid }).get()
    if (!userQuery.data || userQuery.data.length === 0) {
      return { success: false, error: { code: 'USER_NOT_FOUND', message: '用户未注册' } }
    }

    await db.collection('users').doc(userQuery.data[0]._id).update({
      data: {
        'profile.mbti': mbti
      }
    })

    return { success: true, data: { mbti } }
  } catch (e) {
    console.error('[updateMbti] error:', e)
    return { success: false, error: { code: 'UPDATE_ERROR', message: '更新失败' } }
  }
}
