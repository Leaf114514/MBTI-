const cloud = require('wx-server-sdk')
const got = require('got')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions'
const DEEPSEEK_MODEL = 'deepseek-chat'

exports.main = async (event) => {
  const { typeA, typeB } = event || {}

  if (!typeA || !typeB) {
    return { success: false, error: { code: 'MISSING_PARAMS', message: '缺少MBTI类型参数' } }
  }

  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    return { success: false, error: { code: 'API_CONFIG_ERROR', message: '服务配置异常' } }
  }

  const prompt = `根据MBTI性格理论，${typeA}和${typeB}的相处模式是怎样的？请用一句20字以内有趣且有洞察力的话评价，不要加引号。`

  try {
    const response = await got.post(DEEPSEEK_API_URL, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      json: {
        model: DEEPSEEK_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.9,
        max_tokens: 100
      },
      responseType: 'json',
      timeout: { request: 30000 },
      retry: { limit: 0 }
    })

    const content = response.body.choices &&
      response.body.choices[0] &&
      response.body.choices[0].message &&
      response.body.choices[0].message.content

    if (!content || content.trim() === '') {
      return { success: false, error: { code: 'EMPTY_RESPONSE', message: '生成失败，请重试' } }
    }

    return {
      success: true,
      data: { comment: content.trim() }
    }
  } catch (err) {
    console.error('[getCompatibility] API error:', err.message)
    return { success: false, error: { code: 'API_ERROR', message: '配对分析暂时不可用' } }
  }
}
