Page({
  data: {
    userInfo: null,
    isNewUser: false,
    loginStatus: '',
    message: '占位符，用于展示登入标语'
  },
  
  async handleWechatLogin() {
    try {
      this.setData({
        loginStatus: '登录中'
      });

      const res = await wx.cloud.callFunction({
        name: 'login'
      });

      const result = res.result;

      if (!result.success) {
        this.setData({
          loginStatus: '登录失败'
        });
        console.error('Login failed:', result.error);
        return;
      }

      this.setData({
        userInfo: result.user,
        isNewUser: result.isNewUser,
        loginStatus: result.isNewUser ? '已创建新用户' : '欢迎回来'
      });

      console.log('Login success:', result);

      wx.switchTab({
        url: '/page/home/index'
      });
    } catch (err) {
      console.error('Cloud function call failed:', err);
      this.setData({
        loginStatus: '云端服务获取失败'
      });
    }
  },

  async handleLogin() {
    try {
      this.setData({
        loginStatus: '登录中'
      });

      const res = await wx.cloud.callFunction({
        name: 'login'
      });

      const result = res.result;

      if (!result.success) {
        this.setData({
          loginStatus: '登录失败'
        });
        console.error('Login failed:', result.error);
        return;
      }

      this.setData({
        userInfo: result.user,
        isNewUser: result.isNewUser,
        loginStatus: result.isNewUser ? '已创建新用户' : '欢迎回来'
      });

      console.log('Login success:', result);

      wx.switchTab({
        url: '/page/home/index'
      });
    } catch (err) {
      console.error('Cloud function call failed:', err);
      this.setData({
        loginStatus: '云端服务获取失败'
      });
    }
  }
});