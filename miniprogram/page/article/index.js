const articleRepository = require('../../data/article-repository');
const { parseArticleIdFromOptions } = require('../common/article-route');

Page({
  data: {
    // 详情页渲染所需的完整文章对象。
    article: null
  },

  // 从页面参数读取 id，并加载对应文章详情。
  onLoad(options) {
    const articleId = parseArticleIdFromOptions(options);
    const article = articleRepository.getArticleById(articleId);

    // id 无效或不存在时，给出提示并停止后续渲染。
    if (!article) {
      this.showArticleNotFoundToast();
      return;
    }

    // 动态设置导航栏标题，提高页面语义一致性。
    wx.setNavigationBarTitle({
      title: article.title
    });

    // 写入数据，触发视图更新。
    this.setData({
      article
    });
  },

  // 统一管理“文章不存在”提示，便于后续统一文案。
  showArticleNotFoundToast() {
    wx.showToast({
      title: 'Article not found',
      icon: 'none'
    });
  }
});
