
Page({
  data: {
    userInfo: null,
    isNewUser: false,
    loginStatus: '',
    message: 'Hello'
  },

  async handleLogin() {
    try {
      this.setData({
        loginStatus: 'Logging in...'
      });

      const res = await wx.cloud.callFunction({
        name: 'login'
      });

      const result = res.result;

      if (!result.success) {
        this.setData({
          loginStatus: 'Login failed'
        });
        console.error('Login failed:', result.error);
        return;
      }

      this.setData({
        userInfo: result.user,
        isNewUser: result.isNewUser,
        loginStatus: result.isNewUser ? 'New user created' : 'Welcome back'
      });

      console.log('Login success:', result);
    } catch (err) {
      console.error('Cloud function call failed:', err);
      this.setData({
        loginStatus: 'Cloud function call failed'
      });
    }
  }
});