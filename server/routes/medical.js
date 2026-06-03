const router = require('express').Router();
const db = require('../config/database');
const { authenticate, authorize, schoolScope } = require('../middleware/auth');
const { success, error } = require('../utils/response');

router.use(authenticate, schoolScope);

// ── Medical Records ──────────────────────────────────────

// GET /api/medical
router.get('/', authorize('super_admin', 'school_admin', 'teacher', 'staff'), async (req, res) => {
  try {
    const { student_id, date_from, date_to } = req.query;
    let query = db('medical_records as mr')
      .join('students as s', 'mr.student_id', 's.id')
      .where('mr.school_id', req.schoolId)
      .select('mr.*', 's.first_name', 's.last_name', 's.admission_no', 's.class_id')
      .orderBy('mr.visit_date', 'desc');

    if (student_id) query = query.where('mr.student_id', student_id);
    if (date_from) query = query.where('mr.visit_date', '>=', date_from);
    if (date_to) query = query.where('mr.visit_date', '<=', date_to);

    const records = await query;
    return success(res, records);
  } catch (err) { return error(res, 'Failed to fetch medical records'); }
});

// POST /api/medical
router.post('/', authorize('super_admin', 'school_admin', 'teacher', 'staff'), async (req, res) => {
  try {
    const { student_id, visit_date, visit_type, complaint, diagnosis, treatment,
      medication_given, temperature, blood_pressure, weight, parent_notified, sent_home, notes } = req.body;
    if (!student_id || !visit_date) return error(res, 'Student and visit date are required', 400);

    const [record] = await db('medical_records').insert({
      school_id: req.schoolId, student_id, visit_date, visit_type: visit_type || 'sick_bay',
      complaint, diagnosis, treatment, medication_given, temperature, blood_pressure, weight,
      parent_notified: parent_notified || false, sent_home: sent_home || false,
      attended_by: req.user.id, notes,
    }).returning('*');
    return success(res, record, 201);
  } catch (err) { return error(res, 'Failed to create medical record'); }
});

module.exports = router;
