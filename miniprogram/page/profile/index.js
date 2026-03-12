Page({
  data: {
    userInfo: {
      nickName: '未登录',
      avatarUrl: '/image/user.png'
    },
    menuItems: [
      { id: 'history', title: '测试记录' },
      { id: 'settings', title: '设置' },
      { id: 'about', title: '关于我们' }
    ]
  },
  onLoad() {
    console.log('Profile page loaded');
  }
});
