const router = require('express').Router();
const db = require('../config/database');
const { authenticate, authorize, schoolScope } = require('../middleware/auth');
const { success, error } = require('../utils/response');

router.use(authenticate, schoolScope);

router.get('/', async (req, res) => {
  try {
    let query = db('student_notifications as n')
      .join('students as s', 's.id', 'n.student_id')
      .leftJoin('classes as c', 'c.id', 'n.class_id')
      .leftJoin('users as u', 'u.id', 'n.created_by')
      .where({ 'n.school_id': req.schoolId })
      .select(
        'n.*',
        's.first_name as student_first_name',
        's.last_name as student_last_name',
        's.admission_no',
        'c.name as class_name',
        db.raw("COALESCE(u.first_name || ' ' || u.last_name, 'School') as author_name")
      );

    if (req.user.role === 'parent') {
      const children = await db('students')
        .where({ school_id: req.schoolId, parent_id: req.user.id, status: 'active' })
        .select('id');
      query = query.whereIn('n.student_id', children.map((child) => child.id)).where({ 'n.visible_to_parent': true });
    }

    if (req.user.role === 'teacher') {
      const assignedClasses = await db('classes')
        .where({ school_id: req.schoolId, class_teacher_id: req.user.id, is_active: true })
        .select('id');
      query = query.whereIn('n.class_id', assignedClasses.map((cls) => cls.id));
    }

    const notifications = await query.orderBy('n.created_at', 'desc').limit(50);
    return success(res, notifications);
  } catch (err) {
    console.error('Notifications fetch error:', err);
    return error(res, 'Failed to fetch notifications');
  }
});

router.post('/', authorize('school_admin', 'teacher'), async (req, res) => {
  try {
    const { student_id, title, message, category = 'general', priority = 'normal', visible_to_parent = true } = req.body;
    if (!student_id || !title || !message) return error(res, 'student_id, title and message are required', 400);

    const student = await db('students')
      .where({ id: student_id, school_id: req.schoolId, status: 'active' })
      .first();
    if (!student) return error(res, 'Student not found', 404);

    if (req.user.role === 'teacher') {
      const assigned = await db('classes')
        .where({ id: student.class_id, school_id: req.schoolId, class_teacher_id: req.user.id })
        .first();
      if (!assigned) return error(res, 'You can only notify students in your assigned class', 403);
    }

    const [notification] = await db('student_notifications')
      .insert({
        school_id: req.schoolId,
        student_id,
        class_id: student.class_id,
        created_by: req.user.id,
        title,
        message,
        category,
        priority,
        visible_to_parent,
      })
      .returning('*');

    return success(res, notification, 201);
  } catch (err) {
    console.error('Notification create error:', err);
    return error(res, 'Failed to create notification');
  }
});

module.exports = router;
