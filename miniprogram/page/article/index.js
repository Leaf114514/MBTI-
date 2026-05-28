// ============================================================
//  page/article/index.js — 文章详情页
// ============================================================
//  职责：
//    1. 根据路由参数 id 从 articleRepository 加载文章
//    2. 格式化发布时间
//    3. 点击图片 → 调用 wx.previewImage 全屏预览
//    4. 文章块渲染（文本、图片等混合内容）
// ============================================================

// 模块引入
const articleRepository = require('../../data/article-repository');
const { parseArticleIdFromOptions } = require('../common/article-route');

// ----------------------------------------------------------
//  工具：将发布时间格式化为 "YYYY-MM-DD" 格式
//  @param {string|number|Date} publishTime
//  @returns {string}
// ----------------------------------------------------------
function formatPublishTime(publishTime) {
  if (!publishTime) {
    return '';
  }

  const date = new Date(publishTime);

  // 无效日期检查
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return year + '-' + month + '-' + day;
}

Page({
  // ----------------------------------------------------------
  //  页面数据
  // ----------------------------------------------------------
  data: {
    article: null,              // 文章对象（含 title、content、imageUrls 等）
    formattedPublishTime: ''    // 格式化后的发布时间
  },

  // ----------------------------------------------------------
  //  页面加载 → 根据路由参数加载文章
  //  @param {object} options — 路由参数，含 id
  // ----------------------------------------------------------
  async onLoad(options) {
    try {
      // 从路由参数中提取并解码文章 ID
      const articleId = parseArticleIdFromOptions(options);
      const article = await articleRepository.getArticleById(articleId);

      if (!article) {
        wx.hideLoading();
        this.showArticleNotFoundToast();
        return;
      }

      // 动态设置导航栏标题
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

  // ----------------------------------------------------------
  //  页面渲染完成 → 关闭 Loading
  // ----------------------------------------------------------
  onReady() {
    wx.hideLoading();
  },

  // ----------------------------------------------------------
  //  点击图片 → 全屏预览
  //  支持左右滑动查看文章中所有图片
  // ----------------------------------------------------------
  onPreviewImage(event) {
    // 安全读取当前图片 URL
    const currentUrl = event && event.currentTarget && event.currentTarget.dataset
      ? event.currentTarget.dataset.url
      : '';

    const article = this.data.article;
    const urls = article && Array.isArray(article.imageUrls) ? article.imageUrls : [];

    if (!currentUrl || !urls.length) {
      return;
    }

    wx.previewImage({
      current: currentUrl,  // 当前显示的图片
      urls                  // 所有图片列表（可左右滑动）
    });
  },

  // ----------------------------------------------------------
  //  工具：提示文章未找到
  // ----------------------------------------------------------
  showArticleNotFoundToast() {
    wx.showToast({
      title: 'Article not found',
      icon: 'none'
    });
  }
});