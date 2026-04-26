/**
 * @file question-service.js
 * @description MBTI题目服务层，负责随机题目的获取、参数校验与缓存管理
 */

/**
 * 校验并修正 count 参数
 * @param {*} count - 题目数量参数
 * @returns {number|null} 修正后的数值；null 表示应报错 INVALID_COUNT
 * - 不传/undefined → 默认5
 * - 非正整数（含0、负数、浮点数、非数字、Infinity） → 重置为5
 * - 正整数 < 3 → 返回 null（触发 INVALID_COUNT 错误码）
 * - 正整数 >= 3 → 保持原值
 */
function sanitizeCount(count) {
  // 未传参时使用默认值
  if (count === undefined || count === null) {
    return 5
  }

  // 判断是否为正整数（排除 Infinity、NaN、浮点数、非数字类型）
  if (typeof count !== 'number' || !Number.isFinite(count) || !Number.isInteger(count) || count <= 0) {
    return 5
  }

  // 正整数但小于3，按决策规范应报错而非重置
  if (count < 3) {
    return null
  }

  return count
}

/**
 * 校验并修正 optionsPerQuestion 参数
 * @param {*} optionsPerQuestion - 每题选项数参数
 * @returns {number} 修正后的数值
 * - 不传/undefined → 默认3
 * - -1 或 null → 返回 -1（表示返回全部选项）
 * - 非正整数（含0、负数、浮点数、非数字，-1除外） → 重置为3
 * - 正整数 < 3 → 重置为3
 * - 正整数 >= 3 → 保持原值
 */
function sanitizeOptions(optionsPerQuestion) {
  // 未传参时使用默认值
  if (optionsPerQuestion === undefined) {
    return 3
  }

  // null 或 -1 表示返回全部选项
  if (optionsPerQuestion === null || optionsPerQuestion === -1) {
    return -1
  }

  // 判断是否为正整数（排除非数字、Infinity、浮点数等）
  if (typeof optionsPerQuestion !== 'number' || !Number.isFinite(optionsPerQuestion) || !Number.isInteger(optionsPerQuestion) || optionsPerQuestion <= 0) {
    return 3
  }

  // 正整数但小于3，重置为最低值3
  if (optionsPerQuestion < 3) {
    return 3
  }

  return optionsPerQuestion
}

/**
 * MBTI题目服务类
 * 提供随机题目获取、参数校验、缓存管理等功能
 */
class QuestionService {
  /**
   * 构造函数，初始化缓存容器和缓存过期时间
   */
  constructor() {
    /** @type {Map<string, {data: Object, timestamp: number}>} 缓存容器 */
    this._cache = new Map()
    /** @type {number} 缓存有效期，5分钟 */
    this._CACHE_TTL = 5 * 60 * 1000
  }

  /**
   * 统一参数验证入口
   * @param {Object} [params={}] - 请求参数
   * @param {number} [params.count] - 题目数量
   * @param {number} [params.optionsPerQuestion] - 每题选项数
   * @param {string|null} [params.category] - 题目分类
   * @returns {Object} 验证结果
   * - 验证失败：{ error: { code: 'INVALID_COUNT', message: '...' } }
   * - 验证通过：{ count, optionsPerQuestion, category }
   */
  _sanitizeParams(params = {}) {
    // 校验 count 参数
    const count = sanitizeCount(params.count)
    // count 为 null 说明正整数小于3，应报错
    if (count === null) {
      return {
        error: {
          code: 'INVALID_COUNT',
          message: 'count必须为大于等于3的正整数'
        }
      }
    }

    // 校验每题选项数
    const optionsPerQuestion = sanitizeOptions(params.optionsPerQuestion)

    // 校验 category：只接受 string 或 null，其他类型忽略
    let category = null
    if (typeof params.category === 'string') {
      // 空字符串视为 null
      category = params.category.trim() === '' ? null : params.category
    } else if (params.category === null || params.category === undefined) {
      category = null
    }
    // 其他类型（number、boolean、object等）直接忽略，保持 null

    return { count, optionsPerQuestion, category }
  }

  /**
   * 根据参数组合生成缓存键
   * @param {Object} params - 已校验的参数
   * @param {number} params.count - 题目数量
   * @param {number} params.optionsPerQuestion - 每题选项数
   * @param {string|null} params.category - 题目分类
   * @returns {string} 缓存键，格式：count_optionsPerQuestion_category
   */
  _getCacheKey(params) {
    const { count, optionsPerQuestion, category } = params
    return `${count}_${optionsPerQuestion}_${category || 'all'}`
  }

  /**
   * 将结果存入缓存
   * @param {Object} params - 已校验的参数
   * @param {Object} result - 需要缓存的结果
   */
  _cacheResult(params, result) {
    const key = this._getCacheKey(params)
    this._cache.set(key, {
      data: result,
      timestamp: Date.now()
    })
  }

  /**
   * 从缓存中获取结果，过期自动清除
   * @param {Object} params - 已校验的参数
   * @returns {Object|null} 缓存的结果，过期或未命中返回 null
   */
  _getCachedResult(params) {
    const key = this._getCacheKey(params)
    const cached = this._cache.get(key)

    if (!cached) {
      return null
    }

    // 检查是否超过 TTL 过期时间
    const isExpired = Date.now() - cached.timestamp > this._CACHE_TTL
    if (isExpired) {
      // 过期自动清除该条缓存
      this._cache.delete(key)
      return null
    }

    return cached.data
  }

  /**
   * 清空全部缓存
   */
  clearCache() {
    this._cache.clear()
  }

  /**
   * 封装微信云函数调用
   * @param {string} name - 云函数名称
   * @param {Object} data - 传递给云函数的参数
   * @returns {Promise<Object>} 云函数返回的 result 字段
   * @throws {Error} 云函数调用失败时抛出错误
   */
  _callCloudFunction(name, data) {
    return wx.cloud.callFunction({
      name,
      data
    }).then(res => {
      // 返回云函数响应中的 result 字段
      return res.result
    })
  }

  /**
   * 获取随机MBTI题目（主入口方法）
   * 流程：参数验证 → 查缓存 → 调用云函数 → 缓存成功结果 → 返回
   * @param {Object} [params={}] - 请求参数
   * @param {number} [params.count] - 题目数量，默认5，最小3
   * @param {number} [params.optionsPerQuestion] - 每题选项数，默认3，-1表示全部
   * @param {string|null} [params.category] - 题目分类，null表示全部分类
   * @returns {Promise<Object>} 返回结果
   * - 成功：云函数返回的数据
   * - 参数错误：{ success: false, error: { code: 'INVALID_COUNT', message: '...' } }
   * - 网络/云函数错误：{ success: false, error: { code: 'CLOUD_FUNCTION_ERROR', message: '网络异常，请重试' } }
   */
  async getRandomQuestions(params = {}) {
    // 第一步：参数验证
    const sanitized = this._sanitizeParams(params)

    // 参数验证失败（如 count < 3），提前返回错误
    if (sanitized.error) {
      return { success: false, error: sanitized.error }
    }

    // 第二步：查询缓存
    const cachedResult = this._getCachedResult(sanitized)
    if (cachedResult) {
      return cachedResult
    }

    // 第三步：调用云函数获取题目
    try {
      const result = await this._callCloudFunction('getQuestions', {
        count: sanitized.count,
        optionsPerQuestion: sanitized.optionsPerQuestion,
        category: sanitized.category
      })

      // 第四步：只缓存成功结果，不缓存错误
      if (result && result.success) {
        this._cacheResult(sanitized, result)
      }

      return result
    } catch (err) {
      // 云函数调用失败或超时，返回统一错误格式
      console.error('[QuestionService] 云函数调用失败:', err)
      return {
        success: false,
        error: {
          code: 'CLOUD_FUNCTION_ERROR',
          message: '网络异常，请重试'
        }
      }
    }
  }
}

// 单例模式导出
const questionService = new QuestionService()
module.exports = questionService
