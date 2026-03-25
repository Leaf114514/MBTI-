/**
 * 文章示例数据的唯一出口。
 * 页面和组件只通过本模块取数，避免直接依赖原始数据结构，降低耦合。
 */
const SAMPLE_COVER_URL = '/packageExtend/pages/images/pic_article.png';
const SAMPLE_AVATAR_URL = '/image/icon64_appwx_logo.png';
const SAMPLE_BODY_IMAGE_URLS = Object.freeze([
  '/packageComponent/resources/pic/1.jpg',
  '/packageComponent/resources/pic/2.jpg'
]);

/**
 * 内部完整文章模型：
 * - id: 文章唯一标识（用于路由和查询）
 * - title: 文章标题
 * - authorName: 作者昵称
 * - authorAvatarUrl: 作者头像
 * - publishTime: 发布时间（ISO 字符串）
 * - summary: 摘要/纯文本正文
 * - blocks: 正文块（文本/图片）
 * - coverUrl: 封面图地址（列表和详情复用）
 */
const ARTICLES = Object.freeze([
  {
    id: 'article-1',
    title: 'INTJ 如何把天赋转化为稳定成果',
    authorName: 'MBTI研究社',
    authorAvatarUrl: SAMPLE_AVATAR_URL,
    publishTime: '2026-03-20T09:30:00+08:00',
    summary: 'INTJ 常常拥有清晰的长期目标，但真正让优势落地的，是把洞察拆成可执行的小步骤。',
    coverUrl: SAMPLE_COVER_URL,
    blocks: [
      {
        type: 'text',
        content: 'INTJ 往往能够迅速看见问题背后的结构，也擅长为未来设计路径。但当目标过大、标准过高时，行动反而容易被拖慢。想要更流畅地推进事情，第一步不是继续优化想法，而是先把复杂目标拆成当前一周就能完成的动作。'
      },
      {
        type: 'image',
        url: SAMPLE_BODY_IMAGE_URLS[0]
      },
      {
        type: 'text',
        content: '把“我要做得很完美”改成“我要先完成一个可验证版本”，会明显降低启动阻力。对 INTJ 来说，最有效的反馈不是泛泛鼓励，而是阶段性结果是否接近自己的预期模型。'
      },
      {
        type: 'text',
        content: '如果你正在做学习计划、内容创作或个人项目，可以给自己保留一个固定节奏：设定目标、产出草稿、复盘偏差，再继续下一轮。长期看，这种节奏比偶尔爆发更能体现 INTJ 的优势。'
      },
      {
        type: 'image',
        url: SAMPLE_BODY_IMAGE_URLS[1]
      }
    ]
  },
  {
    id: 'article-2',
    title: 'INFP 情绪敏感，不等于行动力弱',
    authorName: '人格成长实验室',
    authorAvatarUrl: SAMPLE_AVATAR_URL,
    publishTime: '2026-03-18T20:15:00+08:00',
    summary: 'INFP 的细腻感受力，本质上是一种高质量的内在雷达，只要找到合适的输出方式，就能转化成持续行动。',
    coverUrl: SAMPLE_COVER_URL,
    blocks: [
      {
        type: 'text',
        content: '很多 INFP 在面对现实压力时，会误以为自己“想得太多、做得太少”。其实这并不完全准确。更常见的情况是：你对意义、价值和感受的要求很高，因此不愿意把时间投入到自己并不认同的目标里。'
      },
      {
        type: 'image',
        url: SAMPLE_BODY_IMAGE_URLS[1]
      },
      {
        type: 'text',
        content: '当目标和内在价值一致时，INFP 的执行力往往并不弱。你需要的不是更强硬的自我逼迫，而是更清楚地知道：这件事为什么值得做、完成之后会回应自己怎样的期待。'
      },
      {
        type: 'text',
        content: '建议把大任务换成更温和的推进方式，比如每天只做一小段、先完成一个最小版本，或者用文字记录当天的真实感受。只要目标能持续连接你的内在价值，行动就会逐渐稳定下来。'
      }
    ]
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
  const blocks = Array.isArray(article.blocks) ? article.blocks.slice() : [];
  const bodyImageUrls = blocks
    .filter((block) => block && block.type === 'image' && block.url)
    .map((block) => block.url);
  const imageUrls = article.coverUrl
    ? [article.coverUrl].concat(bodyImageUrls)
    : bodyImageUrls;

  return {
    id: article.id,
    title: article.title,
    authorName: article.authorName,
    authorAvatarUrl: article.authorAvatarUrl,
    publishTime: article.publishTime,
    summary: article.summary,
    coverUrl: article.coverUrl,
    blocks,
    imageUrls
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
