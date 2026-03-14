Component({
  // 组件对外输入参数（公共 API）。
  properties: {
    // 文章栏标题。
    title: {
      type: String,
      value: ''
    },
    // 文章卡片列表，结构：[{ id, title, coverUrl }]
    articles: {
      type: Array,
      value: []
    }
  },

  methods: {
    // 将点击的文章 id 抛给父页面，由父页面决定如何跳转。
    onArticleTap(event) {
      const articleId = this.extractArticleId(event);

      if (!articleId) {
        return;
      }

      this.triggerEvent('select', {
        id: articleId
      });
    },

    // 统一提取并规整文章 id，避免事件结构变化导致异常。
    extractArticleId(event) {
      if (!event || !event.currentTarget || !event.currentTarget.dataset) {
        return '';
      }

      const articleId = event.currentTarget.dataset.id;

      if (articleId === undefined || articleId === null) {
        return '';
      }

      return String(articleId).trim();
    }
  }
});
