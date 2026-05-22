const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// ======================== 参数验证函数 ========================

/**
 * 校验并归一化 count 参数（抽题数量）
 * - 不传 → 默认5
 * - 非正整数（含0、负数、浮点数、非数字、Infinity） → 重置为5
 * - 正整数 < 3 → 返回 null（调用方应返回 INVALID_COUNT 错误）
 * - 正整数 >= 3 → 保持原值
 * @param {*} count - 传入的抽题数量参数
 * @returns {number|null} 归一化后的数量，null 表示应报错
 */
function sanitizeCount(count) {
  // 未传参时使用默认值
  if (count === undefined || count === null) {
    return 5
  }
  // 非数字、非有限数、非正整数（含0、负数、浮点数）均重置为默认值
  if (typeof count !== 'number' || !Number.isFinite(count) || !Number.isInteger(count) || count <= 0) {
    return 5
  }
  // 正整数但小于3，返回 null 表示需要报错 INVALID_COUNT
  if (count < 3) {
    return null
  }
  return count
}

/**
 * 校验并归一化 optionsPerQuestion 参数（每题选项数）
 * - 不传 → 默认3
 * - -1 或 null → 返回 -1（表示返回全部选项）
 * - 非正整数（含0、负数、浮点数、非数字，-1除外） → 重置为3
 * - 正整数 < 3 → 重置为3
 * - 正整数 >= 3 → 保持原值
 * @param {*} optionsPerQuestion - 传入的每题选项数参数
 * @returns {number} 归一化后的选项数，-1 表示返回全部
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
  // 非数字、非有限数、非整数均重置为默认值
  if (typeof optionsPerQuestion !== 'number' || !Number.isFinite(optionsPerQuestion) || !Number.isInteger(optionsPerQuestion)) {
    return 3
  }
  // 非正整数（含0和负数）重置为默认值
  if (optionsPerQuestion <= 0) {
    return 3
  }
  // 正整数但小于3，重置为3
  if (optionsPerQuestion < 3) {
    return 3
  }
  return optionsPerQuestion
}

// ======================== 工具函数 ========================

/**
 * 云数据库分页查询工具，每批最多100条
 * 显式 orderBy('_id', 'asc') 保证分页一致性
 * @param {object} db - 云数据库实例
 * @param {string} collection - 集合名称
 * @param {object} filter - 查询条件（where 条件对象）
 * @returns {Promise<Array>} 查询到的全部记录
 */
async function fetchAll(db, collection, filter) {
  const PAGE_SIZE = 100
  let allData = []
  let offset = 0

  // 首批查询，失败直接抛出
  const firstBatch = await db.collection(collection)
    .where(filter)
    .orderBy('_id', 'asc')
    .skip(offset)
    .limit(PAGE_SIZE)
    .get()

  allData = allData.concat(firstBatch.data)

  // 如果首批数据不足一页，说明已全部获取
  if (firstBatch.data.length < PAGE_SIZE) {
    return allData
  }

  // 后续批次循环查询
  offset += PAGE_SIZE
  while (true) {
    try {
      const batch = await db.collection(collection)
        .where(filter)
        .orderBy('_id', 'asc')
        .skip(offset)
        .limit(PAGE_SIZE)
        .get()

      allData = allData.concat(batch.data)

      // 当前批次不足一页，说明已全部获取
      if (batch.data.length < PAGE_SIZE) {
        break
      }
      offset += PAGE_SIZE
    } catch (err) {
      // 后续批次失败记录错误但继续，返回已获取的数据
      console.error(`分页查询第 ${offset / PAGE_SIZE + 1} 批次失败:`, err)
      break
    }
  }

  return allData
}

/**
 * Fisher-Yates 部分洗牌算法，从数组中随机抽取指定数量的元素
 * @param {Array} array - 原始数组
 * @param {number} count - 需要抽取的数量
 * @returns {Array} 随机抽取的元素数组
 */
function shufflePick(array, count) {
  const copy = [...array]
  // 入参防御：防止负数导致异常
  const pickCount = Math.min(Math.max(0, count), copy.length)

  if (pickCount === 0) {
    return []
  }

  // Fisher-Yates 部分洗牌：从末尾开始交换，只洗 pickCount 个位置
  // 循环条件修复 off-by-one：i >= copy.length - pickCount
  for (let i = copy.length - 1; i >= copy.length - pickCount; i--) {
    // 生成 [0, i] 范围内的随机索引
    const j = Math.floor(Math.random() * (i + 1))
    // 交换当前位置与随机位置的元素
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }

  // 返回末尾 pickCount 个已洗牌的元素
  return copy.slice(copy.length - pickCount)
}

/**
 * 生成选项编号
 * - index < 26: 返回 A-Z 单字母
 * - index >= 26: 返回 AA, AB, AC... 双字母编号
 * @param {number} index - 选项索引（从0开始）
 * @returns {string} 选项编号
 */
function generateOptionId(index) {
  if (index < 26) {
    // 单字母编号：A-Z
    return String.fromCharCode(65 + index)
  }
  // 双字母编号：AA, AB, AC...
  const firstLetter = String.fromCharCode(65 + Math.floor((index - 26) / 26))
  const secondLetter = String.fromCharCode(65 + ((index - 26) % 26))
  return firstLetter + secondLetter
}

/**
 * 从题目选项中随机抽取指定数量的选项
 * - optionsPerQuestion 为 -1 或 null 时返回全部选项
 * - 否则抽取 min(requested, options.length) 个
 * - 抽取后按原始 id 升序排列，然后重新编号为 A, B, C...
 * - 检测 option_shortage 并返回 warning
 * @param {Array} options - 题目的全部选项
 * @param {number} optionsPerQuestion - 需要的选项数，-1 表示全部
 * @returns {{ options: Array, warning: string|null }} 抽取后的选项及可能的警告
 */
function pickRandomOptions(options, optionsPerQuestion) {
  // -1 或 null 表示返回全部选项
  if (optionsPerQuestion === -1 || optionsPerQuestion === null) {
    // 全部返回时也重新编号
    const allOptions = options.map((opt, idx) => ({
      ...opt,
      id: generateOptionId(idx)
    }))
    return { options: allOptions, warning: null }
  }

  let warning = null
  // 实际可抽取的数量取请求数和可用数的较小值
  const actualPick = Math.min(optionsPerQuestion, options.length)

  // 检测选项不足的情况
  if (options.length < optionsPerQuestion) {
    warning = `选项不足：请求 ${optionsPerQuestion} 个，实际只有 ${options.length} 个`
  }

  // 随机抽取选项
  const picked = shufflePick(options, actualPick)

  // 按原始 id 升序排列，保持选项顺序一致性
  picked.sort((a, b) => {
    if (a.id < b.id) return -1
    if (a.id > b.id) return 1
    return 0
  })

  // 重新编号为 A, B, C...
  const renumbered = picked.map((opt, idx) => ({
    ...opt,
    id: generateOptionId(idx)
  }))

  return { options: renumbered, warning }
}

// ======================== 主函数 ========================

/**
 * 题库两层随机抽取主函数
 * 1. 参数验证与归一化
 * 2. 查询有效题目并过滤
 * 3. 第一层随机：抽取题目
 * 4. 第二层随机：每题抽取选项
 * 5. 返回标准结构
 *
 * 错误码说明：
 * - INVALID_COUNT: count 为正整数但小于3时触发
 * - INVALID_CATEGORY: category 类型不是 string 也不是 null/undefined 时触发
 * - EMPTY_BANK: 没有可用题目时触发
 * - EXCLUDED_EMPTY: 排除 excludeCategories 后题库无可用题目时触发
 * - CLOUD_FUNCTION_ERROR: 未捕获的异常时触发（在入口处处理）
 *
 * @param {object} event - 云函数调用参数
 * @param {number} [event.count=5] - 抽题数量
 * @param {number} [event.optionsPerQuestion=3] - 每题选项数，-1 表示全部
 * @param {string|null} [event.category] - 题目分类筛选
 * @param {string[]} [event.excludeCategories] - 需排除的侧重点列表（续写去重用）
 * @returns {Promise<object>} 标准返回结构
 */
async function getQuestions(event) {
  const warnings = []

  // ---- 1. 参数验证与归一化 ----
  const count = sanitizeCount(event.count)
  // count 为 null 表示正整数但小于3，需要报错
  if (count === null) {
    return {
      success: false,
      data: null,
      warnings: [],
      error: { code: 'INVALID_COUNT', message: 'count必须为大于等于3的正整数' }
    }
  }

  const optionsPerQuestion = sanitizeOptions(event.optionsPerQuestion)

  // ---- 2. category 类型验证 ----
  let category = event.category

  // category 只接受 string 或 null/undefined
  if (category !== undefined && category !== null && typeof category !== 'string') {
    return {
      success: false,
      data: null,
      warnings: [],
      error: { code: 'INVALID_CATEGORY', message: 'category 必须为字符串或 null' }
    }
  }

  // 空字符串（含纯空白）视为 null（不筛选分类）
  if (category === undefined || (typeof category === 'string' && category.trim() === '')) {
    category = null
  }

  // ---- excludeCategories 参数验证（续写去重） ----
  let excludeCategories = event.excludeCategories
  // 只接受数组，非数组视为无排除
  if (excludeCategories !== undefined && excludeCategories !== null) {
    if (!Array.isArray(excludeCategories)) {
      excludeCategories = []
    } else {
      // 过滤掉非字符串元素，去重
      excludeCategories = [...new Set(
        excludeCategories.filter(c => typeof c === 'string' && c.trim() !== '')
      )]
    }
  } else {
    excludeCategories = []
  }

  // ---- 3. 构建查询条件并获取题目 ----
  const filter = { isActive: true }
  if (category !== null) {
    filter.category = category
  }

  const allQuestions = await fetchAll(db, 'questions', filter)

  // 二次过滤：确保每题至少有3个选项
  const validQuestions = allQuestions.filter(q =>
    Array.isArray(q.options) && q.options.length >= 3
  )

  // ---- 4. 题库为空检查 ----
  if (validQuestions.length === 0) {
    return {
      success: false,
      data: null,
      warnings: [],
      error: { code: 'EMPTY_BANK', message: '题库为空或没有符合条件的题目' }
    }
  }

  // ---- 5. 按 excludeCategories 过滤（跨轮续写去重） ----
  let availableQuestions = validQuestions
  if (excludeCategories.length > 0) {
    const excludedSet = new Set(excludeCategories)
    availableQuestions = validQuestions.filter(q => !excludedSet.has(q.category))
    // 排除后题库为空
    if (availableQuestions.length === 0) {
      return {
        success: false,
        data: null,
        warnings: [],
        error: { code: 'EXCLUDED_EMPTY', message: '排除已答分类后，题库无可用题目' }
      }
    }
  }

  // ---- 6. 侧重点去重：按 category 分组，每组随机取一题 ----
  // 保证同一批次内抽取的题目 category 均不相同
  function pickDistinctCategories(questions) {
    const grouped = {}
    for (const q of questions) {
      const cat = q.category || '__uncategorized__'
      if (!grouped[cat]) grouped[cat] = []
      grouped[cat].push(q)
    }
    return Object.values(grouped).map(group => shufflePick(group, 1)[0])
  }

  const distinctQuestions = pickDistinctCategories(availableQuestions)

  // ---- 7. 动态边界计算 ----
  const actualCount = Math.min(count, distinctQuestions.length)

  // 收集题目不足警告
  if (distinctQuestions.length < count) {
    warnings.push({
      type: 'insufficient_questions',
      message: `请求 ${count} 题，去除已答分类后仅有 ${distinctQuestions.length} 个不同侧重点，已全部返回`
    })
  }

  // ---- 8. 第一层随机：从侧重点去重后的列表中抽取题目 ----
  const pickedQuestions = shufflePick(distinctQuestions, actualCount)

  // ---- 9. 第二层随机：每题抽取选项 ----
  const resultQuestions = pickedQuestions.map(q => {
    const { options, warning } = pickRandomOptions(q.options, optionsPerQuestion)

    // 收集选项不足警告
    if (warning) {
      warnings.push({
        type: 'option_shortage',
        questionId: q._id,
        message: warning
      })
    }

    return {
      _id: q._id,
      question: q.question,
      category: q.category || null,
      options
    }
  })

  // ---- 10. 构建并返回标准结构 ----
  return {
    success: true,
    data: {
      questions: resultQuestions,
      meta: {
        total: validQuestions.length,
        requested: count,
        actual: actualCount,
        // -1 时标记为 'all'
        requestedOptionsPerQuestion: optionsPerQuestion === -1 ? 'all' : optionsPerQuestion,
        category: category,
        excludedCategoriesCount: excludeCategories.length,
        source: 'cloud'
      }
    },
    warnings,
    error: null
  }
}

// ======================== 云函数入口 ========================

exports.main = async (event, context) => {
  try {
    return await getQuestions(event)
  } catch (e) {
    console.error('云函数执行异常:', e)
    return {
      success: false,
      data: null,
      warnings: [],
      error: { code: 'CLOUD_FUNCTION_ERROR', message: '服务异常，请稍后重试' }
    }
  }
}
