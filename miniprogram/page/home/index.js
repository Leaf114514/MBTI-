const articleRepository = require('../../data/article-repository');
const { buildArticleDetailUrl } = require('../common/article-route');

const HOME_ARTICLE_SECTION_TITLE = '主页推荐文章';

Page({
  data: {
    // 主页文章栏状态，统一由当前页面维护。
    sectionTitle: HOME_ARTICLE_SECTION_TITLE,
    recommendedArticles: []
  },

  // 页面初始化时加载推荐文章。
  onLoad() {
    this.loadRecommendedArticles();
  },

  // 聚合列表加载逻辑，避免生命周期函数里混入过多业务细节。
  loadRecommendedArticles() {
    this.setData({
      recommendedArticles: articleRepository.getRecommendedArticles()
    });
  },

  // 处理文章卡片点击事件，统一通过路由工具构建跳转地址。
  onSelectArticle(event) {
    const articleId = event && event.detail && event.detail.id;
    const detailUrl = buildArticleDetailUrl(articleId);

    if (!detailUrl) {
      return;
    }

    wx.navigateTo({
      url: detailUrl
    });
  }
});
