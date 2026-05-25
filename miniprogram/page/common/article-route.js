// ============================================================
//  page/common/article-route.js — 文章路由工具模块
// ============================================================
//  职责：
//    1. 统一文章 ID 的编解码逻辑
//    2. 构建文章详情页 URL
//    3. 从页面路由参数中提取文章 ID
//    4. 避免各页面重复拼接和编码细节
// ============================================================

// 文章详情页路径常量
const ARTICLE_DETAIL_PAGE_PATH = '/page/article/index';

/**
 * 将路由参数中的文章 id 规整为可用字符串。
 * 处理 undefined / null / 非字符串等边界情况。
 * @param {unknown} articleId
 * @returns {string}
 */
function normalizeArticleId(articleId) {
  if (articleId === undefined || articleId === null) {
    return '';
  }

  return String(articleId).trim();
}

/**
 * 构建文章详情页地址。
 * 统一在这里做 encodeURIComponent，避免页面层手动拼接。
 * @param {unknown} articleId
 * @returns {string} 如 "/page/article/index?id=xxx"
 */
function buildArticleDetailUrl(articleId) {
  const normalizedArticleId = normalizeArticleId(articleId);

  if (!normalizedArticleId) {
    return '';
  }

  return ARTICLE_DETAIL_PAGE_PATH + '?id=' + encodeURIComponent(normalizedArticleId);
}

/**
 * 从页面入参 options 中提取文章 id。
 * 自动处理 URL 解码，兼容已编码/未编码两种情况。
 * @param {{id?: string} | undefined} options — 页面 onLoad 的 options 参数
 * @returns {string}
 */
function parseArticleIdFromOptions(options) {
  if (!options) {
    return '';
  }

  const normalizedArticleId = normalizeArticleId(options.id);

  if (!normalizedArticleId) {
    return '';
  }

  try {
    return decodeURIComponent(normalizedArticleId);
  } catch (error) {
    // 解码失败（如已解码的字符串）→ 返回原始值
    return normalizedArticleId;
  }
}

module.exports = {
  buildArticleDetailUrl,
  parseArticleIdFromOptions
};