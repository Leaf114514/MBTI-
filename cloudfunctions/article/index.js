const cloud = require('wx-server-sdk');

// 云函数使用当前环境，避免写死环境 id。
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const articlesCollection = db.collection('articles');

// 将云函数入参中的文章 id 规整为稳定字符串。
function normalizeArticleId(articleId) {
  if (articleId === undefined || articleId === null) {
    return '';
  }

  return String(articleId).trim();
}

// 返回首页列表所需的最小文章结构，减少前端不必要字段依赖。
function toArticleListItem(article) {
  const titleSection = article && article.titleSection ? article.titleSection : {};

  return {
    id: article._id,
    titleSection: {
      title: titleSection.title || '',
      coverUrl: titleSection.coverUrl || '',
      authorName: titleSection.authorName || '',
      authorAvatarUrl: titleSection.authorAvatarUrl || '',
      publishTime: titleSection.publishTime || ''
    }
  };
}

// 返回详情页所需的双区块文章结构。
function toArticleDetail(article) {
  const titleSection = article && article.titleSection ? article.titleSection : {};
  const contentSection = article && article.contentSection ? article.contentSection : {};

  return {
    id: article._id,
    titleSection: {
      title: titleSection.title || '',
      coverUrl: titleSection.coverUrl || '',
      authorName: titleSection.authorName || '',
      authorAvatarUrl: titleSection.authorAvatarUrl || '',
      publishTime: titleSection.publishTime || ''
    },
    contentSection: {
      body: contentSection.body || '',
      images: Array.isArray(contentSection.images) ? contentSection.images : []
    }
  };
}

// 查询文章列表，供首页推荐栏展示。
async function listArticles() {
  const result = await articlesCollection.get();
  return (result.data || []).map(toArticleListItem);
}

// 按文章 id 查询详情，供详情页展示完整内容。
async function getArticleDetail(articleId) {
  const normalizedArticleId = normalizeArticleId(articleId);

  if (!normalizedArticleId) {
    return null;
  }

  const result = await articlesCollection.doc(normalizedArticleId).get();

  if (!result.data) {
    return null;
  }

  return toArticleDetail(result.data);
}

exports.main = async (event) => {
  try {
    const action = event && event.action;

    if (action === 'list') {
      return {
        success: true,
        data: await listArticles()
      };
    }

    if (action === 'detail') {
      return {
        success: true,
        data: await getArticleDetail(event.articleId)
      };
    }

    return {
      success: false,
      error: 'Unsupported action'
    };
  } catch (error) {
    console.error('article cloud function error:', error);
    return {
      success: false,
      error: error.message || 'Unknown error'
    };
  }
};
