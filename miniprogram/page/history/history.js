const MBTI_GROUPS = {
  analyst:  ['INTJ', 'INTP', 'ENTJ', 'ENTP'],
  diplomat: ['INFJ', 'INFP', 'ENFJ', 'ENFP'],
  sentinel: ['ISTJ', 'ISFJ', 'ESTJ', 'ESFJ'],
  explorer: ['ISTP', 'ISFP', 'ESTP', 'ESFP'],
}

function getMbtiGroup(mbti) {
  const upper = (mbti || '').toUpperCase()
  for (const [group, types] of Object.entries(MBTI_GROUPS)) {
    if (types.includes(upper)) return group
  }
  return 'analyst'
}

Page({
  data: {
    stories: [],
    loading: true,
    empty: false,
  },

  onLoad() {
    this.loadStories()
  },

  async loadStories() {
    this.setData({ loading: true, empty: false })
    try {
      const res = await wx.cloud.callFunction({
        name: 'getStoryHistory',
        data: { page: 1, pageSize: 50 },
      })
      const result = res.result
      if (result.success) {
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

  onStoryTap(e) {
    const sessionId = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/page/Story/Story?sessionId=' + sessionId })
  },

  _formatTime(date) {
    if (!date) return ''
    const d = new Date(date)
    const pad = n => (n < 10 ? '0' + n : '' + n)
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes())
  },
})
