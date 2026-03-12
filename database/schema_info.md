# 数据库集合定义 (Database Collections)

本项目使用了以下微信云开发数据库集合：

## 1. user_info (用户信息)

用于存储用户的基本信息，如姓名、生日和性别。

### 字段说明 (Fields)

| 字段名 | 类型 | 说明 |
| :--- | :--- | :--- |
| `_id` | `String` | 记录的唯一标识 (由云数据库自动生成) |
| `_openid` | `String` | 用户的微信唯一标识 (由云环境自动关联) |
| `name` | `String` | 用户名称 |
| `birthday` | `String` | 用户生日 (格式：YYYY-MM-DD) |
| `gender` | `String` | 用户性别 (如：male, female, other) |
| `createTime` | `Date` | 记录创建时间 |
| `updateTime` | `Date` | 记录最后修改时间 |

### 权限设置 (Permissions)

为了确保用户数据的隐私，建议在云开发控制台中对该集合进行如下权限配置：

- **权限策略**：所有者可读，仅创建者可读写
- **JSON 配置**：
```json
{
  "read": "auth.openid == doc._openid",
  "write": "auth.openid == doc._openid"
}
```

### 初始化数据 (Seed Data)

本地 `database/user_info.json` 文件包含了示例数据，可通过云开发控制台的“导入”功能进行导入测试。
