Page({
  data: {
    avatarUrl: '/image/default.png',// 储存头像
    userName: '',     // 储存名字
    gender: '',       // 储存性别
    tempBirthday: ''   ,//储存生日
  },


    // 页面加载时执行
    onLoad(options) {
      this.load_user_avatar();
      this.load_user_name();
      this.load_user_gender();
      this.load_user_birthday();
    },
  
    // 页面显示时重新读取（确保从profile返回后数据最新）
    onShow() {
      this.load_user_avatar();
      this.load_user_name();
      this.load_user_gender();
      this.load_user_birthday();
    },

//读取用户头像
  load_user_avatar() {
    const savedAvatar = wx.getStorageSync('user_avatar');
    if (savedAvatar) {
      this.setData({ avatarUrl: savedAvatar });
    }

  },
 //读取用户名字
  load_user_name() {
    const savedName = wx.getStorageSync('userName');
    this.setData({ userName: savedName || '' });
  },
 //读取用户性别
  load_user_gender() {
    const savedGender = wx.getStorageSync('userGender');
    if (savedGender) {
      this.setData({ gender: savedGender });
    }
  },

// 读取用户生日
 load_user_birthday() {
   const savedBirthday = wx.getStorageSync('userBirthday');
    if (savedBirthday) {
       this.setData({ 
        birthday: savedBirthday,
        tempBirthday: savedBirthday  });
     }
  },  
  


  goToProfile() {
    wx.navigateTo({ url: '/page/profile/profile' })
  }

});
