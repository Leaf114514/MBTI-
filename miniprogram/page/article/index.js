const articleRepository = require('../../data/article-repository');
const { parseArticleIdFromOptions } = require('../common/article-route');

// 将文章发布时间格式化为详情页展示所需的年月日格式。
function formatPublishTime(publishTime) {
  if (!publishTime) {
    return '';
  }

  const date = new Date(publishTime);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

Page({
  data: {
    article: null,
    formattedPublishTime: ''
  },

  async onLoad(options) {
    try {
      const articleId = parseArticleIdFromOptions(options);
      const article = await articleRepository.getArticleById(articleId);

      if (!article) {
        wx.hideLoading();
        this.showArticleNotFoundToast();
        return;
      }

      wx.setNavigationBarTitle({
        title: article.title
      });

      this.setData({
        article,
        formattedPublishTime: formatPublishTime(article.publishTime)
      });
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: '文章加载失败',
        icon: 'none'
      });
    }
  },

  onReady() {
    wx.hideLoading();
  },

  onPreviewImage(event) {
    const currentUrl = event && event.currentTarget && event.currentTarget.dataset
      ? event.currentTarget.dataset.url
      : '';
    const article = this.data.article;
    const urls = article && Array.isArray(article.imageUrls) ? article.imageUrls : [];

    if (!currentUrl || !urls.length) {
      return;
    }

    wx.previewImage({
      current: currentUrl,
      urls
    });
  },

  showArticleNotFoundToast() {
    wx.showToast({
      title: 'Article not found',
      icon: 'none'
    });
  }
});
