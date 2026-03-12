Page({
  data: {
    mbtiList: [
      { name: 'INTJ', description: '建筑师型人格' },
      { name: 'INTP', description: '逻辑学家型人格' },
      { name: 'ENTJ', description: '指挥官型人格' },
      { name: 'ENTP', description: '辩论家型人格' }
    ]
  },
  onLoad() {
    console.log('MBTI page loaded');
  }
});
