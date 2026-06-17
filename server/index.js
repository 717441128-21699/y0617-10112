const express = require('express');
const cors = require('cors');
const { db, nextId } = require('./db');

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

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
  let activities = db.get('activities');
  if (status) {
    activities = activities.filter({ status });
  }
  activities = activities.sortBy('created_at').reverse().value();

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

  const registeredCount = registrations.filter((r) => r.status === 'confirmed').length;

  res.json({
    ...activity,
    creator_name: creator?.name,
    registrations,
    teams,
    checkins,
    expenses,
    totalExpense,
    perPersonExpense: registeredCount > 0 ? (totalExpense / registeredCount).toFixed(2) : 0,
    reviews,
    avgRating,
    registeredCount,
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

  if (new Date() > new Date(activity.deadline) && status === 'confirmed') {
    return res.status(400).json({ error: '报名已截止' });
  }

  const existing = db.get('registrations')
    .find({ activity_id: activityId, user_id })
    .value();

  if (existing) {
    db.get('registrations')
      .find({ id: existing.id })
      .assign({ status, decline_reason: decline_reason || null })
      .write();
  } else {
    db.get('registrations').push({
      id: nextId('registrations'),
      activity_id: activityId,
      user_id,
      status,
      decline_reason: decline_reason || null,
      registered_at: new Date().toISOString(),
    }).write();
  }

  if (activity.grouping_type === 'department' && status === 'confirmed') {
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

app.post('/api/activities/:id/expenses', (req, res) => {
  const activityId = parseInt(req.params.id);
  const { item_name, amount, note } = req.body;

  const id = nextId('expenses');
  const expense = {
    id,
    activity_id: activityId,
    item_name,
    amount: parseFloat(amount),
    note: note || null,
    created_at: new Date().toISOString(),
  };

  db.get('expenses').push(expense).write();
  res.status(201).json(expense);
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
      return {
        id: a.id,
        title: a.title,
        start_time: a.start_time,
        registered,
        checked_in,
        avg_rating,
        review_count: reviews.length,
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

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
