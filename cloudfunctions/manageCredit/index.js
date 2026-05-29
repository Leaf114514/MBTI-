const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const usersCollection = db.collection('users')

const INITIAL_CREDIT = 100

function makeSuccess(data, warnings = []) {
  return { success: true, data, warnings, error: null }
}

function makeError(code, message) {
  return { success: false, data: null, warnings: [], error: { code, message } }
}

async function handleGet(openid) {
  const userQuery = await usersCollection.where({ openid }).field({ credit: true }).get()
  if (!userQuery.data || userQuery.data.length === 0) {
    return makeError('USER_NOT_FOUND', '用户未注册')
  }

  const user = userQuery.data[0]
  if (user.credit === undefined || user.credit === null) {
    await usersCollection.doc(user._id).update({ data: { credit: INITIAL_CREDIT } })
    return makeSuccess({ credit: INITIAL_CREDIT })
  }

  return makeSuccess({ credit: user.credit })
}

async function handleConsume(openid, amount) {
  if (!Number.isInteger(amount) || amount <= 0) {
    return makeError('INVALID_AMOUNT', '消费积分必须为正整数')
  }

  const userQuery = await usersCollection.where({ openid }).field({ credit: true }).get()
  if (!userQuery.data || userQuery.data.length === 0) {
    return makeError('USER_NOT_FOUND', '用户未注册')
  }

  const user = userQuery.data[0]
  const currentCredit = user.credit !== undefined ? user.credit : INITIAL_CREDIT

  if (currentCredit < amount) {
    return makeError('INSUFFICIENT_CREDIT', '积分不足')
  }

  await usersCollection.doc(user._id).update({ data: { credit: _.inc(-amount) } })
  return makeSuccess({ credit: currentCredit - amount })
}

async function handleEarn(openid, amount) {
  if (!Number.isInteger(amount) || amount <= 0) {
    return makeError('INVALID_AMOUNT', '获取积分必须为正整数')
  }

  const userQuery = await usersCollection.where({ openid }).field({ credit: true }).get()
  if (!userQuery.data || userQuery.data.length === 0) {
    return makeError('USER_NOT_FOUND', '用户未注册')
  }

  const user = userQuery.data[0]
  const currentCredit = user.credit !== undefined ? user.credit : INITIAL_CREDIT

  await usersCollection.doc(user._id).update({ data: { credit: _.inc(amount) } })
  return makeSuccess({ credit: currentCredit + amount })
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  if (!openid) {
    return makeError('NOT_AUTHORIZED', '无法获取用户身份')
  }

  try {
    const action = event.action || 'get'

    switch (action) {
      case 'get':
        return await handleGet(openid)
      case 'consume':
        return await handleConsume(openid, event.amount || 0)
      case 'earn':
        return await handleEarn(openid, event.amount || 0)
      default:
        return makeError('INVALID_ACTION', `未知操作: ${action}`)
    }
  } catch (e) {
    console.error('[manageCredit] 云函数执行失败:', e)
    return makeError('CLOUD_FUNCTION_ERROR', e.message || '云函数执行失败')
  }
}
