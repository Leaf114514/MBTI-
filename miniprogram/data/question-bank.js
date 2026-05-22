/**
 * 题库管理与两层随机抽取服务
 * 职责：管理 MBTI 场景题库，提供两层随机抽取
 * 不涉及：用户数据、API调用、UI
 */

const QUESTIONS = [
  // ===== 日常生活场景 =====
  { id: 'q1', question: '早晨醒来，发现天气糟糕，你会怎么做？', options: [
    { key: 'A', text: '按原计划出门，风雨无阻' }, { key: 'B', text: '临时调整日程安排' },
    { key: 'C', text: '取消所有安排，在家休息' }, { key: 'D', text: '先查天气预报再决定' }
  ]},
  { id: 'q2', question: '你在咖啡店等朋友，对方迟到了30分钟，你会？', options: [
    { key: 'A', text: '安静地看书或刷手机' }, { key: 'B', text: '主动联系朋友问情况' },
    { key: 'C', text: '和旁边的陌生人聊天' }, { key: 'D', text: '心里不满但不说出来' }
  ]},
  { id: 'q3', question: '周末突然多了一天空闲，你最想？', options: [
    { key: 'A', text: '宅在家看电影打游戏' }, { key: 'B', text: '约朋友出去玩' },
    { key: 'C', text: '去图书馆或博物馆' }, { key: 'D', text: '尝试一个新的兴趣爱好' }
  ]},
  { id: 'q4', question: '排队时前面有人插队，你会？', options: [
    { key: 'A', text: '直接上前理论' }, { key: 'B', text: '小声嘟囔表达不满' },
    { key: 'C', text: '默默忍受' }, { key: 'D', text: '礼貌地提醒对方' }
  ]},
  { id: 'q5', question: '你在超市购物时，发现钱包忘带了，你会？', options: [
    { key: 'A', text: '冷静地用手机支付' }, { key: 'B', text: '先放下东西回去拿' },
    { key: 'C', text: '问身边人能否借用一下' }, { key: 'D', text: '觉得很尴尬，想赶紧离开' }
  ]},
  // ===== 社交场景 =====
  { id: 'q6', question: '参加一个大部分人你都不认识的聚会，你会？', options: [
    { key: 'A', text: '主动和不认识的人搭话' }, { key: 'B', text: '找到认识的人待在一起' },
    { key: 'C', text: '安静地观察周围' }, { key: 'D', text: '找个借口提前离开' }
  ]},
  { id: 'q7', question: '朋友向你倾诉烦恼，你的第一反应是？', options: [
    { key: 'A', text: '帮他分析问题并提建议' }, { key: 'B', text: '认真倾听并表达同情' },
    { key: 'C', text: '讲个笑话逗他开心' }, { key: 'D', text: '陪他一起骂造成问题的人' }
  ]},
  { id: 'q8', question: '你和朋友意见不同时，通常会？', options: [
    { key: 'A', text: '据理力争直到说服对方' }, { key: 'B', text: '各自保留意见' },
    { key: 'C', text: '试着站在对方角度思考' }, { key: 'D', text: '表面妥协心里不服' }
  ]},
  { id: 'q9', question: '收到一条群发的节日祝福短信，你会？', options: [
    { key: 'A', text: '无视，不回复' }, { key: 'B', text: '简单回一句"同乐"' },
    { key: 'C', text: '编写一段个性化的回复' }, { key: 'D', text: '也群发一条回去' }
  ]},
  { id: 'q10', question: '朋友突然问你"你觉得我这个人怎么样？"你会？', options: [
    { key: 'A', text: '直接说出真实想法' }, { key: 'B', text: '只说优点避免伤害' },
    { key: 'C', text: '反问"为什么突然这么问"' }, { key: 'D', text: '委婉地给出平衡评价' }
  ]},
  // ===== 工作学习场景 =====
  { id: 'q11', question: '面对一个全新且复杂的项目，你的第一步是？', options: [
    { key: 'A', text: '先制定详细的计划' }, { key: 'B', text: '先动手试试看' },
    { key: 'C', text: '查找相关资料研究' }, { key: 'D', text: '找有经验的人请教' }
  ]},
  { id: 'q12', question: '开会时你发现领导的方案有明显问题，你会？', options: [
    { key: 'A', text: '当场提出自己的看法' }, { key: 'B', text: '会后私下和领导沟通' },
    { key: 'C', text: '先执行再看效果' }, { key: 'D', text: '和同事商量后集体反馈' }
  ]},
  { id: 'q13', question: '工作中遇到瓶颈，你倾向于？', options: [
    { key: 'A', text: '一个人闷头想办法' }, { key: 'B', text: '找团队一起头脑风暴' },
    { key: 'C', text: '暂时放下做别的事' }, { key: 'D', text: '上网搜索解决方案' }
  ]},
  { id: 'q14', question: '同事在你忙的时候请你帮忙，你会？', options: [
    { key: 'A', text: '直接拒绝，说明自己也很忙' }, { key: 'B', text: '先忙完自己的再帮' },
    { key: 'C', text: '放下手头工作先帮他' }, { key: 'D', text: '不太好意思拒绝，勉强答应' }
  ]},
  { id: 'q15', question: '你更喜欢什么样的工作方式？', options: [
    { key: 'A', text: '独自在安静环境中完成' }, { key: 'B', text: '和团队密切协作' },
    { key: 'C', text: '有明确的流程和规范' }, { key: 'D', text: '自由灵活，没有太多约束' }
  ]},
  // ===== 决策与选择场景 =====
  { id: 'q16', question: '买东西时你更看重什么？', options: [
    { key: 'A', text: '性价比和实用性' }, { key: 'B', text: '品牌和品质' },
    { key: 'C', text: '外观和设计感' }, { key: 'D', text: '朋友或网上的推荐' }
  ]},
  { id: 'q17', question: '面对一道很难的选择题，你会怎么做？', options: [
    { key: 'A', text: '用逻辑推理排除错误选项' }, { key: 'B', text: '跟着直觉走' },
    { key: 'C', text: '反复纠结很久' }, { key: 'D', text: '随便选一个不浪费时间' }
  ]},
  { id: 'q18', question: '你需要做一个重要决定时，最依赖什么？', options: [
    { key: 'A', text: '客观数据和事实分析' }, { key: 'B', text: '自己的直觉和感受' },
    { key: 'C', text: '咨询身边人的意见' }, { key: 'D', text: '参考过去的经验' }
  ]},
  { id: 'q19', question: '如果可以选择超能力，你最想要？', options: [
    { key: 'A', text: '读心术，了解他人想法' }, { key: 'B', text: '时间暂停，多一些自己的时间' },
    { key: 'C', text: '瞬间移动，去任何想去的地方' }, { key: 'D', text: '预知未来，提前做准备' }
  ]},
  { id: 'q20', question: '人生中最让你恐惧的是？', options: [
    { key: 'A', text: '失去控制和自主权' }, { key: 'B', text: '被人误解和孤立' },
    { key: 'C', text: '碌碌无为浪费时间' }, { key: 'D', text: '辜负了重要的人' }
  ]},
  // ===== 情绪与压力场景 =====
  { id: 'q21', question: '压力很大时，你最可能的解压方式是？', options: [
    { key: 'A', text: '运动或户外活动' }, { key: 'B', text: '独处听音乐或看书' },
    { key: 'C', text: '找朋友聊天倾诉' }, { key: 'D', text: '吃美食犒劳自己' }
  ]},
  { id: 'q22', question: '被批评时，你的内心反应是？', options: [
    { key: 'A', text: '先反思自己是否真的有问题' }, { key: 'B', text: '心里不服，想反驳' },
    { key: 'C', text: '感到难过和受伤' }, { key: 'D', text: '无所谓，过了就忘' }
  ]},
  { id: 'q23', question: '半夜突然睡不着，你会做什么？', options: [
    { key: 'A', text: '闭眼强迫自己睡' }, { key: 'B', text: '起来看书或工作' },
    { key: 'C', text: '刷手机直到困了' }, { key: 'D', text: '想很多事情或写日记' }
  ]},
  { id: 'q24', question: '看一部电影时，你更关注？', options: [
    { key: 'A', text: '剧情逻辑是否合理' }, { key: 'B', text: '角色情感是否打动人' },
    { key: 'C', text: '画面和音乐的视听效果' }, { key: 'D', text: '故事传递的深层含义' }
  ]},
  { id: 'q25', question: '遇到不公平的事情，你的反应是？', options: [
    { key: 'A', text: '站出来为弱者说话' }, { key: 'B', text: '心里愤怒但保持克制' },
    { key: 'C', text: '通过合理渠道反映' }, { key: 'D', text: '觉得社会就是这样，无奈接受' }
  ]},
  // ===== 旅行与冒险场景 =====
  { id: 'q26', question: '去一个陌生城市旅行，你会怎么安排？', options: [
    { key: 'A', text: '提前做好详细攻略' }, { key: 'B', text: '大致规划，保留灵活性' },
    { key: 'C', text: '完全不做计划，随心走' }, { key: 'D', text: '跟着当地人推荐走' }
  ]},
  { id: 'q27', question: '旅途中迷路了，你会？', options: [
    { key: 'A', text: '打开地图导航找路' }, { key: 'B', text: '问路边的人' },
    { key: 'C', text: '把迷路当作一种探险' }, { key: 'D', text: '原路返回到熟悉的地方' }
  ]},
  { id: 'q28', question: '你更喜欢哪种旅行方式？', options: [
    { key: 'A', text: '一个人安静地旅行' }, { key: 'B', text: '和好朋友结伴同行' },
    { key: 'C', text: '参加旅行团省心省力' }, { key: 'D', text: '和陌生驴友拼团' }
  ]},
  { id: 'q29', question: '在异国餐厅看到完全看不懂的菜单，你会？', options: [
    { key: 'A', text: '随便点一个碰碰运气' }, { key: 'B', text: '用翻译软件一个一个查' },
    { key: 'C', text: '看别人点什么就点什么' }, { key: 'D', text: '找服务员推荐' }
  ]},
  { id: 'q30', question: '有一次免费蹦极的机会，你会？', options: [
    { key: 'A', text: '毫不犹豫地跳' }, { key: 'B', text: '犹豫很久但最终尝试' },
    { key: 'C', text: '在旁边看看就好' }, { key: 'D', text: '坚决不参加' }
  ]},
  // ===== 人际关系场景 =====
  { id: 'q31', question: '发现好朋友在背后说你坏话，你会？', options: [
    { key: 'A', text: '直接找他对质' }, { key: 'B', text: '默默疏远这个人' },
    { key: 'C', text: '假装不知道继续相处' }, { key: 'D', text: '反思自己是否哪里做得不好' }
  ]},
  { id: 'q32', question: '别人给你介绍对象，你的态度是？', options: [
    { key: 'A', text: '先了解基本情况再决定' }, { key: 'B', text: '直接见面聊聊再说' },
    { key: 'C', text: '委婉拒绝，更相信缘分' }, { key: 'D', text: '来者不拒，多认识人也好' }
  ]},
  { id: 'q33', question: '看到路边有人摔倒，你会？', options: [
    { key: 'A', text: '立刻上前帮忙' }, { key: 'B', text: '先观察一下情况再决定' },
    { key: 'C', text: '拨打急救电话' }, { key: 'D', text: '担心是碰瓷所以绕开' }
  ]},
  { id: 'q34', question: '室友/舍友的作息和你完全相反，你会？', options: [
    { key: 'A', text: '好好沟通制定规矩' }, { key: 'B', text: '自己戴耳塞适应' },
    { key: 'C', text: '忍受但内心不满' }, { key: 'D', text: '申请换房间' }
  ]},
  { id: 'q35', question: '过年亲戚问你一些隐私问题，你会？', options: [
    { key: 'A', text: '礼貌但坚定地转移话题' }, { key: 'B', text: '开玩笑带过去' },
    { key: 'C', text: '老实回答' }, { key: 'D', text: '反问对方同样的问题' }
  ]},
  // ===== 理想与未来场景 =====
  { id: 'q36', question: '如果有一年不用工作的时间，你最想做什么？', options: [
    { key: 'A', text: '环游世界' }, { key: 'B', text: '学一项新技能' },
    { key: 'C', text: '在家躺平享受生活' }, { key: 'D', text: '做公益或志愿者' }
  ]},
  { id: 'q37', question: '你理想的居住环境是？', options: [
    { key: 'A', text: '繁华都市中心' }, { key: 'B', text: '安静的郊区小屋' },
    { key: 'C', text: '热闹的大学城附近' }, { key: 'D', text: '世外桃源般的乡村' }
  ]},
  { id: 'q38', question: '成功对你来说意味着什么？', options: [
    { key: 'A', text: '实现财务自由' }, { key: 'B', text: '做自己热爱的事' },
    { key: 'C', text: '获得他人的认可和尊重' }, { key: 'D', text: '家人幸福健康' }
  ]},
  { id: 'q39', question: '你希望别人怎样评价你？', options: [
    { key: 'A', text: '聪明能干' }, { key: 'B', text: '善良温暖' },
    { key: 'C', text: '有趣好玩' }, { key: 'D', text: '靠谱可信' }
  ]},
  { id: 'q40', question: '如果能给过去的自己写一封信，你会说什么？', options: [
    { key: 'A', text: '别太在意别人的看法' }, { key: 'B', text: '勇敢去做想做的事' },
    { key: 'C', text: '好好珍惜身边的人' }, { key: 'D', text: '多学点东西别浪费时间' }
  ]},
  // ===== 突发事件场景 =====
  { id: 'q41', question: '地铁突然停电了，车厢一片漆黑，你会？', options: [
    { key: 'A', text: '打开手机手电筒照明' }, { key: 'B', text: '安静等待恢复' },
    { key: 'C', text: '和旁边的人搭话缓解紧张' }, { key: 'D', text: '感到焦虑不安' }
  ]},
  { id: 'q42', question: '走在路上突然下暴雨，没带伞，你会？', options: [
    { key: 'A', text: '冲进雨里跑向目的地' }, { key: 'B', text: '找个地方避雨等停' },
    { key: 'C', text: '打车或叫外卖送伞' }, { key: 'D', text: '享受淋雨的感觉' }
  ]},
  { id: 'q43', question: '手机突然掉进水里了，你的反应是？', options: [
    { key: 'A', text: '赶紧捞出来想办法救' }, { key: 'B', text: '冷静分析数据备份情况' },
    { key: 'C', text: '觉得正好可以断网休息' }, { key: 'D', text: '心态崩了，很焦虑' }
  ]},
  { id: 'q44', question: '半夜被门外的奇怪声音吵醒，你会？', options: [
    { key: 'A', text: '起来查看是什么' }, { key: 'B', text: '先看看监控或从猫眼看' },
    { key: 'C', text: '蒙头继续睡' }, { key: 'D', text: '报警或通知物业' }
  ]},
  { id: 'q45', question: '在商场电梯突然被困住了，你会？', options: [
    { key: 'A', text: '按紧急按钮求救' }, { key: 'B', text: '冷静等待救援' },
    { key: 'C', text: '尝试自己想办法出去' }, { key: 'D', text: '感到恐慌，大声呼救' }
  ]},
  // ===== 消费与生活方式场景 =====
  { id: 'q46', question: '发了工资/生活费后，你首先会？', options: [
    { key: 'A', text: '先存一部分到储蓄' }, { key: 'B', text: '买一直想买的东西奖励自己' },
    { key: 'C', text: '请朋友吃饭' }, { key: 'D', text: '没特别规划，花到哪算哪' }
  ]},
  { id: 'q47', question: '看到喜欢但价格超预算的东西，你会？', options: [
    { key: 'A', text: '果断入手，及时行乐' }, { key: 'B', text: '克制住，等打折再买' },
    { key: 'C', text: '找平替代品' }, { key: 'D', text: '纠结半天最终还是买了' }
  ]},
  { id: 'q48', question: '你的房间通常是什么状态？', options: [
    { key: 'A', text: '井井有条，东西都有固定位置' }, { key: 'B', text: '看着乱但我能找到东西' },
    { key: 'C', text: '定期收拾但很快又乱' }, { key: 'D', text: '说不清楚，看心情' }
  ]},
  { id: 'q49', question: '你更喜欢哪种运动方式？', options: [
    { key: 'A', text: '独自跑步或健身' }, { key: 'B', text: '团队球类运动' },
    { key: 'C', text: '瑜伽冥想等身心运动' }, { key: 'D', text: '不太喜欢运动' }
  ]},
  { id: 'q50', question: '做饭时你更偏向？', options: [
    { key: 'A', text: '严格按食谱来' }, { key: 'B', text: '随手创新搭配' },
    { key: 'C', text: '喜欢做但怕麻烦' }, { key: 'D', text: '能不做就不做' }
  ]},
  // ===== 沟通方式场景 =====
  { id: 'q51', question: '你更喜欢哪种沟通方式？', options: [
    { key: 'A', text: '面对面聊天' }, { key: 'B', text: '发文字消息' },
    { key: 'C', text: '打语音/视频电话' }, { key: 'D', text: '看情况选择' }
  ]},
  { id: 'q52', question: '和别人聊天时，你更擅长？', options: [
    { key: 'A', text: '讲笑话活跃气氛' }, { key: 'B', text: '认真倾听并提问' },
    { key: 'C', text: '分享自己的故事' }, { key: 'D', text: '讨论深度话题' }
  ]},
  { id: 'q53', question: '发微信朋友圈时，你通常？', options: [
    { key: 'A', text: '经常发，分享日常' }, { key: 'B', text: '偶尔发，精心编辑' },
    { key: 'C', text: '几乎不发，默默围观' }, { key: 'D', text: '只设置三天可见' }
  ]},
  { id: 'q54', question: '遇到不想回的消息，你会？', options: [
    { key: 'A', text: '礼貌简短地回复' }, { key: 'B', text: '假装没看到' },
    { key: 'C', text: '过很久才回' }, { key: 'D', text: '直接告诉对方不方便' }
  ]},
  { id: 'q55', question: '演讲或做报告前，你通常会？', options: [
    { key: 'A', text: '精心准备反复练习' }, { key: 'B', text: '准备大纲临场发挥' },
    { key: 'C', text: '紧张到想逃避' }, { key: 'D', text: '期待展示自己的机会' }
  ]},
  // ===== 学习方式场景 =====
  { id: 'q56', question: '学一门新技能时，你更喜欢？', options: [
    { key: 'A', text: '看教程按步骤学' }, { key: 'B', text: '直接上手边做边学' },
    { key: 'C', text: '找老师或前辈带着学' }, { key: 'D', text: '先了解全貌再开始' }
  ]},
  { id: 'q57', question: '考试前你的复习方式通常是？', options: [
    { key: 'A', text: '制定计划提前复习' }, { key: 'B', text: '考前突击临时抱佛脚' },
    { key: 'C', text: '和同学一起复习讨论' }, { key: 'D', text: '佛系应考，随缘' }
  ]},
  { id: 'q58', question: '看到一个有争议的观点，你会？', options: [
    { key: 'A', text: '查资料验证真假' }, { key: 'B', text: '参与讨论发表看法' },
    { key: 'C', text: '看看评论区怎么说' }, { key: 'D', text: '觉得有道理就信了' }
  ]},
  { id: 'q59', question: '你更喜欢哪种学习环境？', options: [
    { key: 'A', text: '安静的图书馆' }, { key: 'B', text: '有轻音乐的咖啡店' },
    { key: 'C', text: '自己的房间' }, { key: 'D', text: '哪里都行，看心情' }
  ]},
  { id: 'q60', question: '老师/领导安排了一个你不擅长的任务，你会？', options: [
    { key: 'A', text: '迎难而上当作挑战' }, { key: 'B', text: '尝试找人交换任务' },
    { key: 'C', text: '硬着头皮做但很焦虑' }, { key: 'D', text: '诚实说明情况建议换人' }
  ]},
  // ===== 价值观场景 =====
  { id: 'q61', question: '你认为最重要的品质是？', options: [
    { key: 'A', text: '诚实正直' }, { key: 'B', text: '善良有同理心' },
    { key: 'C', text: '勇敢果断' }, { key: 'D', text: '聪明有智慧' }
  ]},
  { id: 'q62', question: '如果拥有1000万，你最想做什么？', options: [
    { key: 'A', text: '投资创业' }, { key: 'B', text: '环游世界' },
    { key: 'C', text: '给家人更好的生活' }, { key: 'D', text: '做慈善回馈社会' }
  ]},
  { id: 'q63', question: '你更欣赏哪种人？', options: [
    { key: 'A', text: '雷厉风行的行动派' }, { key: 'B', text: '深思熟虑的思考者' },
    { key: 'C', text: '善解人意的共情者' }, { key: 'D', text: '天马行空的创意者' }
  ]},
  { id: 'q64', question: '对待规则和制度，你的态度是？', options: [
    { key: 'A', text: '严格遵守是基本' }, { key: 'B', text: '合理的遵守，不合理的灵活处理' },
    { key: 'C', text: '觉得很多规则没必要' }, { key: 'D', text: '看违反后果决定' }
  ]},
  { id: 'q65', question: '你觉得幸福感来源于？', options: [
    { key: 'A', text: '完成目标的成就感' }, { key: 'B', text: '亲密关系的温暖' },
    { key: 'C', text: '自由自在的生活' }, { key: 'D', text: '被需要被认可的感觉' }
  ]},
  // ===== 日常偏好场景 =====
  { id: 'q66', question: '你更喜欢什么样的音乐？', options: [
    { key: 'A', text: '安静舒缓的纯音乐' }, { key: 'B', text: '节奏感强的流行歌' },
    { key: 'C', text: '有深意的民谣' }, { key: 'D', text: '什么都听看心情' }
  ]},
  { id: 'q67', question: '选择手机壳时，你会选？', options: [
    { key: 'A', text: '简约纯色款' }, { key: 'B', text: '可爱有趣图案款' },
    { key: 'C', text: '功能性强的防摔款' }, { key: 'D', text: '不用手机壳' }
  ]},
  { id: 'q68', question: '你更喜欢哪种宠物？', options: [
    { key: 'A', text: '忠诚活泼的狗' }, { key: 'B', text: '独立高冷的猫' },
    { key: 'C', text: '不需要太多陪伴的小动物' }, { key: 'D', text: '不想养宠物' }
  ]},
  { id: 'q69', question: '你理想的约会方式是？', options: [
    { key: 'A', text: '安静的餐厅吃饭聊天' }, { key: 'B', text: '看电影或看展' },
    { key: 'C', text: '户外运动或冒险活动' }, { key: 'D', text: '宅在家一起做饭看剧' }
  ]},
  { id: 'q70', question: '你最不能忍受的是？', options: [
    { key: 'A', text: '效率低下拖泥带水' }, { key: 'B', text: '虚伪做作不真诚' },
    { key: 'C', text: '无聊重复的事情' }, { key: 'D', text: '不公平不讲道理' }
  ]},
  // ===== 假设场景 =====
  { id: 'q71', question: '如果穿越到古代，你最想成为？', options: [
    { key: 'A', text: '运筹帷幄的谋士' }, { key: 'B', text: '行侠仗义的侠客' },
    { key: 'C', text: '吟诗作赋的文人' }, { key: 'D', text: '富甲一方的商人' }
  ]},
  { id: 'q72', question: '如果世界末日只能带三样东西，你会选？', options: [
    { key: 'A', text: '实用的工具和食物' }, { key: 'B', text: '一本书和笔' },
    { key: 'C', text: '通讯设备联系家人' }, { key: 'D', text: '不带什么，随遇而安' }
  ]},
  { id: 'q73', question: '你是班级/公司的领导，遇到团队冲突你会？', options: [
    { key: 'A', text: '公平调查后做出裁决' }, { key: 'B', text: '分别找两方谈话化解' },
    { key: 'C', text: '让他们自己解决' }, { key: 'D', text: '组织团建增进感情' }
  ]},
  { id: 'q74', question: '如果发现了一个从未有人发现的小岛，你会？', options: [
    { key: 'A', text: '系统探索和记录' }, { key: 'B', text: '在这里建一个小屋生活' },
    { key: 'C', text: '拍照分享给全世界' }, { key: 'D', text: '保密享受独有的秘境' }
  ]},
  { id: 'q75', question: '如果能和任何一个历史人物对话，你会选？', options: [
    { key: 'A', text: '伟大的科学家（如爱因斯坦）' }, { key: 'B', text: '传奇的艺术家（如达芬奇）' },
    { key: 'C', text: '影响深远的思想家（如孔子）' }, { key: 'D', text: '开拓未知的探险家（如哥伦布）' }
  ]},
  // ===== 生活态度场景 =====
  { id: 'q76', question: '你觉得"及时行乐"还是"未雨绸缪"更重要？', options: [
    { key: 'A', text: '活在当下最重要' }, { key: 'B', text: '为未来做准备更明智' },
    { key: 'C', text: '两者需要平衡' }, { key: 'D', text: '看具体情况' }
  ]},
  { id: 'q77', question: '你怎么看待"吃亏是福"这句话？', options: [
    { key: 'A', text: '完全同意，心态好最重要' }, { key: 'B', text: '不同意，该争取要争取' },
    { key: 'C', text: '看什么事情' }, { key: 'D', text: '嘴上不说心里明白' }
  ]},
  { id: 'q78', question: '面对一件很想做但很难的事，你更可能？', options: [
    { key: 'A', text: '立刻开始行动' }, { key: 'B', text: '先观望再说' },
    { key: 'C', text: '制定计划一步步来' }, { key: 'D', text: '放弃，做更容易的事' }
  ]},
  { id: 'q79', question: '你通常对变化的态度是？', options: [
    { key: 'A', text: '欢迎变化，喜欢新鲜感' }, { key: 'B', text: '适应能力强但更喜欢稳定' },
    { key: 'C', text: '讨厌变化，喜欢一切按计划来' }, { key: 'D', text: '看变化的内容和影响' }
  ]},
  { id: 'q80', question: '你觉得独处的时光？', options: [
    { key: 'A', text: '是最享受的充电时刻' }, { key: 'B', text: '偶尔享受但不能太久' },
    { key: 'C', text: '会感到无聊寂寞' }, { key: 'D', text: '看有没有有趣的事做' }
  ]},
  // ===== 创意与表达场景 =====
  { id: 'q81', question: '如果有人请你画一幅画，你会画？', options: [
    { key: 'A', text: '精确写实的风景' }, { key: 'B', text: '天马行空的抽象画' },
    { key: 'C', text: '温暖的人物肖像' }, { key: 'D', text: '表达不了，画画不行' }
  ]},
  { id: 'q82', question: '你写作或表达时更注重？', options: [
    { key: 'A', text: '逻辑清晰条理分明' }, { key: 'B', text: '文字优美有感染力' },
    { key: 'C', text: '简洁有力直达重点' }, { key: 'D', text: '幽默有趣吸引注意' }
  ]},
  { id: 'q83', question: '如果要做一个自媒体，你会选什么方向？', options: [
    { key: 'A', text: '知识科普类' }, { key: 'B', text: '日常生活vlog' },
    { key: 'C', text: '搞笑创意内容' }, { key: 'D', text: '深度评论观点类' }
  ]},
  { id: 'q84', question: '你玩游戏时更喜欢？', options: [
    { key: 'A', text: '策略类游戏' }, { key: 'B', text: '冒险探索类' },
    { key: 'C', text: '和朋友一起的多人游戏' }, { key: 'D', text: '休闲放松类小游戏' }
  ]},
  { id: 'q85', question: '给你一天自由创作时间，你最想做？', options: [
    { key: 'A', text: '写小说或故事' }, { key: 'B', text: '画画或做手工' },
    { key: 'C', text: '编曲或录音' }, { key: 'D', text: '拍一个短视频' }
  ]},
  // ===== 团队与竞争场景 =====
  { id: 'q86', question: '在团队合作中你更倾向扮演什么角色？', options: [
    { key: 'A', text: '领导者，统筹全局' }, { key: 'B', text: '执行者，埋头做事' },
    { key: 'C', text: '创意者，提供想法' }, { key: 'D', text: '协调者，调和关系' }
  ]},
  { id: 'q87', question: '参加竞赛或比拼，你的心态是？', options: [
    { key: 'A', text: '志在必得全力以赴' }, { key: 'B', text: '重在参与享受过程' },
    { key: 'C', text: '低调准备不让别人知道' }, { key: 'D', text: '有点紧张但还是想试试' }
  ]},
  { id: 'q88', question: '团队讨论中别人否定了你的想法，你会？', options: [
    { key: 'A', text: '详细解释争取支持' }, { key: 'B', text: '接受并参考别人的想法' },
    { key: 'C', text: '坚持己见不妥协' }, { key: 'D', text: '心里不舒服但不表现' }
  ]},
  { id: 'q89', question: '你更希望被分配到什么样的任务？', options: [
    { key: 'A', text: '有挑战性的核心任务' }, { key: 'B', text: '力所能及的常规任务' },
    { key: 'C', text: '需要创意的新型任务' }, { key: 'D', text: '需要与人沟通协调的任务' }
  ]},
  { id: 'q90', question: '看到同事/同学比自己优秀，你的感受？', options: [
    { key: 'A', text: '激励自己更努力' }, { key: 'B', text: '由衷地为他们高兴' },
    { key: 'C', text: '有些嫉妒但能控制' }, { key: 'D', text: '没什么感觉，走自己的路' }
  ]},
  // ===== 生活细节场景 =====
  { id: 'q91', question: '你吃自助餐时的策略是？', options: [
    { key: 'A', text: '先转一圈看看有什么再拿' }, { key: 'B', text: '直奔最贵的食物' },
    { key: 'C', text: '每样都尝一点' }, { key: 'D', text: '只拿自己喜欢的' }
  ]},
  { id: 'q92', question: '你收到一个意外的快递，会？', options: [
    { key: 'A', text: '立刻兴奋地拆开' }, { key: 'B', text: '先确认是谁寄的' },
    { key: 'C', text: '放一会儿才拆' }, { key: 'D', text: '小心翼翼地打开' }
  ]},
  { id: 'q93', question: '坐长途飞机/火车，你通常会？', options: [
    { key: 'A', text: '看书或看电影' }, { key: 'B', text: '睡觉' },
    { key: 'C', text: '和邻座聊天' }, { key: 'D', text: '看窗外风景发呆' }
  ]},
  { id: 'q94', question: '你手机里最多的 App 类型是？', options: [
    { key: 'A', text: '社交通讯类' }, { key: 'B', text: '新闻学习类' },
    { key: 'C', text: '娱乐游戏类' }, { key: 'D', text: '工具效率类' }
  ]},
  { id: 'q95', question: '朋友送了你一个不喜欢的礼物，你会？', options: [
    { key: 'A', text: '高兴收下并真心感谢' }, { key: 'B', text: '收下但暗示自己的喜好' },
    { key: 'C', text: '直接说不太喜欢' }, { key: 'D', text: '收下后转送别人' }
  ]},
  // ===== 思维方式场景 =====
  { id: 'q96', question: '你做事情的风格更像？', options: [
    { key: 'A', text: '三思而后行' }, { key: 'B', text: '先做了再说' },
    { key: 'C', text: '边做边调整' }, { key: 'D', text: '看心情决定' }
  ]},
  { id: 'q97', question: '你更相信哪个？', options: [
    { key: 'A', text: '数据和证据' }, { key: 'B', text: '直觉和第六感' },
    { key: 'C', text: '经验和常识' }, { key: 'D', text: '权威人士的判断' }
  ]},
  { id: 'q98', question: '遇到一个复杂问题，你倾向于？', options: [
    { key: 'A', text: '拆解成小问题逐个击破' }, { key: 'B', text: '从全局视角寻找根本原因' },
    { key: 'C', text: '试错法不断尝试' }, { key: 'D', text: '请教有经验的人' }
  ]},
  { id: 'q99', question: '你平时更容易注意到？', options: [
    { key: 'A', text: '整体氛围和大方向' }, { key: 'B', text: '具体细节和数字' },
    { key: 'C', text: '人们的情绪和表情' }, { key: 'D', text: '潜在的可能性和机会' }
  ]},
  { id: 'q100', question: '你更倾向于做完再说还是想好再做？', options: [
    { key: 'A', text: '一定要想清楚再动手' }, { key: 'B', text: '先做一个原型再迭代' },
    { key: 'C', text: '看事情的重要程度' }, { key: 'D', text: '随缘，看当时的状态' }
  ]},
  // ===== 额外补充场景 =====
  { id: 'q101', question: '你去餐厅点菜通常是？', options: [
    { key: 'A', text: '总是点自己熟悉的' }, { key: 'B', text: '喜欢尝试新菜品' },
    { key: 'C', text: '看菜单犹豫很久' }, { key: 'D', text: '让别人点或看推荐' }
  ]},
  { id: 'q102', question: '你更享受哪种对话？', options: [
    { key: 'A', text: '讨论人生哲学的深度对话' }, { key: 'B', text: '轻松愉快的日常闲聊' },
    { key: 'C', text: '交换信息的高效对话' }, { key: 'D', text: '分享八卦和趣事' }
  ]},
  { id: 'q103', question: '在电梯里遇到邻居，你通常会？', options: [
    { key: 'A', text: '微笑点头' }, { key: 'B', text: '主动打招呼聊几句' },
    { key: 'C', text: '低头看手机' }, { key: 'D', text: '礼貌地说"你好"' }
  ]},
  { id: 'q104', question: '你的手机闹钟通常设？', options: [
    { key: 'A', text: '一个闹钟准时起' }, { key: 'B', text: '设多个闹钟以防万一' },
    { key: 'C', text: '自然醒不设闹钟' }, { key: 'D', text: '设了闹钟但经常忽略' }
  ]},
  { id: 'q105', question: '如果时间可以倒退，你最想改变什么？', options: [
    { key: 'A', text: '那些没有勇气说出的话' }, { key: 'B', text: '那些冲动做出的决定' },
    { key: 'C', text: '那些浪费的时间' }, { key: 'D', text: '什么都不改变' }
  ]}
]

/**
 * Fisher-Yates 洗牌算法
 * @param {Array} array 待洗牌数组（会修改原数组）
 * @returns {Array} 洗牌后的数组
 */
function shuffle(array) {
  const arr = array.slice()
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * 两层随机抽取题目
 * 第1层：Fisher-Yates 洗牌从题库中抽 count 道不重复题
 * 第2层：每题选项数 == 3 → 全部展示；> 3 → 随机抽 3 个
 * @param {number} count 抽取题目数量，默认5
 * @returns {Array} 抽取的题目数组，每题固定3个选项
 */
function getRandomQuestions(count = 5) {
  const total = QUESTIONS.length
  const actualCount = Math.min(count, total)
  const shuffled = shuffle(QUESTIONS)
  const selected = shuffled.slice(0, actualCount)

  return selected.map(q => {
    let options
    if (q.options.length <= 3) {
      options = q.options.slice()
    } else {
      options = shuffle(q.options).slice(0, 3)
    }
    // 按 key 升序排序，确保选项顺序始终为 A, B, C 等
    options.sort((a, b) => a.key.localeCompare(b.key))
    // 重新标记为 A, B, C
    const labels = ['A', 'B', 'C']
    options.forEach((opt, i) => { opt.key = labels[i] })
    return {
      id: q.id,
      question: q.question,
      options: options
    }
  })
}

/**
 * 获取题库总题数
 * @returns {number} 题库总数
 */
function getTotalCount() {
  return QUESTIONS.length
}

module.exports = {
  getRandomQuestions,
  getTotalCount
}
