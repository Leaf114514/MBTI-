// ============================================================
//  components/article-panel/index.js — 文章卡片列表面板
// ============================================================
//  职责：
//    1. 接收 title + articles 数组，渲染文章卡片列表
//    2. 处理卡片点击，提取 articleId 并通过 select 事件抛出
//    3. 防御性编程：对事件参数做严格校验，防止数据结构异常崩溃
// ============================================================

Component({
  // ----------------------------------------------------------
  //  Props（父页面传入的参数）
  //  - title:    面板标题文字
  //  - articles: 文章列表 [{ id, title, coverUrl }]
  // ----------------------------------------------------------
  properties: {
    title: {
      type: String,
      value: ''
    },
    articles: {
      type: Array,
      value: []
    }
  },

  methods: {
    // ----------------------------------------------------------
    //  卡片点击 → 提取 articleId → 触发 select 事件通知父页面
    //  父页面监听 bind:select 即可获取被点击的文章 ID
    // ----------------------------------------------------------
    onArticleTap(event) {
      const articleId = this.extractArticleId(event);

      if (!articleId) {
        return;  // ID 无效，静默忽略
      }

      this.triggerEvent('select', {
        id: articleId
      });
    },

    // ----------------------------------------------------------
    //  从事件对象中安全提取 articleId
    //  层层判空，防止 WXML 中 data-id 缺失或非字符串导致报错
    //  @param {object} event — 微信小程序事件对象
    //  @returns {string} 规整后的 ID 字符串（无效时返回 ''）
    // ----------------------------------------------------------
    extractArticleId(event) {
      // 第一层：event 本身可能为 null/undefined
      if (!event || !event.currentTarget || !event.currentTarget.dataset) {
        return '';
      }

      const articleId = event.currentTarget.dataset.id;

      // 第二层：id 可能为 undefined/null（data-* 未设置）
      if (articleId === undefined || articleId === null) {
        return '';
      }

      // 第三层：转换为字符串并去除首尾空格
      return String(articleId).trim();
    }
  }
});