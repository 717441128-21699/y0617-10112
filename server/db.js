const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const adapter = new FileSync(path.join(dataDir, 'db.json'));
const db = low(adapter);

db.defaults({
  users: [
    { id: 1, name: '张管理', department: '人力资源部', role: 'hr', avatar: '👨‍💼', created_at: new Date().toISOString() },
    { id: 2, name: '李经理', department: '技术部', role: 'hr', avatar: '👩‍💼', created_at: new Date().toISOString() },
    { id: 3, name: '王开发', department: '技术部', role: 'employee', avatar: '👨‍💻', created_at: new Date().toISOString() },
    { id: 4, name: '赵设计', department: '设计部', role: 'employee', avatar: '👩‍🎨', created_at: new Date().toISOString() },
    { id: 5, name: '陈测试', department: '技术部', role: 'employee', avatar: '👨‍🔬', created_at: new Date().toISOString() },
    { id: 6, name: '刘产品', department: '产品部', role: 'employee', avatar: '👩‍💻', created_at: new Date().toISOString() },
    { id: 7, name: '孙运营', department: '运营部', role: 'employee', avatar: '👨‍💼', created_at: new Date().toISOString() },
    { id: 8, name: '周市场', department: '市场部', role: 'employee', avatar: '👩‍💼', created_at: new Date().toISOString() },
  ],
  activities: [
    {
      id: 1,
      title: '2024年秋季户外团建',
      description: '为期两天的户外拓展训练，增进团队凝聚力',
      location: '青山湖度假酒店',
      start_time: '2024-10-15T09:00:00',
      end_time: '2024-10-16T18:00:00',
      deadline: '2024-10-10T18:00:00',
      max_participants: 50,
      fee_type: 'company',
      fee_description: '公司全额报销',
      grouping_type: 'department',
      status: 'completed',
      created_by: 1,
      created_at: '2024-09-20T10:00:00',
    },
    {
      id: 2,
      title: '技术部月度聚餐',
      description: '技术部同事聚餐交流',
      location: '市中心海鲜酒楼',
      start_time: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 16) + ':00',
      end_time: new Date(Date.now() + 7 * 24 * 3600 * 1000 + 3 * 3600 * 1000).toISOString().slice(0, 16) + ':00',
      deadline: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString().slice(0, 16) + ':00',
      max_participants: 20,
      fee_type: 'subsidy',
      fee_description: '公司补贴80%，个人承担20%',
      grouping_type: 'free',
      status: 'published',
      created_by: 2,
      created_at: new Date().toISOString(),
    },
  ],
  registrations: [
    { id: 1, activity_id: 1, user_id: 3, status: 'confirmed', decline_reason: null, registered_at: '2024-09-21T10:00:00' },
    { id: 2, activity_id: 1, user_id: 4, status: 'confirmed', decline_reason: null, registered_at: '2024-09-21T11:00:00' },
    { id: 3, activity_id: 1, user_id: 5, status: 'confirmed', decline_reason: null, registered_at: '2024-09-22T09:00:00' },
    { id: 4, activity_id: 1, user_id: 6, status: 'declined', decline_reason: '家中有事', registered_at: '2024-09-22T10:00:00' },
  ],
  teams: [
    { id: 1, activity_id: 1, name: '技术部', max_members: 50, created_at: '2024-09-20T10:00:00' },
    { id: 2, activity_id: 1, name: '设计部', max_members: 50, created_at: '2024-09-20T10:00:00' },
    { id: 3, activity_id: 2, name: '第1小队', max_members: 10, created_at: new Date().toISOString() },
    { id: 4, activity_id: 2, name: '第2小队', max_members: 10, created_at: new Date().toISOString() },
    { id: 5, activity_id: 2, name: '第3小队', max_members: 10, created_at: new Date().toISOString() },
    { id: 6, activity_id: 2, name: '第4小队', max_members: 10, created_at: new Date().toISOString() },
  ],
  team_members: [
    { id: 1, team_id: 1, user_id: 3, joined_at: '2024-09-21T10:00:00' },
    { id: 2, team_id: 1, user_id: 5, joined_at: '2024-09-22T09:00:00' },
    { id: 3, team_id: 2, user_id: 4, joined_at: '2024-09-21T11:00:00' },
  ],
  checkins: [
    { id: 1, activity_id: 1, user_id: 3, checked_in_at: '2024-10-15T09:15:00' },
    { id: 2, activity_id: 1, user_id: 4, checked_in_at: '2024-10-15T09:20:00' },
  ],
  expenses: [
    { id: 1, activity_id: 1, item_name: '场地租赁费', amount: 5000, note: '两天场地', created_at: '2024-10-17T10:00:00' },
    { id: 2, activity_id: 1, item_name: '餐饮费', amount: 3000, note: '两正餐一早餐', created_at: '2024-10-17T10:05:00' },
    { id: 3, activity_id: 1, item_name: '交通费', amount: 1500, note: '大巴租赁', created_at: '2024-10-17T10:10:00' },
  ],
  reviews: [
    { id: 1, activity_id: 1, user_id: 3, rating: 5, comment: '活动组织得很好，大家都玩得很开心！', created_at: '2024-10-18T10:00:00' },
    { id: 2, activity_id: 1, user_id: 4, rating: 4, comment: '整体不错，希望下次活动时间能更长一些。', created_at: '2024-10-18T11:00:00' },
    { id: 3, activity_id: 1, user_id: 5, rating: 5, comment: '非常满意，期待下次团建！', created_at: '2024-10-18T12:00:00' },
  ],
}).write();

let idCounter = {
  users: 100,
  activities: 100,
  registrations: 100,
  teams: 100,
  team_members: 100,
  checkins: 100,
  expenses: 100,
  reviews: 100,
};

Object.keys(idCounter).forEach((key) => {
  const items = db.get(key).value();
  if (items && items.length > 0) {
    idCounter[key] = Math.max(...items.map((i) => i.id)) + 1;
  }
});

const nextId = (collection) => idCounter[collection]++;

module.exports = { db, nextId };
