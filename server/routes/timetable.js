const router = require('express').Router();
const db = require('../config/database');
const { authenticate, authorize, schoolScope } = require('../middleware/auth');
const { success, error } = require('../utils/response');

// POST /api/timetable - Create timetable slot
router.post('/', authenticate, authorize('school_admin'), async (req, res) => {
  try {
    const { class_id, subject_id, teacher_id, day_of_week, start_time, end_time, room } = req.body;

    // Check for conflicts
    const conflict = await db('timetable_slots')
      .where({ school_id: req.user.school_id, day_of_week })
      .where(function () {
        this.where({ class_id }).orWhere({ teacher_id });
      })
      .where('start_time', '<', end_time)
      .where('end_time', '>', start_time)
      .first();

    if (conflict) return error(res, 'Time slot conflicts with existing schedule', 409);

    const [slot] = await db('timetable_slots')
      .insert({ school_id: req.user.school_id, class_id, subject_id, teacher_id, day_of_week, start_time, end_time, room })
      .returning('*');

    return success(res, slot, 201);
  } catch (err) {
    return error(res, 'Failed to create timetable slot');
  }
});

// GET /api/timetable/class/:classId
router.get('/class/:classId', authenticate, schoolScope, async (req, res) => {
  try {
    const slots = await db('timetable_slots as ts')
      .where({ 'ts.school_id': req.user.school_id, 'ts.class_id': req.params.classId })
      .join('subjects as sub', 'sub.id', 'ts.subject_id')
      .join('users as u', 'u.id', 'ts.teacher_id')
      .select('ts.*', 'sub.name as subject_name', db.raw("u.first_name || ' ' || u.last_name as teacher_name"))
      .orderByRaw("CASE day_of_week WHEN 'monday' THEN 1 WHEN 'tuesday' THEN 2 WHEN 'wednesday' THEN 3 WHEN 'thursday' THEN 4 WHEN 'friday' THEN 5 END")
      .orderBy('ts.start_time');

    // Group by day
    const timetable = {};
    ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].forEach(d => timetable[d] = []);
    slots.forEach(s => timetable[s.day_of_week].push(s));

    return success(res, timetable);
  } catch (err) {
    return error(res, 'Failed to fetch timetable');
  }
});

// GET /api/timetable/teacher/:teacherId
router.get('/teacher/:teacherId', authenticate, schoolScope, async (req, res) => {
  try {
    const slots = await db('timetable_slots as ts')
      .where({ 'ts.school_id': req.user.school_id, 'ts.teacher_id': req.params.teacherId })
      .join('subjects as sub', 'sub.id', 'ts.subject_id')
      .join('classes as c', 'c.id', 'ts.class_id')
      .select('ts.*', 'sub.name as subject_name', 'c.name as class_name')
      .orderByRaw("CASE day_of_week WHEN 'monday' THEN 1 WHEN 'tuesday' THEN 2 WHEN 'wednesday' THEN 3 WHEN 'thursday' THEN 4 WHEN 'friday' THEN 5 END")
      .orderBy('ts.start_time');

    const timetable = {};
    ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].forEach(d => timetable[d] = []);
    slots.forEach(s => timetable[s.day_of_week].push(s));

    return success(res, timetable);
  } catch (err) {
    return error(res, 'Failed to fetch teacher timetable');
  }
});

// DELETE /api/timetable/:id
router.delete('/:id', authenticate, authorize('school_admin'), async (req, res) => {
  try {
    await db('timetable_slots').where({ id: req.params.id, school_id: req.user.school_id }).delete();
    return success(res, { message: 'Slot deleted' });
  } catch (err) {
    return error(res, 'Failed to delete timetable slot');
  }
});

module.exports = router;
