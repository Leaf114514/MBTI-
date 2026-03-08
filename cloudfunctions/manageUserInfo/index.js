/**
 * 云函数：manageUserInfo
 * 功能：负责用户名称、生日、性别的保存、查询与修改
 * 原则：遵循高内聚低耦合 (High Cohesion, Low Coupling)
 */

const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const collectionName = 'user_info' // 对应本地 database/user_info.json 定义的集合

/**
 * ------------------------------------------------------------------
 * 1. 响应处理工具 (Response Utility)
 * 作用：统一全函数的输出格式，解耦业务逻辑与外部接口协议。
 * ------------------------------------------------------------------
 */
const response = {
  success: (data = null, msg = 'success') => ({
    success: true,
    data,
    msg,
    timestamp: new Date().getTime()
  }),
  fail: (msg = 'fail', error = null) => ({
    success: false,
    msg,
    error: error ? error.toString() : null,
    timestamp: new Date().getTime()
  })
}

/**
 * ------------------------------------------------------------------
 * 2. 数据访问层 (Data Access Layer - UserRepository)
 * 作用：高内聚。仅负责与云数据库进行底层的 CRUD 操作。
 * ------------------------------------------------------------------
 */
const UserRepository = {
  /**
   * 根据用户的 openid 查找记录
   */
  async findByOpenid(openid) {
    const res = await db.collection(collectionName).where({
      _openid: openid
    }).get()
    return res.data[0] || null
  },

  /**
   * 更新指定 ID 的用户记录
   */
  async updateById(id, updateData) {
    return await db.collection(collectionName).doc(id).update({
      data: {
        ...updateData,
        updateTime: db.serverDate() // 使用服务器时间
      }
    })
  },

  /**
   * 新增一条用户记录
   */
  async add(openid, userData) {
    return await db.collection(collectionName).add({
      data: {
        _openid: openid,
        ...userData,
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      }
    })
  }
}

/**
 * ------------------------------------------------------------------
 * 3. 业务逻辑层 (Business Logic Layer - UserService)
 * 作用：高内聚。负责业务规则校验、数据整合及流程控制。
 * ------------------------------------------------------------------
 */
const UserService = {
  /**
   * 获取用户资料
   */
  async getUserProfile(openid) {
    try {
      const user = await UserRepository.findByOpenid(openid)
      if (!user) {
        return response.success(null, 'User profile not found')
      }
      return response.success(user, 'User profile retrieved')
    } catch (err) {
      return response.fail('Database error during retrieval', err)
    }
  },

  /**
   * 保存或更新用户资料
   * 包含字段：name (名称), birthday (生日), gender (性别)
   */
  async saveUserProfile(openid, data) {
    const { name, birthday, gender } = data

    // 1. 业务校验：必填项检查
    if (!name || !birthday || !gender) {
      return response.fail('Validation failed: Missing required fields (name, birthday, or gender)')
    }

    try {
      // 2. 检查用户是否存在
      const existingUser = await UserRepository.findByOpenid(openid)

      if (existingUser) {
        // 3a. 逻辑：存在则执行局部更新
        await UserRepository.updateById(existingUser._id, { name, birthday, gender })
        return response.success(null, 'User profile updated successfully')
      } else {
        // 3b. 逻辑：不存在则新增记录
        await UserRepository.add(openid, { name, birthday, gender })
        return response.success(null, 'User profile created successfully')
      }
    } catch (err) {
      return response.fail('Database error during save/update', err)
    }
  }
}

/**
 * ------------------------------------------------------------------
 * 4. 控制器层 (Controller Layer - Entry Point)
 * 作用：低耦合。仅负责请求分发、上下文获取，不涉及具体业务。
 * ------------------------------------------------------------------
 */
exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { action, data } = event

  // 根据前端请求的 action 路由到对应的 Service 方法
  switch (action) {
    case 'get':
      return await UserService.getUserProfile(OPENID)
    case 'save':
      return await UserService.saveUserProfile(OPENID, data)
    default:
      return response.fail(`Invalid action: ${action}. Available: get, save`)
  }
}
