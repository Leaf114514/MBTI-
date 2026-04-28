const cloud = require('wx-server-sdk')
const got = require('got')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// ======================== 常量定义 ========================

/** MBTI 合法值白名单 */
const VALID_MBTI = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP'
]

/** 合法性别值 */
const VALID_GENDER = ['男', '女']

/** 最大轮次 */
const MAX_ROUNDS = 4

/** DeepSeek API 配置 */
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions'
const DEEPSEEK_MODEL = 'deepseek-chat'
const DEEPSEEK_TEMPERATURE = 0.7
const DEEPSEEK_MAX_TOKENS = 2048

/** 内容截断阈值（去空白后字数） */
const CONTENT_SOFT_LIMIT = 2000
const CONTENT_HARD_LIMIT = 3000

// ======================== System Prompt 模板 ========================

/** 首轮和续写共用的 system prompt */
const SYSTEM_PROMPT = `你是一个擅长根据性格参数创作故事的AI写作助手。

用户会提供以下信息作为主角的"性格参数"：
- MBTI 类型（如 INTJ、INFP 等）
- 性别（男/女）
- 场景选择题的答案（每题包含题目内容、3个选项和用户所选项）

请严格按照以下规则生成故事：
时间跨度：故事不限制于一天或一段短暂经历，可以延续多年（如一周、一个月、一年甚至更长）。故事必须完整，并有明确的侧重性（例如聚焦于主角某个人生阶段的核心冲突、性格演变或一个贯穿性的主题）。每一次生成都带有标题，并用书名号括起来。

连贯性：生成连贯的、不分事件小节的故事。禁止使用"事件一/二/三"等小标题。故事中会发生若干随机事件，主角面对每个事件时的选择由AI根据性格参数自动推理，用户中途不做选择。

推理注释：在主角每个重要决策后，用 【】 将推理过程括起来。推理内容视为故事之外的解释，不直接出现在叙述中。推理命名避免"场景1"等术语，采用笼统概括或MBTI相关概括。

风格要求：故事正文自然流畅，禁止刻意总结或提及用户回答的选项内容。性格特征通过行为自然体现。

排版：每段首行空两格，分段后不空行，但一节故事结束后空一行。

长度：控制在1500-2000字。

主角：有具体中文名字，性别与用户一致。

内容限制：不含政治敏感、暴力、色情或违法内容。`

// ======================== 参数验证函数 ========================

/**
 * 校验 MBTI 参数
 * - 执行 trim() + toUpperCase() 后校验白名单
 * @param {*} mbti - 传入的 MBTI 值
 * @returns {{ valid: Boolean, value: String|null, error: Object|null }}
 */
function validateMbti(mbti) {
  if (typeof mbti !== 'string') {
    return { valid: false, value: null, error: { code: 'INVALID_MBTI', message: 'MBTI 类型无效：必须为字符串' } }
  }
  const normalized = mbti.trim().toUpperCase()
  if (!VALID_MBTI.includes(normalized)) {
    return { valid: false, value: null, error: { code: 'INVALID_MBTI', message: `MBTI 类型无效："${mbti}" 不在合法值中` } }
  }
  return { valid: true, value: normalized, error: null }
}

/**
 * 校验 gender 参数
 * - 执行 trim() 后校验 "男"/"女"
 * @param {*} gender - 传入的性别值
 * @returns {{ valid: Boolean, value: String|null, error: Object|null }}
 */
function validateGender(gender) {
  if (typeof gender !== 'string') {
    return { valid: false, value: null, error: { code: 'INVALID_GENDER', message: '性别值无效：必须为字符串' } }
  }
  const trimmed = gender.trim()
  if (!VALID_GENDER.includes(trimmed)) {
    return { valid: false, value: null, error: { code: 'INVALID_GENDER', message: `性别值无效："${gender}"，必须为"男"或"女"` } }
  }
  return { valid: true, value: trimmed, error: null }
}

/**
 * 校验 answers 数组
 * - 验证数组类型、长度、每项结构完整性
 * @param {*} answers - 传入的答案数组
 * @param {Number} expectedLength - 期望长度（首轮5，续写2）
 * @returns {{ valid: Boolean, value: Array|null, error: Object|null }}
 */
function validateAnswers(answers, expectedLength) {
  if (!Array.isArray(answers)) {
    return { valid: false, value: null, error: { code: 'INVALID_ANSWERS', message: '答案必须为数组' } }
  }
  if (answers.length !== expectedLength) {
    return { valid: false, value: null, error: { code: 'INVALID_ANSWERS', message: expectedLength === 5 ? '首轮需要5道题的答案' : '续写需要2道题的答案' } }
  }
  // 逐项校验结构
  for (let i = 0; i < answers.length; i++) {
    const a = answers[i]
    if (!a || typeof a !== 'object') {
      return { valid: false, value: null, error: { code: 'INVALID_ANSWERS', message: `第${i + 1}题答案格式错误` } }
    }
    if (typeof a.question !== 'string' || a.question.trim() === '') {
      return { valid: false, value: null, error: { code: 'INVALID_ANSWERS', message: `第${i + 1}题缺少题目文本` } }
    }
    if (!Array.isArray(a.options) || a.options.length < 1) {
      return { valid: false, value: null, error: { code: 'INVALID_ANSWERS', message: `第${i + 1}题选项格式错误` } }
    }
    if (typeof a.selected !== 'string' || a.selected.trim() === '') {
      return { valid: false, value: null, error: { code: 'INVALID_ANSWERS', message: `第${i + 1}题缺少用户选择` } }
    }
    // 校验 selected 在 options 的 id 中存在
    const optionIds = a.options.map(o => o.id)
    if (!optionIds.includes(a.selected)) {
      return { valid: false, value: null, error: { code: 'INVALID_ANSWERS', message: `第${i + 1}题的用户选择 "${a.selected}" 不在选项中` } }
    }
  }
  return { valid: true, value: answers, error: null }
}

// ======================== 工具函数 ========================

/**
 * 将题目答案格式化为 prompt 文本
 * @param {Array} answers - 题目答案数组
 * @param {Number} startIndex - 起始编号（首轮为1，续写为已答总题数+1）
 * @returns {String} 格式化后的文本
 */
function formatAnswers(answers, startIndex = 1) {
  return answers.map((a, i) => {
    const optionsText = a.options.map(o => `${o.id}. ${o.text}`).join(' / ')
    return `题目${startIndex + i}：${a.question}\n选项：${optionsText}\n用户选择：${a.selected}`
  }).join('\n\n')
}

/**
 * 计算续写时的 startIndex
 * - 首轮 5 题，续写每次 2 题
 * - 计算：已有题目总数 + 1
 * @param {Number} currentRound - 当前已完成轮次
 * @returns {Number} 续写题目的起始编号
 */
function calcStartIndex(currentRound) {
  // 第 1 轮完成后 currentRound=1，总题数=5，续写 startIndex=6
  // 第 2 轮完成后 currentRound=2，总题数=5+2=7，续写 startIndex=8
  // 第 3 轮完成后 currentRound=3，总题数=5+4=9，续写 startIndex=10
  const totalAnswered = 5 + (currentRound - 1) * 2
  return totalAnswered + 1
}

/**
 * 从 AI 返回内容中提取故事标题
 * 匹配第一个 《...》 包裹的文本
 * @param {String} content - AI 返回的完整内容
 * @returns {String} 提取的标题（含书名号），未匹配返回 "《无题》"
 */
function extractTitle(content) {
  const match = content.match(/《([^》]+)》/)
  return match ? `《${match[1]}》` : '《无题》'
}

/**
 * 内容安全过滤（敏感词黑名单）
 * @param {String} content - 待检测内容
 * @returns {{ safe: Boolean, content: String }} 安全检测结果
 */
function contentSafetyCheck(content) {
  // 敏感词黑名单（按需扩展，TODO: 接入微信内容安全 API）
  const BLACKLIST = []
  for (const word of BLACKLIST) {
    if (content.includes(word)) {
      return { safe: false, content }
    }
  }
  return { safe: true, content }
}

/**
 * 统计中文字数并截断超长内容
 * - 去除空白字符后计算长度
 * - 超过硬上限（3000字）时截断至软上限（2000字）
 * @param {String} content - 待处理内容
 * @returns {{ content: String, wordCount: Number, truncated: Boolean }}
 */
function truncateContent(content) {
  // 去空白统计字数
  const wordCount = content.replace(/\s/g, '').length
  if (wordCount <= CONTENT_HARD_LIMIT) {
    return { content, wordCount, truncated: false }
  }
  // 超过硬上限，截断至软上限
  const truncated = content.substring(0, CONTENT_SOFT_LIMIT)
  const actualWordCount = truncated.replace(/\s/g, '').length
  return { content: truncated, wordCount: actualWordCount, truncated: true }
}

/**
 * 构造标准错误返回
 * @param {String} code - 错误码
 * @param {String} message - 错误消息
 * @returns {Object} 标准错误响应
 */
function makeError(code, message) {
  return { success: false, data: null, warnings: [], error: { code, message } }
}

/**
 * 构造标准成功返回
 * @param {Object} data - 返回数据
 * @param {Array} warnings - 警告数组
 * @returns {Object} 标准成功响应
 */
function makeSuccess(data, warnings = []) {
  return { success: true, data, warnings, error: null }
}

// ======================== DeepSeek API 调用 ========================

/**
 * 调用 DeepSeek API 生成故事内容
 * - 使用 got 库发送 POST 请求
 * - 开启深度思考模式（按 DeepSeek V4 Flash 官方文档配置）
 * - 超时 50 秒（预留 10 秒给云函数自身逻辑）
 * @param {Array} messages - 完整的消息数组 [{role, content}, ...]
 * @returns {Promise<String>} AI 生成的内容
 * @throws {Error} API 调用失败或返回为空时抛出
 */
async function callDeepSeek(messages) {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    throw new Error('API_KEY_MISSING')
  }

  const response = await got.post(DEEPSEEK_API_URL, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    json: {
      model: DEEPSEEK_MODEL,
      messages,
      temperature: DEEPSEEK_TEMPERATURE,
      max_tokens: DEEPSEEK_MAX_TOKENS
      // 深度思考模式参数按 DeepSeek V4 Flash 官方文档配置
    },
    timeout: { request: 50000 },
    retry: { limit: 0 }
  })

  const data = response.body
  const content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content

  if (!content || content.trim() === '') {
    throw new Error('EMPTY_RESPONSE')
  }

  return content
}

// ======================== 核心处理函数 ========================

/**
 * 首轮生成故事
 * 流程：参数验证 → 拼装 Prompt → 调 API → 后处理 → 存 DB → 返回
 * @param {String} openid - 用户 openid
 * @param {*} mbti - MBTI 类型
 * @param {*} gender - 性别
 * @param {*} answers - 5 道题答案
 * @returns {Promise<Object>} 标准返回结构
 */
async function handleFirstRound(openid, mbti, gender, answers) {
  // ---- 1. 参数验证 ----
  if (mbti === undefined || mbti === null) {
    return makeError('MISSING_PARAMS', '缺少必要参数：mbti')
  }
  if (gender === undefined || gender === null) {
    return makeError('MISSING_PARAMS', '缺少必要参数：gender')
  }

  const mbtiResult = validateMbti(mbti)
  if (!mbtiResult.valid) return mbtiResult.error ? makeError(mbtiResult.error.code, mbtiResult.error.message) : makeError('INVALID_MBTI', 'MBTI 类型无效')

  const genderResult = validateGender(gender)
  if (!genderResult.valid) return makeError(genderResult.error.code, genderResult.error.message)

  const answersResult = validateAnswers(answers, 5)
  if (!answersResult.valid) return makeError(answersResult.error.code, answersResult.error.message)

  // ---- 2. 拼装 Prompt ----
  const userPrompt = `请根据以下性格参数创作故事：\n\n主角MBTI类型：${mbtiResult.value}\n主角性别：${genderResult.value}\n\n场景选择题答案：\n${formatAnswers(answersResult.value, 1)}\n\n请开始创作。`

  // 防御性检查：确认模板变量已替换
  if (userPrompt.includes('{mbti}') || userPrompt.includes('{gender}') || userPrompt.includes('{answers}')) {
    return makeError('TEMPLATE_ERROR', 'Prompt 模板变量未正确替换')
  }

  // ---- 3. 构造 messages ----
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userPrompt }
  ]

  // ---- 4. 调用 DeepSeek API ----
  let assistantContent
  try {
    assistantContent = await callDeepSeek(messages)
  } catch (e) {
    console.error('[generateStory] DeepSeek API 调用失败:', e.message)
    if (e.message === 'API_KEY_MISSING') {
      return makeError('API_CONFIG_ERROR', '服务配置异常')
    }
    if (e.message === 'EMPTY_RESPONSE') {
      return makeError('EMPTY_RESPONSE', '生成失败，请重试')
    }
    return makeError('API_ERROR', '故事生成失败，请重试')
  }

  // ---- 5. 后处理 ----
  const warnings = []

  // 提取标题
  const title = extractTitle(assistantContent)

  // 内容安全过滤
  const safetyResult = contentSafetyCheck(assistantContent)
  if (!safetyResult.safe) {
    return makeError('CONTENT_BLOCKED', '生成内容不符合规范')
  }

  // 字数统计 + 截断
  const { content: finalContent, wordCount, truncated } = truncateContent(assistantContent)
  if (truncated) {
    warnings.push({ type: 'CONTENT_TRUNCATED', message: `内容超过${CONTENT_HARD_LIMIT}字，已截断至${CONTENT_SOFT_LIMIT}字` })
  }

  // ---- 6. 写入云数据库 ----
  const now = new Date().toISOString()
  try {
    const addResult = await db.collection('story_sessions').add({
      data: {
        openid,
        mbti: mbtiResult.value,
        gender: genderResult.value,
        title,
        systemPrompt: SYSTEM_PROMPT,
        history: [
          { role: 'user', content: userPrompt },
          { role: 'assistant', content: finalContent }
        ],
        rounds: [{
          round: 1,
          answers: answersResult.value,
          content: finalContent,
          wordCount,
          createdAt: now
        }],
        currentRound: 1,
        maxRounds: MAX_ROUNDS,
        status: 'active',
        createdAt: now,
        updatedAt: now
      }
    })

    // ---- 7. 返回标准结构 ----
    return makeSuccess({
      sessionId: addResult._id,
      round: 1,
      title,
      content: finalContent,
      wordCount,
      isComplete: false,
      meta: {
        model: DEEPSEEK_MODEL,
        totalRounds: 1,
        maxRounds: MAX_ROUNDS,
        canContinue: true,
        createdAt: now
      }
    }, warnings)

  } catch (dbErr) {
    // DB 写入失败：记录已生成内容到日志
    console.error('[generateStory] DB 写入失败:', dbErr)
    console.log('[generateStory] 已生成内容（备用）:', JSON.stringify({ title, content: finalContent, wordCount }))
    return makeError('DB_WRITE_ERROR', '数据保存异常，请重试')
  }
}

/**
 * 续写生成故事
 * 流程：读取会话 → 校验 → 拼装消息（全量历史） → 调 API → 后处理 → 更新 DB → 返回
 * @param {String} openid - 用户 openid
 * @param {String} sessionId - 会话 ID
 * @param {*} answers - 2 道题答案
 * @returns {Promise<Object>} 标准返回结构
 */
async function handleContinueRound(openid, sessionId, answers) {
  // ---- 1. 校验 sessionId ----
  if (!sessionId || typeof sessionId !== 'string') {
    return makeError('MISSING_SESSION_ID', '缺少会话标识')
  }

  // ---- 2. 读取会话 ----
  let session
  try {
    const queryResult = await db.collection('story_sessions').doc(sessionId).get()
    session = queryResult.data
  } catch (e) {
    console.error('[generateStory] 读取会话失败:', e)
    return makeError('SESSION_NOT_FOUND', '会话不存在')
  }

  // 校验 openid
  if (session.openid !== openid) {
    return makeError('SESSION_NOT_FOUND', '会话不存在')
  }

  // 校验状态
  if (session.status !== 'active') {
    return makeError('SESSION_EXPIRED', '会话已过期')
  }

  // 校验轮次上限
  if (session.currentRound >= session.maxRounds) {
    return makeError('MAX_ROUNDS_EXCEEDED', '故事已达最大篇幅')
  }

  // ---- 3. 参数验证 ----
  const answersResult = validateAnswers(answers, 2)
  if (!answersResult.valid) return makeError(answersResult.error.code, answersResult.error.message)

  // ---- 4. 拼装消息（全量历史） ----
  const startIndex = calcStartIndex(session.currentRound)
  const continueUserPrompt = `请基于前面的故事继续创作下一页内容。\n\n注意：\n1. 新的一页应当自然衔接上一页的结尾，保持人物性格和情节连贯\n2. 不要重复前面的内容\n3. 保持同样的写作风格和推理注释格式\n4. 不要重新生成标题，标题沿用已有标题\n5. 主角MBTI类型：${session.mbti}，主角性别：${session.gender}\n\n新的场景选择题答案：\n${formatAnswers(answersResult.value, startIndex)}\n\n请继续创作。`

  const messages = [
    { role: 'system', content: session.systemPrompt },
    ...session.history,
    { role: 'user', content: continueUserPrompt }
  ]

  // ---- 5. 调用 DeepSeek API ----
  let assistantContent
  try {
    assistantContent = await callDeepSeek(messages)
  } catch (e) {
    console.error('[generateStory] DeepSeek API 调用失败（续写）:', e.message)
    if (e.message === 'API_KEY_MISSING') {
      return makeError('API_CONFIG_ERROR', '服务配置异常')
    }
    if (e.message === 'EMPTY_RESPONSE') {
      return makeError('EMPTY_RESPONSE', '生成失败，请重试')
    }
    return makeError('API_ERROR', '故事生成失败，请重试')
  }

  // ---- 6. 后处理 ----
  const warnings = []

  // 安全过滤
  const safetyResult = contentSafetyCheck(assistantContent)
  if (!safetyResult.safe) {
    return makeError('CONTENT_BLOCKED', '生成内容不符合规范')
  }

  // 字数统计 + 截断
  const { content: finalContent, wordCount, truncated } = truncateContent(assistantContent)
  if (truncated) {
    warnings.push({ type: 'CONTENT_TRUNCATED', message: `内容超过${CONTENT_HARD_LIMIT}字，已截断至${CONTENT_SOFT_LIMIT}字` })
  }

  // ---- 7. 更新云数据库 ----
  const now = new Date().toISOString()
  const newRound = session.currentRound + 1
  const isComplete = newRound >= MAX_ROUNDS

  try {
    // 使用原子操作追加 history 和 rounds，避免并发覆盖
    await db.collection('story_sessions').doc(sessionId).update({
      data: {
        history: _.push([
          { role: 'user', content: continueUserPrompt },
          { role: 'assistant', content: finalContent }
        ]),
        rounds: _.push([{
          round: newRound,
          answers: answersResult.value,
          content: finalContent,
          wordCount,
          createdAt: now
        }]),
        currentRound: newRound,
        status: isComplete ? 'completed' : 'active',
        updatedAt: now
      }
    })

    // ---- 8. 返回标准结构 ----
    return makeSuccess({
      sessionId,
      round: newRound,
      title: session.title,
      content: finalContent,
      wordCount,
      isComplete,
      meta: {
        model: DEEPSEEK_MODEL,
        totalRounds: newRound,
        maxRounds: MAX_ROUNDS,
        canContinue: !isComplete,
        createdAt: session.createdAt
      }
    }, warnings)

  } catch (dbErr) {
    console.error('[generateStory] DB 更新失败（续写）:', dbErr)
    console.log('[generateStory] 已生成内容（备用）:', JSON.stringify({ round: newRound, content: finalContent, wordCount }))
    return makeError('DB_WRITE_ERROR', '数据保存异常，请重试')
  }
}

// ======================== 云函数入口 ========================

/**
 * generateStory 云函数入口
 *
 * 功能：调用 DeepSeek V4 Flash API 生成 MBTI 主题故事
 * - 首轮：根据 MBTI/性别/5道题答案生成完整故事
 * - 续写：基于历史消息续写下一页故事
 *
 * 错误码说明：
 * - INVALID_ACTION: action 不为 "generate"
 * - MISSING_PARAMS: 首轮缺少必填参数
 * - INVALID_MBTI: MBTI 类型不在 16 种合法值中
 * - INVALID_GENDER: 性别不为 "男" 或 "女"
 * - INVALID_ANSWERS: 答案格式/长度/内容不合法
 * - MISSING_SESSION_ID: 续写时未传 sessionId
 * - SESSION_NOT_FOUND: sessionId 不存在或 openid 不匹配
 * - SESSION_EXPIRED: 会话 status ≠ active
 * - MAX_ROUNDS_EXCEEDED: 当前轮次已达上限（4）
 * - API_ERROR: DeepSeek API 调用失败
 * - API_CONFIG_ERROR: API Key 无效或未配置
 * - EMPTY_RESPONSE: DeepSeek 返回内容为空
 * - CONTENT_BLOCKED: 内容触发安全过滤
 * - DB_READ_ERROR: 云数据库读取失败
 * - DB_WRITE_ERROR: 云数据库写入失败
 * - TEMPLATE_ERROR: Prompt 模板变量未替换（防御性）
 * - CLOUD_FUNCTION_ERROR: 未捕获的异常
 *
 * @param {Object} event - 云函数调用参数
 * @param {String} event.action - 固定为 "generate"
 * @param {String} [event.sessionId] - 续写时传入的会话 ID
 * @param {String} [event.mbti] - 首轮：MBTI 类型
 * @param {String} [event.gender] - 首轮：性别
 * @param {Array} [event.answers] - 题目答案数组
 * @returns {Promise<Object>} 标准返回结构 { success, data, warnings, error }
 */
exports.main = async (event) => {
  try {
    const { action, sessionId, mbti, gender, answers } = event

    // ---- action 校验 ----
    if (action !== 'generate') {
      return makeError('INVALID_ACTION', '无效的请求类型')
    }

    // 获取 openid
    const wxContext = cloud.getWXContext()
    const openid = wxContext.OPENID

    // 防御性检查：确保获取到 openid
    if (!openid) {
      return makeError('NOT_AUTHORIZED', '无法获取用户身份')
    }

    // ---- 分支：首轮 vs 续写 ----
    if (!sessionId) {
      return await handleFirstRound(openid, mbti, gender, answers)
    } else {
      return await handleContinueRound(openid, sessionId, answers)
    }

  } catch (e) {
    // 全局异常兜底
    console.error('[generateStory] 云函数执行异常:', e)
    return makeError('CLOUD_FUNCTION_ERROR', '服务异常，请稍后重试')
  }
}
