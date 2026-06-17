const express = require('express');
const cors = require('cors');
const { db, nextId } = require('./db');

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

const calculateActivityStatus = (activity) => {
  const now = new Date();
  const startTime = new Date(activity.start_time);
  const endTime = new Date(activity.end_time);
  
  if (now < startTime) return 'pending';
  if (now >= startTime && now <= endTime) return 'ongoing';
  return 'completed';
};

app.get('/api/users', (req, res) => {
  const users = db.get('users').sortBy('created_at').reverse().value();
  res.json(users);
});

app.get('/api/users/:id', (req, res) => {
  const user = db.get('users').find({ id: parseInt(req.params.id) }).value();
  if (!user) return res.status(404).json({ error: '用户不存在' });
  res.json(user);
});

app.post('/api/users/login', (req, res) => {
  const { name } = req.body;
  let user = db.get('users').find({ name }).value();
  if (!user) {
    const id = nextId('users');
    user = {
      id,
      name,
      department: '',
      role: 'employee',
      avatar: '👤',
      created_at: new Date().toISOString(),
    };
    db.get('users').push(user).write();
  }
  res.json(user);
});

app.get('/api/activities', (req, res) => {
  const { status } = req.query;
  let activities = db.get('activities').value();
  
  activities = activities.map((act) => ({
    ...act,
    status: calculateActivityStatus(act),
  }));
  
  if (status) {
    activities = activities.filter((act) => act.status === status);
  }
  activities = activities.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const activitiesWithStats = activities.map((act) => {
    const registeredCount = db.get('registrations')
      .filter({ activity_id: act.id, status: 'confirmed' })
      .size()
      .value();
    const checkinCount = db.get('checkins')
      .filter({ activity_id: act.id })
      .size()
      .value();
    return {
      ...act,
      registered_count: registeredCount,
      checked_in_count: checkinCount,
    };
  });

  res.json(activitiesWithStats);
});

app.get('/api/activities/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const activity = db.get('activities').find({ id }).value();
  if (!activity) return res.status(404).json({ error: '活动不存在' });

  const creator = db.get('users').find({ id: activity.created_by }).value();

  const registrations = db.get('registrations')
    .filter({ activity_id: id })
    .sortBy('registered_at')
    .value()
    .map((r) => {
      const user = db.get('users').find({ id: r.user_id }).value();
      return {
        ...r,
        user_name: user?.name,
        department: user?.department,
        avatar: user?.avatar,
      };
    });

  const waitlist = registrations
    .filter((r) => r.status === 'waitlist')
    .sort((a, b) => (a.waitlist_position || 0) - (b.waitlist_position || 0));

  const teams = db.get('teams')
    .filter({ activity_id: id })
    .value()
    .map((team) => {
      const members = db.get('team_members')
        .filter({ team_id: team.id })
        .value()
        .map((tm) => {
          const user = db.get('users').find({ id: tm.user_id }).value();
          return {
            ...tm,
            name: user?.name,
            department: user?.department,
            avatar: user?.avatar,
          };
        });
      return { ...team, members };
    });

  const checkins = db.get('checkins')
    .filter({ activity_id: id })
    .value()
    .map((c) => {
      const user = db.get('users').find({ id: c.user_id }).value();
      return {
        ...c,
        name: user?.name,
        department: user?.department,
        avatar: user?.avatar,
      };
    });

  const expenses = db.get('expenses')
    .filter({ activity_id: id })
    .sortBy('created_at')
    .reverse()
    .value();

  const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);

  const categoryTotals = {};
  const statusTotals = {};
  expenses.forEach((e) => {
    const cat = e.category || '其他';
    categoryTotals[cat] = (categoryTotals[cat] || 0) + e.amount;
    const st = e.reimbursement_status || '待报销';
    statusTotals[st] = (statusTotals[st] || 0) + e.amount;
  });

  const reviews = db.get('reviews')
    .filter({ activity_id: id })
    .value()
    .map((r) => {
      const user = db.get('users').find({ id: r.user_id }).value();
      return {
        ...r,
        name: user?.name,
        avatar: user?.avatar,
      };
    });

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  const confirmedCount = registrations.filter((r) => r.status === 'confirmed').length;
  const waitlistCount = waitlist.length;
  const declinedCount = registrations.filter((r) => r.status === 'declined').length;

  const allUsers = db.get('users').filter({ role: 'employee' }).value();
  const respondedUserIds = new Set(registrations.map((r) => r.user_id));
  const noResponseCount = allUsers.filter((u) => !respondedUserIds.has(u.id)).length;

  const deptStats = {};
  allUsers.forEach((u) => {
    const dept = u.department || '未设置';
    if (!deptStats[dept]) {
      deptStats[dept] = { department: dept, total: 0, confirmed: 0, declined: 0, waitlist: 0, noResponse: 0, users: [] };
    }
    deptStats[dept].total++;
    const reg = registrations.find((r) => r.user_id === u.id);
    if (reg) {
      if (reg.status === 'confirmed') deptStats[dept].confirmed++;
      else if (reg.status === 'declined') deptStats[dept].declined++;
      else if (reg.status === 'waitlist') deptStats[dept].waitlist++;
    } else {
      deptStats[dept].noResponse++;
    }
    deptStats[dept].users.push({
      ...u,
      status: reg?.status || 'no_response',
      decline_reason: reg?.decline_reason || null,
      waitlist_position: reg?.waitlist_position || null,
    });
  });

  const declineReasons = registrations
    .filter((r) => r.status === 'declined' && r.decline_reason)
    .reduce((acc, r) => {
      const reason = r.decline_reason;
      acc[reason] = (acc[reason] || 0) + 1;
      return acc;
    }, {});

  const declineReasonList = Object.entries(declineReasons)
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);

  res.json({
    ...activity,
    status: calculateActivityStatus(activity),
    creator_name: creator?.name,
    registrations,
    waitlist,
    teams,
    checkins,
    expenses,
    totalExpense,
    perPersonExpense: confirmedCount > 0 ? (totalExpense / confirmedCount).toFixed(2) : 0,
    categoryTotals,
    statusTotals,
    reviews,
    avgRating,
    confirmedCount,
    waitlistCount,
    declinedCount,
    noResponseCount,
    deptStats: Object.values(deptStats),
    declineReasonList,
  });
});

app.post('/api/activities', (req, res) => {
  const {
    title, description, location, start_time, end_time,
    deadline, max_participants, fee_type, fee_description,
    grouping_type, status, created_by,
  } = req.body;

  const id = nextId('activities');
  const activity = {
    id,
    title,
    description: description || '',
    location,
    start_time,
    end_time,
    deadline,
    max_participants: max_participants || null,
    fee_type,
    fee_description: fee_description || '',
    grouping_type: grouping_type || 'none',
    status: status || 'draft',
    created_by,
    created_at: new Date().toISOString(),
  };

  db.get('activities').push(activity).write();

  if (grouping_type === 'free') {
    for (let i = 1; i <= 4; i++) {
      db.get('teams').push({
        id: nextId('teams'),
        activity_id: id,
        name: `第${i}小队`,
        max_members: 10,
        created_at: new Date().toISOString(),
      }).write();
    }
  }

  res.status(201).json(activity);
});

app.put('/api/activities/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const existing = db.get('activities').find({ id }).value();
  if (!existing) return res.status(404).json({ error: '活动不存在' });

  const {
    title, description, location, start_time, end_time,
    deadline, max_participants, fee_type, fee_description,
    grouping_type, status,
  } = req.body;

  const updated = {
    ...existing,
    title: title || existing.title,
    description: description !== undefined ? description : existing.description,
    location: location || existing.location,
    start_time: start_time || existing.start_time,
    end_time: end_time || existing.end_time,
    deadline: deadline || existing.deadline,
    max_participants: max_participants !== undefined ? max_participants : existing.max_participants,
    fee_type: fee_type || existing.fee_type,
    fee_description: fee_description !== undefined ? fee_description : existing.fee_description,
    grouping_type: grouping_type || existing.grouping_type,
    status: status || existing.status,
  };

  db.get('activities').find({ id }).assign(updated).write();
  res.json(updated);
});

app.delete('/api/activities/:id', (req, res) => {
  const id = parseInt(req.params.id);
  db.get('activities').remove({ id }).write();
  db.get('registrations').remove({ activity_id: id }).write();
  db.get('teams').remove({ activity_id: id }).write();
  db.get('checkins').remove({ activity_id: id }).write();
  db.get('expenses').remove({ activity_id: id }).write();
  db.get('reviews').remove({ activity_id: id }).write();
  const teamIds = db.get('teams').filter({ activity_id: id }).map('id').value();
  teamIds.forEach((tid) => {
    db.get('team_members').remove({ team_id: tid }).write();
  });
  res.json({ success: true });
});

app.post('/api/activities/:id/register', (req, res) => {
  const activityId = parseInt(req.params.id);
  const { user_id, status, decline_reason } = req.body;
  const activity = db.get('activities').find({ id: activityId }).value();

  if (!activity) return res.status(404).json({ error: '活动不存在' });

  if (new Date() > new Date(activity.deadline) && (status === 'confirmed' || status === 'waitlist')) {
    return res.status(400).json({ error: '报名已截止' });
  }

  const existing = db.get('registrations')
    .find({ activity_id: activityId, user_id })
    .value();

  const getWaitlistCount = () => db.get('registrations')
    .filter({ activity_id: activityId, status: 'waitlist' })
    .size()
    .value();

  const getConfirmedCount = () => db.get('registrations')
    .filter({ activity_id: activityId, status: 'confirmed' })
    .size()
    .value();

  const processWaitlistPromotion = () => {
    if (!activity.max_participants) return;
    
    const currentConfirmed = getConfirmedCount();
    if (currentConfirmed >= activity.max_participants) return;

    const waitlistItems = db.get('registrations')
      .filter({ activity_id: activityId, status: 'waitlist' })
      .sortBy('waitlist_position')
      .value();

    if (waitlistItems.length === 0) return;

    const availableSlots = activity.max_participants - currentConfirmed;
    for (let i = 0; i < Math.min(availableSlots, waitlistItems.length); i++) {
      const item = waitlistItems[i];
      db.get('registrations')
        .find({ id: item.id })
        .assign({ status: 'confirmed', waitlist_position: null })
        .write();

      if (activity.grouping_type === 'department') {
        const user = db.get('users').find({ id: item.user_id }).value();
        if (user) {
          const deptName = user.department || '未分组';
          let team = db.get('teams')
            .find({ activity_id: activityId, name: deptName })
            .value();
          if (!team) {
            const teamId = nextId('teams');
            team = {
              id: teamId,
              activity_id: activityId,
              name: deptName,
              max_members: 50,
              created_at: new Date().toISOString(),
            };
            db.get('teams').push(team).write();
          }
          const existingMember = db.get('team_members')
            .find({ team_id: team.id, user_id: item.user_id })
            .value();
          if (!existingMember) {
            db.get('team_members').push({
              id: nextId('team_members'),
              team_id: team.id,
              user_id: item.user_id,
              joined_at: new Date().toISOString(),
            }).write();
          }
        }
      }
    }

    db.get('registrations')
      .filter({ activity_id: activityId, status: 'waitlist' })
      .sortBy('waitlist_position')
      .value()
      .forEach((item, idx) => {
        db.get('registrations')
          .find({ id: item.id })
          .assign({ waitlist_position: idx + 1 })
          .write();
      });
  };

  if (status === 'confirmed') {
    const currentConfirmed = getConfirmedCount();
    
    if (activity.max_participants && currentConfirmed >= activity.max_participants) {
      if (!existing || existing.status !== 'confirmed') {
        return res.status(400).json({ error: `名额已满（${activity.max_participants}人），可加入候补队列` });
      }
    }

    if (existing) {
      const wasWaitlist = existing.status === 'waitlist';
      const wasConfirmed = existing.status === 'confirmed';
      
      db.get('registrations')
        .find({ id: existing.id })
        .assign({ status, decline_reason: null, waitlist_position: null })
        .write();

      if (wasWaitlist) {
        const remainingWaitlist = db.get('registrations')
          .filter({ activity_id: activityId, status: 'waitlist' })
          .sortBy('waitlist_position')
          .value();
        remainingWaitlist.forEach((item, idx) => {
          db.get('registrations')
            .find({ id: item.id })
            .assign({ waitlist_position: idx + 1 })
            .write();
        });
      }

      if (!wasConfirmed && activity.grouping_type === 'department') {
        const user = db.get('users').find({ id: user_id }).value();
        if (user) {
          const deptName = user.department || '未分组';
          let team = db.get('teams')
            .find({ activity_id: activityId, name: deptName })
            .value();
          if (!team) {
            const teamId = nextId('teams');
            team = {
              id: teamId,
              activity_id: activityId,
              name: deptName,
              max_members: 50,
              created_at: new Date().toISOString(),
            };
            db.get('teams').push(team).write();
          }
          const existingMember = db.get('team_members')
            .find({ team_id: team.id, user_id })
            .value();
          if (!existingMember) {
            db.get('team_members').push({
              id: nextId('team_members'),
              team_id: team.id,
              user_id,
              joined_at: new Date().toISOString(),
            }).write();
          }
        }
      }
    } else {
      db.get('registrations').push({
        id: nextId('registrations'),
        activity_id: activityId,
        user_id,
        status,
        decline_reason: null,
        waitlist_position: null,
        registered_at: new Date().toISOString(),
      }).write();

      if (activity.grouping_type === 'department') {
        const user = db.get('users').find({ id: user_id }).value();
        if (user) {
          const deptName = user.department || '未分组';
          let team = db.get('teams')
            .find({ activity_id: activityId, name: deptName })
            .value();
          if (!team) {
            const teamId = nextId('teams');
            team = {
              id: teamId,
              activity_id: activityId,
              name: deptName,
              max_members: 50,
              created_at: new Date().toISOString(),
            };
            db.get('teams').push(team).write();
          }
          const existingMember = db.get('team_members')
            .find({ team_id: team.id, user_id })
            .value();
          if (!existingMember) {
            db.get('team_members').push({
              id: nextId('team_members'),
              team_id: team.id,
              user_id,
              joined_at: new Date().toISOString(),
            }).write();
          }
        }
      }
    }
  } else if (status === 'waitlist') {
    if (!activity.max_participants) {
      return res.status(400).json({ error: '该活动未设置名额限制，无需候补' });
    }

    const currentConfirmed = getConfirmedCount();
    if (currentConfirmed < activity.max_participants) {
      return res.status(400).json({ error: '当前还有名额，请直接报名' });
    }

    const currentWaitlist = getWaitlistCount();

    if (existing) {
      if (existing.status === 'confirmed') {
        return res.status(400).json({ error: '您已报名成功，无需加入候补' });
      }
      db.get('registrations')
        .find({ id: existing.id })
        .assign({ status, decline_reason: null, waitlist_position: currentWaitlist + 1 })
        .write();
    } else {
      db.get('registrations').push({
        id: nextId('registrations'),
        activity_id: activityId,
        user_id,
        status,
        decline_reason: null,
        waitlist_position: currentWaitlist + 1,
        registered_at: new Date().toISOString(),
      }).write();
    }
  } else if (status === 'declined') {
    if (existing) {
      const wasConfirmed = existing.status === 'confirmed';
      const wasWaitlist = existing.status === 'waitlist';

      db.get('registrations')
        .find({ id: existing.id })
        .assign({ status, decline_reason: decline_reason || null, waitlist_position: null })
        .write();

      if (wasConfirmed || wasWaitlist) {
        const activityTeams = db.get('teams')
          .filter({ activity_id: activityId })
          .map('id')
          .value();
        db.get('team_members')
          .remove((tm) => activityTeams.includes(tm.team_id) && tm.user_id === user_id)
          .write();
      }

      if (wasWaitlist) {
        const remainingWaitlist = db.get('registrations')
          .filter({ activity_id: activityId, status: 'waitlist' })
          .sortBy('waitlist_position')
          .value();
        remainingWaitlist.forEach((item, idx) => {
          db.get('registrations')
            .find({ id: item.id })
            .assign({ waitlist_position: idx + 1 })
            .write();
        });
      }

      if (wasConfirmed) {
        processWaitlistPromotion();
      }
    } else {
      db.get('registrations').push({
        id: nextId('registrations'),
        activity_id: activityId,
        user_id,
        status,
        decline_reason: decline_reason || null,
        waitlist_position: null,
        registered_at: new Date().toISOString(),
      }).write();
    }
  }

  res.json({ success: true });
});

app.post('/api/activities/:id/checkin', (req, res) => {
  const activityId = parseInt(req.params.id);
  const { user_id } = req.body;

  const existing = db.get('checkins')
    .find({ activity_id: activityId, user_id })
    .value();

  if (existing) {
    return res.status(400).json({ error: '已签到' });
  }

  const registration = db.get('registrations')
    .find({ activity_id: activityId, user_id, status: 'confirmed' })
    .value();

  if (!registration) {
    return res.status(400).json({ error: '未报名该活动' });
  }

  db.get('checkins').push({
    id: nextId('checkins'),
    activity_id: activityId,
    user_id,
    checked_in_at: new Date().toISOString(),
  }).write();

  res.json({ success: true });
});

app.get('/api/activities/:id/teams', (req, res) => {
  const activityId = parseInt(req.params.id);
  const teams = db.get('teams')
    .filter({ activity_id: activityId })
    .value()
    .map((team) => {
      const members = db.get('team_members')
        .filter({ team_id: team.id })
        .value()
        .map((tm) => {
          const user = db.get('users').find({ id: tm.user_id }).value();
          return {
            ...tm,
            name: user?.name,
            department: user?.department,
            avatar: user?.avatar,
          };
        });
      return { ...team, members };
    });
  res.json(teams);
});

app.post('/api/teams/:teamId/join', (req, res) => {
  const teamId = parseInt(req.params.teamId);
  const { user_id } = req.body;
  const team = db.get('teams').find({ id: teamId }).value();

  if (!team) return res.status(404).json({ error: '队伍不存在' });

  const memberCount = db.get('team_members').filter({ team_id: teamId }).size().value();
  if (team.max_members && memberCount >= team.max_members) {
    return res.status(400).json({ error: '队伍已满' });
  }

  const activityTeams = db.get('teams').filter({ activity_id: team.activity_id }).map('id').value();
  const existingMember = db.get('team_members')
    .find((tm) => activityTeams.includes(tm.team_id) && tm.user_id === user_id)
    .value();

  if (existingMember) {
    db.get('team_members').remove({ id: existingMember.id }).write();
  }

  db.get('team_members').push({
    id: nextId('team_members'),
    team_id: teamId,
    user_id,
    joined_at: new Date().toISOString(),
  }).write();

  res.json({ success: true });
});

const isValidAmount = (value) => {
  if (value === null || value === undefined || value === '') return false;
  const str = String(value).trim();
  if (!/^-?\d*\.?\d+$/.test(str)) return false;
  const num = parseFloat(str);
  if (isNaN(num) || !isFinite(num)) return false;
  if (num <= 0) return false;
  if (str.includes('.') && str.split('.')[1].length > 2) return false;
  return true;
};

app.post('/api/activities/:id/expenses', (req, res) => {
  const activityId = parseInt(req.params.id);
  const { item_name, amount, note, category, reimbursement_status } = req.body;

  if (!item_name || item_name.trim() === '') {
    return res.status(400).json({ error: '请填写费用项目名称' });
  }
  if (!isValidAmount(amount)) {
    return res.status(400).json({ error: '金额格式不正确，请输入大于0的有效金额（最多两位小数）' });
  }

  const validCategories = ['餐饮', '交通', '场地', '住宿', '礼品', '其他'];
  const finalCategory = category && validCategories.includes(category) ? category : '其他';
  const validStatuses = ['待报销', '已报销'];
  const finalStatus = reimbursement_status && validStatuses.includes(reimbursement_status) ? reimbursement_status : '待报销';

  const parsedAmount = Number(parseFloat(amount).toFixed(2));

  const id = nextId('expenses');
  const expense = {
    id,
    activity_id: activityId,
    item_name: item_name.trim(),
    category: finalCategory,
    amount: parsedAmount,
    reimbursement_status: finalStatus,
    note: note && note.trim() !== '' ? note.trim() : null,
    created_at: new Date().toISOString(),
  };

  db.get('expenses').push(expense).write();
  res.status(201).json(expense);
});

app.put('/api/expenses/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { reimbursement_status } = req.body;

  const expense = db.get('expenses').find({ id }).value();
  if (!expense) return res.status(404).json({ error: '费用记录不存在' });

  const validStatuses = ['待报销', '已报销'];
  const finalStatus = validStatuses.includes(reimbursement_status) ? reimbursement_status : expense.reimbursement_status;

  db.get('expenses').find({ id }).assign({ reimbursement_status: finalStatus }).write();
  res.json(db.get('expenses').find({ id }).value());
});

app.delete('/api/expenses/:id', (req, res) => {
  const id = parseInt(req.params.id);
  db.get('expenses').remove({ id }).write();
  res.json({ success: true });
});

app.post('/api/activities/:id/reviews', (req, res) => {
  const activityId = parseInt(req.params.id);
  const { user_id, rating, comment } = req.body;

  const existing = db.get('reviews')
    .find({ activity_id: activityId, user_id })
    .value();

  if (existing) {
    db.get('reviews')
      .find({ id: existing.id })
      .assign({ rating, comment: comment || null })
      .write();
    res.json(db.get('reviews').find({ id: existing.id }).value());
  } else {
    const id = nextId('reviews');
    const review = {
      id,
      activity_id: activityId,
      user_id,
      rating: parseInt(rating),
      comment: comment || null,
      created_at: new Date().toISOString(),
    };
    db.get('reviews').push(review).write();
    res.status(201).json(review);
  }
});

app.get('/api/stats/summary', (req, res) => {
  const totalActivities = db.get('activities')
    .filter((a) => a.status !== 'draft')
    .size()
    .value();

  const totalRegistrations = db.get('registrations')
    .filter({ status: 'confirmed' })
    .size()
    .value();

  const totalCheckins = db.get('checkins').size().value();

  const totalExpense = db.get('expenses')
    .value()
    .reduce((sum, e) => sum + e.amount, 0);

  const activities = db.get('activities')
    .filter((a) => a.status !== 'draft')
    .sortBy('start_time')
    .value()
    .map((a) => {
      const registered = db.get('registrations')
        .filter({ activity_id: a.id, status: 'confirmed' })
        .size()
        .value();
      const checked_in = db.get('checkins')
        .filter({ activity_id: a.id })
        .size()
        .value();
      const reviews = db.get('reviews').filter({ activity_id: a.id }).value();
      const avg_rating = reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;
      const participation_rate = a.max_participants
        ? ((registered / a.max_participants) * 100).toFixed(1)
        : null;
      return {
        id: a.id,
        title: a.title,
        start_time: a.start_time,
        max_participants: a.max_participants,
        registered,
        checked_in,
        avg_rating,
        review_count: reviews.length,
        participation_rate,
      };
    });

  const users = db.get('users').value();
  const departmentMap = {};
  users.forEach((u) => {
    const dept = u.department || '未设置';
    if (!departmentMap[dept]) {
      departmentMap[dept] = { department: dept, participants: new Set(), checkins: new Set() };
    }
  });

  db.get('registrations')
    .filter({ status: 'confirmed' })
    .value()
    .forEach((r) => {
      const user = users.find((u) => u.id === r.user_id);
      if (user) {
        const dept = user.department || '未设置';
        departmentMap[dept]?.participants.add(user.id);
      }
    });

  db.get('checkins').value().forEach((c) => {
    const user = users.find((u) => u.id === c.user_id);
    if (user) {
      const dept = user.department || '未设置';
      departmentMap[dept]?.checkins.add(user.id);
    }
  });

  const departmentStats = Object.values(departmentMap).map((d) => ({
    department: d.department,
    participants: d.participants.size,
    checkins: d.checkins.size,
  }));

  res.json({
    totalActivities,
    totalRegistrations,
    totalCheckins,
    totalExpense,
    activities,
    departmentStats,
  });
});

app.get('/api/stats/review', (req, res) => {
  const { month, status } = req.query;
  
  let activities = db.get('activities').value();
  
  if (month) {
    activities = activities.filter((a) => a.start_time && a.start_time.startsWith(month));
  }
  
  activities = activities.map((a) => ({
    ...a,
    computed_status: calculateActivityStatus(a),
  }));
  
  if (status && status !== 'all') {
    activities = activities.filter((a) => a.computed_status === status);
  }

  const allEmployees = db.get('users').filter({ role: 'employee' }).value();
  const totalEmployees = allEmployees.length;

  const reviewData = activities
    .sort((a, b) => new Date(b.start_time) - new Date(a.start_time))
    .map((a) => {
      const registrations = db.get('registrations').filter({ activity_id: a.id }).value();
      const confirmed = registrations.filter((r) => r.status === 'confirmed').length;
      const waitlist = registrations.filter((r) => r.status === 'waitlist').length;
      const declined = registrations.filter((r) => r.status === 'declined').length;
      const noResponse = totalEmployees - registrations.length;
      
      const checkins = db.get('checkins').filter({ activity_id: a.id }).value();
      const checkedIn = checkins.length;
      
      const expenses = db.get('expenses').filter({ activity_id: a.id }).value();
      const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);
      const perPersonExpense = confirmed > 0 ? (totalExpense / confirmed).toFixed(2) : 0;
      
      const reviews = db.get('reviews').filter({ activity_id: a.id }).value();
      const avgRating = reviews.length > 0
        ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
        : null;
      
      const signUpRate = ((confirmed / totalEmployees) * 100).toFixed(1);
      const attendanceRate = confirmed > 0 ? ((checkedIn / confirmed) * 100).toFixed(1) : null;
      const participationRate = a.max_participants
        ? ((confirmed / a.max_participants) * 100).toFixed(1)
        : null;

      return {
        id: a.id,
        title: a.title,
        location: a.location,
        start_time: a.start_time,
        end_time: a.end_time,
        status: a.computed_status,
        fee_type: a.fee_type,
        max_participants: a.max_participants,
        total_employees: totalEmployees,
        confirmed_count: confirmed,
        waitlist_count: waitlist,
        declined_count: declined,
        no_response_count: noResponse,
        checked_in_count: checkedIn,
        total_expense: Number(totalExpense.toFixed(2)),
        per_person_expense: Number(perPersonExpense),
        avg_rating: avgRating ? Number(avgRating) : null,
        review_count: reviews.length,
        sign_up_rate: Number(signUpRate),
        attendance_rate: attendanceRate ? Number(attendanceRate) : null,
        participation_rate: participationRate ? Number(participationRate) : null,
      };
    });

  res.json({
    totalEmployees,
    activities: reviewData,
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
