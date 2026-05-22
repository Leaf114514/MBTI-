// 文章默认封面图与作者头像兜底资源。
const SAMPLE_COVER_URL = '/packageExtend/pages/images/pic_article.png';
const SAMPLE_AVATAR_URL = '/image/icon64_appwx_logo.png';

// 将外部传入的文章 id 规整为可比较的字符串。
function normalizeArticleId(articleId) {
  if (typeof articleId !== 'string') {
    return '';
  }

  return articleId.trim();
}

// 将封面图和正文图片合并成统一预览列表。
function createArticlePreviewList(coverUrl, contentImages) {
  const safeContentImages = Array.isArray(contentImages) ? contentImages.filter(Boolean) : [];

  if (!coverUrl) {
    return safeContentImages;
  }

  return [coverUrl].concat(safeContentImages);
}

// 将云函数返回的文章标题区块映射为首页卡片模型。
function toRecommendedArticle(article) {
  const titleSection = article && article.titleSection ? article.titleSection : {};

  return {
    id: article.id || '',
    title: titleSection.title || '',
    coverUrl: titleSection.coverUrl || SAMPLE_COVER_URL
  };
}

// 将正文区块拆成页面可直接渲染的文本块和图片块。
function toArticleBlocks(contentSection) {
  const blocks = [];
  const body = contentSection && typeof contentSection.body === 'string'
    ? contentSection.body.trim()
    : '';
  const images = contentSection && Array.isArray(contentSection.images)
    ? contentSection.images.filter(Boolean)
    : [];

  if (body) {
    body.split(/\n+/).map((paragraph) => paragraph.trim()).filter(Boolean).forEach((paragraph) => {
      blocks.push({
        type: 'text',
        content: paragraph
      });
    });
  }

  images.forEach((imageUrl) => {
    blocks.push({
      type: 'image',
      url: imageUrl
    });
  });

  return blocks;
}

// 将云函数返回的双区块文章结构映射为详情页模型。
function toArticleDetail(article) {
  const titleSection = article && article.titleSection ? article.titleSection : {};
  const contentSection = article && article.contentSection ? article.contentSection : {};
  const images = Array.isArray(contentSection.images) ? contentSection.images.filter(Boolean) : [];
  const coverUrl = titleSection.coverUrl || SAMPLE_COVER_URL;

  return {
    id: article.id || '',
    title: titleSection.title || '',
    authorName: titleSection.authorName || '',
    authorAvatarUrl: titleSection.authorAvatarUrl || SAMPLE_AVATAR_URL,
    publishTime: titleSection.publishTime || '',
    coverUrl,
    blocks: toArticleBlocks(contentSection),
    imageUrls: createArticlePreviewList(coverUrl, images)
  };
}

// 统一封装文章云函数调用，避免页面层感知返回结构。
function callArticleCloudFunction(data) {
  return wx.cloud.callFunction({
    name: 'article',
    data
  }).then((result) => {
    const cloudResult = result && result.result ? result.result : {};

    if (!cloudResult.success) {
      throw new Error(cloudResult.error || 'Failed to load articles');
    }

    return cloudResult.data;
  });
}

function getRecommendedArticles() {
  return callArticleCloudFunction({
    action: 'list'
  }).then((articles) => {
    const safeArticles = Array.isArray(articles) ? articles : [];
    return safeArticles.map(toRecommendedArticle);
  });
}

function getArticleById(articleId) {
  const normalizedArticleId = normalizeArticleId(articleId);

  if (!normalizedArticleId) {
    return Promise.resolve(null);
  }

  return callArticleCloudFunction({
    action: 'detail',
    articleId: normalizedArticleId
  }).then((article) => {
    if (!article) {
      return null;
    }

    return toArticleDetail(article);
  });
}

module.exports = {
  normalizeArticleId,
  createArticlePreviewList,
  toRecommendedArticle,
  toArticleBlocks,
  toArticleDetail,
  getRecommendedArticles,
  getArticleById
};
