/**
 * @file profile-service.js
 * @description 用户画像服务层，封装 getUserProfile 云函数调用，实现双层缓存（L1 内存 + L2 Storage）
 */

/**
 * 用户画像服务类
 * 提供用户画像获取、双层缓存管理等功能
 */
class ProfileService {
  /**
   * 构造函数，初始化双层缓存容器和缓存配置
   */
  constructor() {
    /** @type {Map<string, Object>} L1 内存缓存 */
    this._cache = new Map()
    /** @type {number} 缓存有效期，30分钟 */
    this._CACHE_TTL = 30 * 60 * 1000
    /** @type {string} L1/L2 统一缓存键名 */
    this._CACHE_KEY = 'user_profile_cache'
  }

  /**
   * 检查双层缓存是否命中
   * 优先检查 L1 内存缓存，未命中则检查 L2 Storage 缓存
   * @param {string} openid - 当前用户的 openid，用于防串号校验
   * @returns {Object|null} 命中时返回缓存的 response 数据，未命中返回 null
   */
  _checkCache(openid) {
    // 步骤1：检查 L1 内存缓存
    const cached = this._cache.get(this._CACHE_KEY)
    if (cached) {
      if (cached.openid === openid && (Date.now() - cached.timestamp) < this._CACHE_TTL) {
        console.log('[ProfileService] L1 内存缓存命中')
        return cached.response
      }
      // openid 不匹配或已过期，删除 L1 缓存
      console.log('[ProfileService] L1 缓存失效，清除')
      this._cache.delete(this._CACHE_KEY)
    }

    // 步骤2：检查 L2 Storage 缓存
    try {
      const stored = wx.getStorageSync(this._CACHE_KEY)
      if (stored) {
        if (stored.openid === openid && (Date.now() - stored.timestamp) < this._CACHE_TTL) {
          console.log('[ProfileService] L2 Storage 缓存命中，回填 L1')
          // 回填 L1 内存缓存
          this._cache.set(this._CACHE_KEY, stored)
          return stored.response
        }
        // openid 不匹配或已过期，清除 L2 缓存
        console.log('[ProfileService] L2 缓存失效，清除')
        wx.removeStorageSync(this._CACHE_KEY)
      }
    } catch (err) {
      console.warn('[ProfileService] 读取 L2 Storage 缓存异常:', err)
    }

    // 未命中
    return null
  }

  /**
   * 将数据同时写入 L1 内存缓存和 L2 Storage 缓存
   * @param {string} openid - 当前用户的 openid
   * @param {Object} response - 需要缓存的云函数返回数据
   */
  _writeCache(openid, response) {
    const cacheObj = {
      openid,
      response,
      timestamp: Date.now()
    }

    // 写入 L1 内存缓存
    this._cache.set(this._CACHE_KEY, cacheObj)
    console.log('[ProfileService] 已写入 L1 内存缓存')

    // 写入 L2 Storage 缓存，失败不阻断流程
    try {
      wx.setStorageSync(this._CACHE_KEY, cacheObj)
      console.log('[ProfileService] 已写入 L2 Storage 缓存')
    } catch (err) {
      console.warn('[ProfileService] 写入 L2 Storage 缓存失败:', err)
    }
  }

  /**
   * 调用 getUserProfile 云函数
   * @returns {Promise<Object>} 云函数返回的 result 字段
   */
  _callCloudFunction() {
    return wx.cloud.callFunction({
      name: 'getUserProfile'
    }).then(res => {
      return res.result
    })
  }

  /**
   * 获取用户画像（主入口方法）
   * 流程：获取 openid → 查双层缓存 → 调用云函数 → 写入缓存 → 返回结果
   * @returns {Promise<Object>} 返回结果
   * - 成功：云函数返回的数据 { success: true, data: {...}, warnings: [...] }
   * - 失败：{ success: false, data: null, warnings: [], error: { code: 'CLOUD_FUNCTION_ERROR', message: '网络异常，请重试' } }
   */
  async getUserProfile() {
    // 步骤1：获取当前用户 openid
    let openid = null
    try {
      const app = getApp()
      openid = (app.globalData && app.globalData.openid) || wx.getStorageSync('openid') || null
    } catch (err) {
      console.warn('[ProfileService] 获取 openid 失败:', err)
    }

    // 步骤2：若有 openid，检查缓存
    if (openid) {
      const cachedResult = this._checkCache(openid)
      if (cachedResult) {
        console.log('[ProfileService] 使用缓存数据返回')
        return cachedResult
      }
    } else {
      console.log('[ProfileService] 未获取到 openid，跳过缓存查询')
    }

    // 步骤3：调用云函数
    try {
      const result = await this._callCloudFunction()

      // 步骤4：若成功且有 openid，写入双层缓存
      if (result && result.success === true && openid) {
        this._writeCache(openid, result)
      }

      // 步骤5：返回结果
      return result
    } catch (err) {
      console.error('[ProfileService] 云函数调用失败:', err)
      // wx.cloud.callFunction 超时时 errCode 为 -1，message 含 'timeout'
      const isTimeout = err && (err.errCode === -1 || /timeout/i.test(err.message || ''))
      return {
        success: false,
        data: null,
        warnings: [],
        error: {
          code: isTimeout ? 'TIMEOUT' : 'CLOUD_FUNCTION_ERROR',
          message: isTimeout ? '请求超时，请重试' : '网络异常，请重试'
        }
      }
    }
  }

  /**
   * 清除双层缓存
   * 用于用户主动刷新或数据变更时的缓存失效
   */
  clearCache() {
    this._cache.delete(this._CACHE_KEY)
    try {
      wx.removeStorageSync(this._CACHE_KEY)
    } catch (err) {
      console.warn('[ProfileService] 清除 L2 Storage 缓存失败:', err)
    }
    console.log('[ProfileService] 双层缓存已清除')
  }
}

// 单例模式导出
const profileService = new ProfileService()
module.exports = profileService
