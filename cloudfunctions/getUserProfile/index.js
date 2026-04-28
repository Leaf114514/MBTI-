const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// ======== 常量定义区 ========

/** 16 种标准 MBTI 类型白名单 */
const VALID_MBTI_TYPES = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP'
]

/** 合法性别值 */
const VALID_GENDERS = ['男', '女']

// ======== 校验纯函数 ========

/**
 * 校验用户 Profile 数据的合法性
 * @param {Object|undefined|null} profile - 从数据库读取的 profile 对象
 * @returns {{ mbti: string|null, gender: string|null, warnings: Array<Object> }}
 */
function validateProfileData(profile) {
  const warnings = []
  let mbti = null
  let gender = null

  const safeProfile = profile || {}

  // ---- 1. 校验 mbti ----
  if (!safeProfile.mbti) {
    warnings.push({ type: 'MISSING_FIELD', field: 'mbti', message: '用户MBTI类型为空' })
  } else if (!VALID_MBTI_TYPES.includes(safeProfile.mbti)) {
    warnings.push({ type: 'INVALID_MBTI_VALUE', value: safeProfile.mbti, message: 'MBTI类型值非法' })
  } else {
    mbti = safeProfile.mbti
  }

  // ---- 2. 校验 gender ----
  if (!safeProfile.gender) {
    warnings.push({ type: 'MISSING_FIELD', field: 'gender', message: '用户性别为空' })
  } else if (!VALID_GENDERS.includes(safeProfile.gender)) {
    warnings.push({ type: 'INVALID_GENDER_VALUE', value: safeProfile.gender, message: '性别值非法' })
  } else {
    gender = safeProfile.gender
  }

  return { mbti, gender, warnings }
}

// ======== 主入口 ========

/**
 * getUserProfile 云函数入口
 * 从 users 集合读取当前用户的 MBTI 类型和性别信息
 * @param {Object} event - 小程序端传入的事件参数
 * @param {Object} context - 云函数执行上下文
 * @returns {Promise<{ success: boolean, data: Object|null, warnings: Array, error: Object|null }>}
 */
exports.main = async (event, context) => {
  try {
    // ---- 1. 获取用户身份 ----
    const wxContext = cloud.getWXContext()
    const openid = wxContext.OPENID

    if (!openid) {
      return {
        success: false,
        data: null,
        warnings: [],
        error: { code: 'NOT_AUTHORIZED', message: '无法获取用户身份' }
      }
    }

    // ---- 2. 查询用户数据 ----
    const userDoc = await db.collection('users')
      .where({ openid })
      .field({ 'profile.mbti': true, 'profile.gender': true })
      .get()

    if (!userDoc.data || userDoc.data.length === 0) {
      return {
        success: false,
        data: null,
        warnings: [],
        error: { code: 'USER_NOT_FOUND', message: '用户未注册' }
      }
    }

    // ---- 3. 校验并返回结果 ----
    const profile = userDoc.data[0].profile
    const { mbti, gender, warnings } = validateProfileData(profile)

    return {
      success: true,
      data: { mbti, gender },
      warnings,
      error: null
    }
  } catch (e) {
    console.error('[getUserProfile] 云函数执行异常:', e)
    return {
      success: false,
      data: null,
      warnings: [],
      error: { code: 'CLOUD_FUNCTION_ERROR', message: '服务异常，请稍后重试' }
    }
  }
}
