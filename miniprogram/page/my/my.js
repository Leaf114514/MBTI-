Page({
  data: {
    avatarUrl: '/image/default.png',
    gender: '',       // 储存性别
    showModal: false  // 控制弹窗是否显示
  },
  //运行页面时读取内容 详细部分已备注（因为没办法写成多个函数）
  onLoad(options) {
    // 1. 读取已保存的头像
    const savedAvatar = wx.getStorageSync('user_avatar');
    if (savedAvatar) {
      this.setData({
        avatarUrl: savedAvatar
      });
    }
  
    // 2. 读取已保存的性别
    const savedGender = wx.getStorageSync('userGender');
    if (savedGender) {
      this.setData({
        gender: savedGender
      });
    }
  },

 //编辑器版本不够说是，不能直接
  //按下头像按钮触发的方法触发get_wechat_avatar事件
  change_avatar() {
    wx.showModal({
      title: '提示',
      content: '是否要更换头像？',
      success: (res) => {
        if (res.confirm) {
          this.get_wechat_avatar();
        }
      }
    });
  },

//更换头像逻辑 记录头像本地路径并替换 AI写的我看没什么问题
get_wechat_avatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        this.setData({ avatarUrl: tempFilePath });
        wx.setStorageSync('user_avatar', tempFilePath);
        wx.showToast({ title: '头像更新成功', icon: 'success' });
      },
      fail: (err) => {
        console.error(err);
        wx.showToast({ title: '获取头像失败', icon: 'error' });
      }
    });
  },

  // 打开性别选择弹窗
  open_gender_modal() {
    this.setData({
      showModal: true
    });
  },

  // 关闭弹窗
  close_gender_modal() {
    this.setData({
      showModal: false
    });
  },

  // 选择男/女
  choose_gender(e) {
    const gender = e.currentTarget.dataset.gender;
    this.setData({
      gender,
      showModal: false 
    });
    wx.setStorageSync('userGender', gender);
    wx.showToast({
      title: `已选择${gender}`,
      icon: 'success'
    });
  },

  // 清空选择（我这里很暴力的全部删掉了，不知道有没有副作用（x））
  clear_gender() {
    this.setData({
      gender: '',
      showModal: false
    });
    // 清除本地缓存
    wx.removeStorageSync('userGender');
    wx.showToast({
      title: '已重置为未设置',
      icon: 'success'
    });
  }



});