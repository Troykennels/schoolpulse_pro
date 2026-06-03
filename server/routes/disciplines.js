const router = require('express').Router();
const db = require('../config/database');
const { authenticate, authorize, schoolScope } = require('../middleware/auth');
const { success, error, paginate, paginationMeta } = require('../utils/response');

router.use(authenticate, schoolScope);

// GET /api/disciplines
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, category, student_id } = req.query;

    let query = db('discipline_records as d')
      .where({ 'd.school_id': req.schoolId })
      .leftJoin('students as s', 's.id', 'd.student_id')
      .leftJoin('users as reporter', 'reporter.id', 'd.reported_by')
      .leftJoin('classes as c', 'c.id', 's.class_id')
      .select(
        'd.*',
        db.raw("s.first_name || ' ' || s.last_name as student_name"),
        's.admission_no',
        'c.name as class_name',
        db.raw("reporter.first_name || ' ' || reporter.last_name as reporter_name")
      );

    if (req.user.role === 'teacher') {
      const assignedClassIds = db('classes')
        .where({ school_id: req.schoolId, class_teacher_id: req.user.id })
        .select('id');
      query = query.whereIn('s.class_id', assignedClassIds);
    }

    if (req.user.role === 'parent') {
      const childIds = db('students').where({ parent_id: req.user.id }).select('id');
      query = query.whereIn('d.student_id', childIds);
    }

    if (status) query = query.where('d.status', status);
    if (category) query = query.where('d.category', category);
    if (student_id) query = query.where('d.student_id', student_id);

    const countQuery = query.clone().clearSelect().count('d.id as count').first();
    const total = await countQuery;

    const records = await paginate(
      query.orderBy('d.created_at', 'desc'),
      page, limit
    );

    return success(res, {
      records,
      pagination: paginationMeta(Number(total.count), page, limit),
    });
  } catch (err) {
    console.error('Discipline list error:', err);
    return error(res, 'Failed to fetch discipline records');
  }
});

// POST /api/disciplines
router.post('/', authorize('school_admin', 'teacher'), async (req, res) => {
  try {
    const { student_id, title, description, category, infraction_type, action_taken, incident_date, demerit_points, parent_notified } = req.body;
    if (!student_id || !title || !description) return error(res, 'student_id, title, and description are required', 400);

    const student = await db('students').where({ id: student_id, school_id: req.schoolId }).first();
    if (!student) return error(res, 'Student not found', 404);

    const [record] = await db('discipline_records')
      .insert({
        school_id: req.schoolId,
        student_id, reported_by: req.user.id,
        title, description,
        category: category || 'minor',
        infraction_type: infraction_type || 'other',
        action_taken,
        incident_date: incident_date || new Date().toISOString().split('T')[0],
        demerit_points: demerit_points || 0,
        parent_notified: parent_notified || false,
      })
      .returning('*');

    return success(res, record, 201);
  } catch (err) {
    return error(res, 'Failed to create discipline record');
  }
});

// PUT /api/disciplines/:id
router.put('/:id', authorize('school_admin', 'teacher'), async (req, res) => {
  try {
    const allowed = ['title', 'description', 'category', 'infraction_type', 'action_taken', 'status', 'demerit_points', 'parent_notified', 'parent_response'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    if (req.body.status === 'resolved') updates.resolved_by = req.user.id;
    updates.updated_at = db.fn.now();

    const [record] = await db('discipline_records')
      .where({ id: req.params.id, school_id: req.schoolId })
      .update(updates)
      .returning('*');

    if (!record) return error(res, 'Record not found', 404);
    return success(res, record);
  } catch (err) {
    return error(res, 'Failed to update discipline record');
  }
});

// GET /api/disciplines/student/:studentId/summary
router.get('/student/:studentId/summary', async (req, res) => {
  try {
    const records = await db('discipline_records')
      .where({ student_id: req.params.studentId, school_id: req.schoolId })
      .orderBy('created_at', 'desc');

    const summary = {
      total: records.length,
      minor: records.filter(r => r.category === 'minor').length,
      moderate: records.filter(r => r.category === 'moderate').length,
      major: records.filter(r => r.category === 'major').length,
      critical: records.filter(r => r.category === 'critical').length,
      total_demerit_points: records.reduce((s, r) => s + (r.demerit_points || 0), 0),
      resolved: records.filter(r => r.status === 'resolved').length,
      pending: records.filter(r => r.status !== 'resolved' && r.status !== 'dismissed').length,
    };

    return success(res, { summary, recent: records.slice(0, 10) });
  } catch (err) {
    return error(res, 'Failed to fetch discipline summary');
  }
});

module.exports = router;
