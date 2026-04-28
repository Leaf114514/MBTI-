/**
 * @file story-service.js
 * @description MBTI 故事生成服务层，负责题目抽取编排、云函数调用与结果缓存
 */

const questionService = require('./question-service')

/**
 * MBTI 故事生成服务类
 * 提供首轮生成、续写、会话查询、缓存管理等功能
 * 内部编排 question-service 进行题目抽取
 */
class StoryService {
  /**
   * 构造函数，初始化缓存容器和过期时间
   */
  constructor() {
    /** @type {Map<string, {data: Object, timestamp: number}>} 缓存容器 */
    this._cache = new Map()
    /** @type {number} 缓存有效期，30分钟 */
    this._CACHE_TTL = 30 * 60 * 1000
  }

  /**
   * 根据缓存键获取缓存键名
   * @param {String} sessionId - 会话 ID
   * @returns {String} 缓存键
   */
  _getCacheKey(sessionId) {
    return `story_session_${sessionId}`
  }

  /**
   * 将结果存入缓存
   * @param {String} sessionId - 会话 ID
   * @param {Object} result - 需要缓存的结果
   */
  _cacheResult(sessionId, result) {
    const key = this._getCacheKey(sessionId)
    this._cache.set(key, { data: result, timestamp: Date.now() })
  }

  /**
   * 从缓存中获取结果，过期自动清除
   * @param {String} sessionId - 会话 ID
   * @returns {Object|null} 缓存的结果，过期或未命中返回 null
   */
  _getCachedResult(sessionId) {
    const key = this._getCacheKey(sessionId)
    const cached = this._cache.get(key)
    if (!cached) return null
    // 检查是否超过 TTL 过期时间
    if (Date.now() - cached.timestamp > this._CACHE_TTL) {
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
   * 重置会话，清空侧重点追踪
   * 内部调用 questionService.resetSession() 清空已见侧重点
   * 在开始新一轮完整故事前调用
   */
  resetSession() {
    questionService.resetSession()
  }

  /**
   * 封装微信云函数调用
   * @param {String} name - 云函数名称
   * @param {Object} data - 传递给云函数的参数
   * @returns {Promise<Object>} 云函数返回的 result 字段
   * @throws {Error} 云函数调用失败时抛出错误
   */
  _callCloudFunction(name, data) {
    return wx.cloud.callFunction({ name, data }).then(res => res.result)
  }

  /**
   * 从 getQuestions 返回结果中提取 answers 数组
   * @param {Object} questionResult - questionService.getRandomQuestions() 的返回结果
   * @returns {Array} 格式化后的 answers 数组
   */
  _extractAnswers(questionResult) {
    if (!questionResult.success || !questionResult.data || !questionResult.data.questions) {
      return null
    }
    return questionResult.data.questions.map(q => ({
      question: q.text,
      options: q.options.map(o => ({ id: o.id, text: o.text })),
      selected: null // 前端答题后填充
    }))
  }

  /**
   * 首轮生成故事（主入口）
   *
   * 流程：
   * 1. 通过 question-service 抽取 5 道题
   * 2. 前端需要让用户答题（此处仅返回题目，等待用户作答后再调用 submitFirstRound）
   *
   * @param {Object} params - 参数
   * @param {String} params.mbti - 用户 MBTI 类型
   * @param {String} params.gender - 用户性别
   * @returns {Promise<Object>} 包含题目列表的结果，或错误
   */
  async generateStory(params) {
    const { mbti, gender } = params || {}

    // 参数校验
    if (!mbti || !gender) {
      return { success: false, error: { code: 'MISSING_PARAMS', message: '缺少 mbti 或 gender 参数' } }
    }

    // 通过 question-service 抽取 5 道题
    try {
      const questionResult = await questionService.getRandomQuestions({ count: 5 })

      if (!questionResult.success) {
        // 题目抽取失败，返回错误
        return {
          success: false,
          error: {
            code: questionResult.error && questionResult.error.code === 'EXCLUDED_EMPTY'
              ? 'EXCLUDED_EMPTY'
              : 'QUESTION_FETCH_ERROR',
            message: (questionResult.error && questionResult.error.message) || '题目加载失败'
          }
        }
      }

      // 返回题目供前端展示答题界面
      return {
        success: true,
        data: {
          questions: questionResult.data.questions,
          mbti,
          gender
        },
        warnings: questionResult.warnings || [],
        error: null
      }
    } catch (err) {
      console.error('[StoryService] 题目抽取失败:', err)
      return {
        success: false,
        error: { code: 'QUESTION_FETCH_ERROR', message: '题目加载失败，请重试' }
      }
    }
  }

  /**
   * 提交首轮答案并生成故事
   * - 用户答完 5 道题后调用
   * - 将用户答案传给云函数生成故事
   * @param {Object} params - 参数
   * @param {String} params.mbti - 用户 MBTI 类型
   * @param {String} params.gender - 用户性别
   * @param {Array} params.answers - 用户作答后的答案数组（含 selected 字段）
   * @returns {Promise<Object>} 云函数返回的故事结果
   */
  async submitFirstRound(params) {
    const { mbti, gender, answers } = params || {}

    if (!mbti || !gender || !answers) {
      return { success: false, error: { code: 'MISSING_PARAMS', message: '缺少必要参数' } }
    }

    try {
      const result = await this._callCloudFunction('generateStory', {
        action: 'generate',
        mbti,
        gender,
        answers
      })

      // 成功则缓存结果
      if (result.success && result.data && result.data.sessionId) {
        this._cacheResult(result.data.sessionId, result)
      }

      return result
    } catch (err) {
      console.error('[StoryService] 云函数调用失败（首轮）:', err)
      return {
        success: false,
        error: { code: 'CLOUD_FUNCTION_ERROR', message: '网络异常，请重试' }
      }
    }
  }

  /**
   * 续写故事（主入口）
   *
   * 流程：
   * 1. 通过 question-service 抽取 2 道题（自动排除已见侧重点）
   * 2. 返回题目供前端展示
   *
   * @param {Object} params - 参数
   * @param {String} params.sessionId - 会话 ID
   * @returns {Promise<Object>} 包含题目列表的结果，或错误
   */
  async continueStory(params) {
    const { sessionId } = params || {}

    if (!sessionId) {
      return { success: false, error: { code: 'MISSING_SESSION_ID', message: '缺少会话标识' } }
    }

    // 通过 question-service 抽取 2 道题（侧重点去重自动生效）
    try {
      const questionResult = await questionService.getRandomQuestions({ count: 2 })

      if (!questionResult.success) {
        return {
          success: false,
          error: {
            code: questionResult.error && questionResult.error.code === 'EXCLUDED_EMPTY'
              ? 'EXCLUDED_EMPTY'
              : 'QUESTION_FETCH_ERROR',
            message: (questionResult.error && questionResult.error.message) || '题目加载失败'
          }
        }
      }

      return {
        success: true,
        data: {
          questions: questionResult.data.questions,
          sessionId
        },
        warnings: questionResult.warnings || [],
        error: null
      }
    } catch (err) {
      console.error('[StoryService] 题目抽取失败（续写）:', err)
      return {
        success: false,
        error: { code: 'QUESTION_FETCH_ERROR', message: '题目加载失败，请重试' }
      }
    }
  }

  /**
   * 提交续写答案并生成下一页
   * - 用户答完 2 道题后调用
   * - 将用户答案传给云函数续写故事
   * @param {Object} params - 参数
   * @param {String} params.sessionId - 会话 ID
   * @param {Array} params.answers - 用户作答后的答案数组（含 selected 字段）
   * @returns {Promise<Object>} 云函数返回的续写结果
   */
  async submitContinueRound(params) {
    const { sessionId, answers } = params || {}

    if (!sessionId || !answers) {
      return { success: false, error: { code: 'MISSING_PARAMS', message: '缺少必要参数' } }
    }

    try {
      const result = await this._callCloudFunction('generateStory', {
        action: 'generate',
        sessionId,
        answers
      })

      // 成功则更新缓存
      if (result.success && result.data && result.data.sessionId) {
        this._cacheResult(result.data.sessionId, result)
      }

      return result
    } catch (err) {
      console.error('[StoryService] 云函数调用失败（续写）:', err)
      return {
        success: false,
        error: { code: 'CLOUD_FUNCTION_ERROR', message: '网络异常，请重试' }
      }
    }
  }

  /**
   * 获取会话详情（含所有轮次）
   * - 优先从缓存获取，缓存未命中则调云函数
   * @param {String} sessionId - 会话 ID
   * @returns {Promise<Object>} 会话详情
   */
  async getSession(sessionId) {
    if (!sessionId) {
      return { success: false, error: { code: 'MISSING_SESSION_ID', message: '缺少会话标识' } }
    }

    // 先查缓存
    const cached = this._getCachedResult(sessionId)
    if (cached) return cached

    // 缓存未命中，从云数据库读取
    try {
      const db = wx.cloud.database()
      const queryResult = await db.collection('story_sessions').doc(sessionId).get()
      return {
        success: true,
        data: queryResult.data,
        warnings: [],
        error: null
      }
    } catch (err) {
      console.error('[StoryService] 读取会话失败:', err)
      return {
        success: false,
        error: { code: 'SESSION_NOT_FOUND', message: '会话不存在' }
      }
    }
  }
}

// 单例模式导出
const storyService = new StoryService()
module.exports = storyService
