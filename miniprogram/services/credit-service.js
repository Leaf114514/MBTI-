/**
 * credit-service.js
 * 积分服务层，封装 manageCredit 云函数调用，内存缓存
 */

class CreditService {
  constructor() {
    this._cache = new Map()
    this._CACHE_TTL = 5 * 60 * 1000
    this._CACHE_KEY = 'user_credit'
  }

  _checkCache(openid) {
    const cached = this._cache.get(this._CACHE_KEY)
    if (cached && cached.openid === openid && (Date.now() - cached.timestamp) < this._CACHE_TTL) {
      return cached.credit
    }
    this._cache.delete(this._CACHE_KEY)
    return null
  }

  _writeCache(openid, credit) {
    this._cache.set(this._CACHE_KEY, { openid, credit, timestamp: Date.now() })
  }

  clearCache() {
    this._cache.delete(this._CACHE_KEY)
  }

  async _call(action, data = {}) {
    return wx.cloud.callFunction({
      name: 'manageCredit',
      data: { action, ...data }
    }).then(res => res.result)
  }

  async getCredit() {
    let openid = null
    try {
      const app = getApp()
      openid = (app.globalData && app.globalData.openid) || wx.getStorageSync('openid') || null
    } catch (e) {
      console.warn('[CreditService] 获取 openid 失败:', e)
    }

    if (openid) {
      const cached = this._checkCache(openid)
      if (cached !== null) {
        return { success: true, data: { credit: cached }, warnings: [], error: null }
      }
    }

    try {
      const result = await this._call('get')
      if (result && result.success && openid) {
        this._writeCache(openid, result.data.credit)
      }
      return result
    } catch (e) {
      console.error('[CreditService] 云函数调用失败:', e)
      return {
        success: false,
        data: null,
        warnings: [],
        error: { code: 'CLOUD_FUNCTION_ERROR', message: '网络异常，请重试' }
      }
    }
  }

  async consumeCredit(amount) {
    try {
      const result = await this._call('consume', { amount })
      if (result && result.success) {
        let openid = null
        try {
          const app = getApp()
          openid = (app.globalData && app.globalData.openid) || wx.getStorageSync('openid') || null
        } catch (e) { /* ignore */ }
        if (openid) {
          this._writeCache(openid, result.data.credit)
        }
      } else {
        this.clearCache()
      }
      return result
    } catch (e) {
      this.clearCache()
      console.error('[CreditService] 消费积分失败:', e)
      return {
        success: false,
        data: null,
        warnings: [],
        error: { code: 'CLOUD_FUNCTION_ERROR', message: '网络异常，请重试' }
      }
    }
  }

  async earnCredit(source) {
    try {
      const result = await this._call('earn', { source })
      if (result && result.success) {
        let openid = null
        try {
          const app = getApp()
          openid = (app.globalData && app.globalData.openid) || wx.getStorageSync('openid') || null
        } catch (e) { /* ignore */ }
        if (openid) {
          this._writeCache(openid, result.data.credit)
        }
      } else {
        this.clearCache()
      }
      return result
    } catch (e) {
      this.clearCache()
      console.error('[CreditService] 获取积分失败:', e)
      return {
        success: false,
        data: null,
        warnings: [],
        error: { code: 'CLOUD_FUNCTION_ERROR', message: '网络异常，请重试' }
      }
    }
  }
}

const creditService = new CreditService()
module.exports = creditService
