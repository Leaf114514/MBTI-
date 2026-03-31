/**
 * 文章示例数据的唯一出口。
 * 页面和组件只通过本模块取数，避免直接依赖原始数据结构，降低耦合。
 */
const SAMPLE_COVER_URL = '/image/zhanweifu.png';

/**
 * 内部完整文章模型：
 * - id: 文章唯一标识（用于路由和查询）
 * - title: 文章标题
 * - content: 文章正文
 * - coverUrl: 封面图地址（列表和详情复用）
 */
const ARTICLES = Object.freeze([
  {
    id: 'article-1',
    title: '\u6807\u9898',
    content: '\u6b63\u6587',
    coverUrl: SAMPLE_COVER_URL
  },
  {
    id: 'article-2',
    title: '\u6807\u9898',
    content: '\u6b63\u6587',
    coverUrl: SAMPLE_COVER_URL
  }
]);

/**
 * 将输入 id 统一规整为可比较字符串。
 * @param {unknown} articleId
 * @returns {string}
 */
function normalizeArticleId(articleId) {
  if (typeof articleId !== 'string') {
    return '';
  }

  return articleId.trim();
}

/**
 * 组装列表页需要的轻量模型，避免暴露正文字段。
 * @param {{id: string, title: string, coverUrl: string}} article
 */
function toRecommendedArticle(article) {
  return {
    id: article.id,
    title: article.title,
    coverUrl: article.coverUrl
  };
}

/**
 * 组装详情页需要的完整模型。
 * @param {{id: string, title: string, content: string, coverUrl: string}} article
 */
function toArticleDetail(article) {
  return {
    id: article.id,
    title: article.title,
    content: article.content,
    coverUrl: article.coverUrl
  };
}

/**
 * 返回推荐列表所需的轻量数据。
 * 刻意不返回 content，减少列表页渲染和传输负担。
 */
function getRecommendedArticles() {
  return ARTICLES.map(toRecommendedArticle);
}

/**
 * 根据文章 id 返回详情数据。
 * @param {string} articleId
 * @returns {{id: string, title: string, content: string, coverUrl: string} | null}
 */
function getArticleById(articleId) {
  const normalizedArticleId = normalizeArticleId(articleId);

  if (!normalizedArticleId) {
    return null;
  }

  const article = ARTICLES.find((item) => item.id === normalizedArticleId);

  if (!article) {
    return null;
  }

  return toArticleDetail(article);
}

module.exports = {
  getRecommendedArticles,
  getArticleById
};
