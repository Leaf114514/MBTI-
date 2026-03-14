const ARTICLE_DETAIL_PAGE_PATH = '/page/article/index';

/**
 * 将路由参数中的文章 id 规整为可用字符串。
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
 * 统一在这里做编码，避免页面层重复拼接和编码细节。
 * @param {unknown} articleId
 * @returns {string}
 */
function buildArticleDetailUrl(articleId) {
  const normalizedArticleId = normalizeArticleId(articleId);

  if (!normalizedArticleId) {
    return '';
  }

  return `${ARTICLE_DETAIL_PAGE_PATH}?id=${encodeURIComponent(normalizedArticleId)}`;
}

/**
 * 从页面入参中提取文章 id。
 * @param {{id?: string} | undefined} options
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
    return normalizedArticleId;
  }
}

module.exports = {
  buildArticleDetailUrl,
  parseArticleIdFromOptions
};
