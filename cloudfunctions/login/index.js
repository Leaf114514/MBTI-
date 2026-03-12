// cloudfunctions/login/index.js
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const usersCollection = db.collection('users');

exports.main = async (event, context) => {
  try {
    const wxContext = cloud.getWXContext();
    const { OPENID, APPID, UNIONID } = wxContext;

    const userQueryResult = await usersCollection.where({
      openid: OPENID
    }).get();

    const now = new Date();

    if (userQueryResult.data.length > 0) {
      const existingUser = userQueryResult.data[0];

      await usersCollection.doc(existingUser._id).update({
        data: {
          lastLoginAt: now
        }
      });

      return {
        success: true,
        isNewUser: false,
        openid: OPENID,
        appid: APPID,
        unionid: UNIONID || null,
        user: {
          _id: existingUser._id,
          openid: existingUser.openid,
          profile: existingUser.profile || {
            nickName: '',
            avatarUrl: ''
          },
          createdAt: existingUser.createdAt,
          lastLoginAt: now
        }
      };
    }

    const addResult = await usersCollection.add({
      data: {
        openid: OPENID,
        createdAt: now,
        lastLoginAt: now,
        profile: {
          nickName: '',
          avatarUrl: ''
        }
      }
    });

    return {
      success: true,
      isNewUser: true,
      openid: OPENID,
      appid: APPID,
      unionid: UNIONID || null,
      user: {
        _id: addResult._id,
        openid: OPENID,
        profile: {
          nickName: '',
          avatarUrl: ''
        },
        createdAt: now,
        lastLoginAt: now
      }
    };
  } catch (error) {
    console.error('login cloud function error:', error);
    return {
      success: false,
      error: error.message || 'Unknown error'
    };
  }
};