const assert = require('assert');
const articleRepository = require('../miniprogram/data/article-repository');

// 用最小测试壳统一输出断言结果，避免引入额外测试框架。
function runTest(name, testFn) {
  try {
    testFn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

// 验证文章 id 规整逻辑可去除首尾空白。
runTest('normalizeArticleId trims valid string ids', () => {
  assert.strictEqual(articleRepository.normalizeArticleId(' article-1 '), 'article-1');
});

runTest('normalizeArticleId returns empty string for invalid input', () => {
  assert.strictEqual(articleRepository.normalizeArticleId(null), '');
});

runTest('createArticlePreviewList prepends cover image', () => {
  assert.deepStrictEqual(
    articleRepository.createArticlePreviewList('/cover.png', ['/1.png', '/2.png']),
    ['/cover.png', '/1.png', '/2.png']
  );
});

runTest('toRecommendedArticle maps title section fields', () => {
  assert.deepStrictEqual(
    articleRepository.toRecommendedArticle({
      id: 'article-1',
      titleSection: {
        title: '标题',
        coverUrl: '/cover.png'
      }
    }),
    {
      id: 'article-1',
      title: '标题',
      coverUrl: '/cover.png'
    }
  );
});

runTest('toArticleBlocks converts body and images into render blocks', () => {
  assert.deepStrictEqual(
    articleRepository.toArticleBlocks({
      body: '第一段\n\n第二段',
      images: ['/1.png']
    }),
    [
      { type: 'text', content: '第一段' },
      { type: 'text', content: '第二段' },
      { type: 'image', url: '/1.png' }
    ]
  );
});

runTest('toArticleDetail maps dual-section article structure', () => {
  const article = articleRepository.toArticleDetail({
    id: 'article-2',
    titleSection: {
      title: '文章标题',
      coverUrl: '/cover.png',
      authorName: '作者',
      authorAvatarUrl: '/avatar.png',
      publishTime: '2026-03-25T10:00:00+08:00'
    },
    contentSection: {
      body: '正文段落',
      images: ['/1.png', '/2.png']
    }
  });

  assert.strictEqual(article.id, 'article-2');
  assert.strictEqual(article.title, '文章标题');
  assert.strictEqual(article.authorName, '作者');
  assert.strictEqual(article.coverUrl, '/cover.png');
  assert.deepStrictEqual(article.imageUrls, ['/cover.png', '/1.png', '/2.png']);
  assert.deepStrictEqual(article.blocks, [
    { type: 'text', content: '正文段落' },
    { type: 'image', url: '/1.png' },
    { type: 'image', url: '/2.png' }
  ]);
});

console.log('All article repository tests passed.');
