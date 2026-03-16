Page({
  data: {
    avatarUrl: '/image/default.png',// 储存头像
    userName: "",       //储存名字
    newName: "",        // 输入中的名字
    gender: '',       // 储存性别
    birthday: '',     // 储存生日
    tempBirthday: ''   ,//储存生日
    showModal: false,  // 控制性别弹窗是否显示
    showNameModal: false, // 控制名字弹窗是否显示
    showBirthModal: false // 控制生日弹窗是否显示
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
    if (savedName) {
      this.setData({ userName: savedName });
    }
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
        tempBirthday: savedBirthday // 同步到临时值，弹窗打开时默认显示
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
//名字输入弹窗
  show_name_input_modal() {
    this.setData({
      showNameModal: true,
      newName: this.data.userName 
    });
  },
 //监听输入框内容变化
 inputName(e) {
  this.setData({
    newName: e.detail.value
  });
},

  // 关闭名字弹窗
  hideModal() {
    this.setData({
      showNameModal: false,
      newName: this.data.userName
    });
  },

  // 保存名字
  confirm_modify_name() {
    const name = this.data.newName.trim();
    if (!name) {
      wx.showToast({
        title: '请输入名字',
        icon: 'none'
      });
      return;
    }
    if (name.length > 20) {
      wx.showToast({
        title: '名字最多15个字符',
        icon: 'none'
      });
      return;
    }

    this.setData({
      userName: name,
      newName: name,
      showNameModal: false
    });
    wx.setStorageSync('userName', name);
    wx.showToast({
      title: '名字设置成功',
      icon: 'success'
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
  },

 // 打开生日选择弹窗
 open_birthday_modal() {
  // 打开弹窗时，把当前生日赋值给临时值（避免选择后取消丢失原有值）
  this.setData({ 
    showBirthModal: true,
    tempBirthday: this.data.birthday 
  });
},

// 关闭生日弹窗（取消）
close_birthday_modal() {
  this.setData({ showBirthModal: false });
},

// 轮盘选择生日（临时保存）
on_birthday_change(e) {
  // e.detail.value 是选择的日期，格式 YYYY-MM-DD
  this.setData({ tempBirthday: e.detail.value });
},

// 确认生日选择
confirm_birthday() {
  const { tempBirthday } = this.data;
  if (!tempBirthday) {
    wx.showToast({
      title: '请选择生日',
      icon: 'none'
    });
    return;
  }

  // 保存到页面数据+缓存
  this.setData({
    birthday: tempBirthday,
    showBirthModal: false // 关闭弹窗
  });
  wx.setStorageSync('userBirthday', tempBirthday);

  // 提示保存成功
  wx.showToast({
    title: '生日设置成功',
    icon: 'success'
  });
},


});
