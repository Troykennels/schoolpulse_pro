const router = require('express').Router();
const db = require('../config/database');
const { authenticate, authorize, schoolScope } = require('../middleware/auth');
const { success, error } = require('../utils/response');

router.get('/access', authenticate, authorize('school_admin', 'super_admin'), schoolScope, async (req, res) => {
  try {
    const [users, classes, students] = await Promise.all([
      db('users')
        .where({ school_id: req.schoolId })
        .select('id', 'first_name', 'last_name', 'email', 'phone', 'role', 'is_active', 'last_login')
        .orderBy([{ column: 'role' }, { column: 'last_name' }]),
      db('classes as c')
        .leftJoin('users as u', 'u.id', 'c.class_teacher_id')
        .where({ 'c.school_id': req.schoolId, 'c.is_active': true })
        .select('c.id', 'c.name', 'c.level', 'c.capacity', db.raw("u.first_name || ' ' || u.last_name as class_teacher"))
        .orderBy('c.order_index'),
      db('students as s')
        .leftJoin('users as p', 'p.id', 's.parent_id')
        .leftJoin('classes as c', 'c.id', 's.class_id')
        .where({ 's.school_id': req.schoolId, 's.status': 'active' })
        .select('s.id', 's.first_name', 's.last_name', 's.admission_no', 'c.name as class_name', 'p.email as parent_email', 'p.phone as parent_phone')
        .orderBy('s.admission_no'),
    ]);

    const counts = users.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {});

    return success(res, { users, classes, students, counts });
  } catch (err) {
    console.error('Access settings error:', err);
    return error(res, 'Failed to fetch access settings');
  }
});

module.exports = router;
