// ============================================================
//  page/history/history.js — 历史故事列表页
// ============================================================
//  职责：
//    1. 从云函数 getStoryHistory 获取用户历史故事列表
//    2. 电影票式列表渲染（主券+副券连接设计）
//    3. 点击故事 → 跳转 Story 详情页（传入 sessionId）
//    4. 格式化时间展示
// ============================================================

// ----------------------------------------------------------
//  MBTI 四大分组（用于票根左侧彩色标签）
// ----------------------------------------------------------
const MBTI_GROUPS = {
  analyst:  ['INTJ', 'INTP', 'ENTJ', 'ENTP'],   // 分析家（紫色系）
  diplomat: ['INFJ', 'INFP', 'ENFJ', 'ENFP'],   // 外交家（绿色系）
  sentinel: ['ISTJ', 'ISFJ', 'ESTJ', 'ESFJ'],   // 守护者（蓝色系）
  explorer: ['ISTP', 'ISFP', 'ESTP', 'ESFP'],   // 探险家（黄色系）
}

// ----------------------------------------------------------
//  根据 MBTI 类型返回所属分组名
//  @param {string} mbti — 如 "ENFP"
//  @returns {string} — 'analyst' | 'diplomat' | 'sentinel' | 'explorer'
// ----------------------------------------------------------
function getMbtiGroup(mbti) {
  const upper = (mbti || '').toUpperCase()
  for (const [group, types] of Object.entries(MBTI_GROUPS)) {
    if (types.includes(upper)) return group
  }
  return 'analyst'  // 默认兜底
}

Page({
  // ----------------------------------------------------------
  //  页面数据
  // ----------------------------------------------------------
  data: {
    stories: [],    // 故事列表（含 displayTime、mbtiGroup 等增强字段）
    loading: true,  // 是否加载中（骨架屏状态）
    empty: false,   // 是否为空列表
    darkTheme: false,
  },

  // ----------------------------------------------------------
  //  页面加载 → 请求历史故事
  // ----------------------------------------------------------
  onLoad() {
    this._syncDarkTheme()
    this.loadStories()
  },

  onShow() {
    this._syncDarkTheme()
  },

  _syncDarkTheme() {
    const app = getApp()
    const isDark = !!app.globalData.darkTheme
    if (isDark !== this.data.darkTheme) {
      this.setData({ darkTheme: isDark })
    }
    if (isDark) {
      wx.setNavigationBarColor({
        frontColor: '#ffffff',
        backgroundColor: '#1E1E2A',
        animation: { duration: 200, timingFunc: 'easeIn' }
      })
    }
  },

  // ----------------------------------------------------------
  //  从云函数加载故事列表
  //  - 成功：格式化时间 + 计算分组
  //  - 失败：Toast 提示 + 显示空状态
  // ----------------------------------------------------------
  async loadStories() {
    this.setData({ loading: true, empty: false })
    try {
      const res = await wx.cloud.callFunction({
        name: 'getStoryHistory',
        data: { page: 1, pageSize: 50 },
      })
      const result = res.result
      if (result.success) {
        // 增强数据：添加格式化时间和分组标签
        const stories = (result.data.stories || []).map(s => ({
          ...s,
          displayTime: this._formatTime(s.updatedAt || s.createdAt),
          mbtiGroup: getMbtiGroup(s.mbti),
        }))
        this.setData({ stories, empty: stories.length === 0 })
      } else {
        wx.showToast({ title: '加载失败', icon: 'none' })
        this.setData({ empty: true })
      }
    } catch (err) {
      console.error('loadStories error:', err)
      wx.showToast({ title: '网络异常', icon: 'none' })
      this.setData({ empty: true })
    } finally {
      this.setData({ loading: false })
    }
  },

  // ----------------------------------------------------------
  //  点击故事 → 跳转 Story 详情页
  // ----------------------------------------------------------
  onStoryTap(e) {
    const sessionId = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/page/Story/Story?sessionId=' + sessionId })
  },

  // ----------------------------------------------------------
  //  工具：日期格式化 → "2025-03-15 14:30"
  // ----------------------------------------------------------
  _formatTime(date) {
    if (!date) return ''
    const d = new Date(date)
    const pad = n => (n < 10 ? '0' + n : '' + n)
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes())
  },
})