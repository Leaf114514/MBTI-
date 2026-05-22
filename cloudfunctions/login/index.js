// cloudfunctions/login/index.js
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const usersCollection = db.collection('users');

/** 16 种标准 MBTI 类型白名单（与 getUserProfile 保持一致） */
const VALID_MBTI_TYPES = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP'
]

/** 合法性别值（与 getUserProfile 保持一致） */
const VALID_GENDERS = ['男', '女']

/**
 * 校验新用户注册时传入的 profile 数据
 * @param {Object} profile - 前端传入的 profile 对象
 * @returns {{ valid: boolean, error: Object|null }}
 */
function validateProfileForRegistration(profile) {
  // 检查 profile 是否为有效对象（注意：typeof null === 'object'，Array.isArray 防御数组）
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) {
    return { valid: false, error: { code: 'INVALID_PROFILE', message: 'MBTI类型不能为空' } }
  }

  // 校验 mbti
  if (!profile.mbti || typeof profile.mbti !== 'string') {
    return { valid: false, error: { code: 'INVALID_PROFILE', message: 'MBTI类型不能为空' } }
  }
  const normalizedMbti = profile.mbti.trim().toUpperCase()
  if (!VALID_MBTI_TYPES.includes(normalizedMbti)) {
    return { valid: false, error: { code: 'INVALID_PROFILE', message: `MBTI类型值非法: ${profile.mbti}` } }
  }

  // 校验 gender
  if (!profile.gender || typeof profile.gender !== 'string') {
    return { valid: false, error: { code: 'INVALID_PROFILE', message: '性别不能为空' } }
  }
  const normalizedGender = profile.gender.trim()
  if (!VALID_GENDERS.includes(normalizedGender)) {
    return { valid: false, error: { code: 'INVALID_PROFILE', message: `性别值非法: ${profile.gender}` } }
  }

  return { valid: true, error: null }
}

exports.main = async (event, context) => {
  try {
    const wxContext = cloud.getWXContext();
    const { OPENID, APPID, UNIONID } = wxContext;

    const userQueryResult = await usersCollection.where({
      openid: OPENID
    }).get();

    const now = new Date();

    // 老用户路径：仅更新 lastLoginAt，不修改 profile
    if (userQueryResult.data.length > 0) {
      const existingUser = userQueryResult.data[0];

      await usersCollection.doc(existingUser._id).update({
        data: {
          lastLoginAt: now
        }
      });

      return {
        success: true,
        isNewUser: false,
        openid: OPENID,
        appid: APPID,
        unionid: UNIONID || null,
        user: {
          _id: existingUser._id,
          openid: existingUser.openid,
          profile: existingUser.profile || {
            nickName: '',
            avatarUrl: ''
          },
          createdAt: existingUser.createdAt,
          lastLoginAt: now
        }
      };
    }

    // 新用户路径：校验 profile 入参
    const validation = validateProfileForRegistration(
      event && event.profile ? event.profile : null
    );
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // 归一化后写入
    const normalizedMbti = event.profile.mbti.trim().toUpperCase();
    const normalizedGender = event.profile.gender.trim();

    const addResult = await usersCollection.add({
      data: {
        openid: OPENID,
        createdAt: now,
        lastLoginAt: now,
        profile: {
          nickName: event.profile.nickName || '',
          avatarUrl: event.profile.avatarUrl || '',
          mbti: normalizedMbti,
          gender: normalizedGender
        }
      }
    });

    return {
      success: true,
      isNewUser: true,
      openid: OPENID,
      appid: APPID,
      unionid: UNIONID || null,
      user: {
        _id: addResult._id,
        openid: OPENID,
        profile: {
          nickName: event.profile.nickName || '',
          avatarUrl: event.profile.avatarUrl || '',
          mbti: normalizedMbti,
          gender: normalizedGender
        },
        createdAt: now,
        lastLoginAt: now
      }
    };
  } catch (error) {
    console.error('login cloud function error:', error);
    return {
      success: false,
      error: error.message || 'Unknown error'
    };
  }
};
