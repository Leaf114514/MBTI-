const articleRepository = require('../../data/article-repository');
const { buildArticleDetailUrl } = require('../common/article-route');

const HOME_ARTICLE_SECTION_TITLE = '\u4e3b\u9875\u63a8\u8350\u6587\u7ae0';

Page({
  data: {
    // 文章栏标题与列表数据，统一由当前页面维护。
    sectionTitle: HOME_ARTICLE_SECTION_TITLE,
    recommendedArticles: []
  },

  /**
   * 页面初始化时加载推荐文章。
   * 后续若接入接口，仅需替换仓储层实现，页面层无需改结构。
   */
  onLoad() {
    this.loadRecommendedArticles();
  },

  // 聚合列表加载逻辑，统一从仓储层读取文章推荐数据。
  async loadRecommendedArticles() {
    try {
      const recommendedArticles = await articleRepository.getRecommendedArticles();

      this.setData({
        recommendedArticles
      });
    } catch (error) {
      wx.showToast({
        title: '文章加载失败',
        icon: 'none'
      });
    }
  },

  // 处理子组件抛出的点击事件，并负责页面跳转。
  onSelectArticle(event) {
    const articleId = event && event.detail && event.detail.id;
    const detailUrl = buildArticleDetailUrl(articleId);

    if (!detailUrl) {
      return;
    }

    wx.showLoading({
      title: '加载中',
      mask: true
    });

    wx.navigateTo({
      url: detailUrl,
      fail() {
        wx.hideLoading();
      }
    });
  }
});
