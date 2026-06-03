const router = require('express').Router();
const db = require('../config/database');
const { authenticate, authorize, schoolScope } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const { success, error } = require('../utils/response');

router.use(authenticate, schoolScope);

// POST /api/attendance — Mark attendance for a class
router.post('/', authorize('school_admin', 'teacher'), validate(schemas.markAttendance), async (req, res) => {
  try {
    const { class_id, term_id, date, records } = req.body;

    const rows = records.map((r) => ({
      school_id: req.schoolId,
      student_id: r.student_id,
      class_id,
      term_id,
      date,
      status: r.status,
      marked_by: req.user.id,
      note: r.note || null,
    }));

    await db('attendance')
      .insert(rows)
      .onConflict(['student_id', 'date'])
      .merge();

    return success(res, { message: `Attendance marked for ${rows.length} students`, count: rows.length }, 201);
  } catch (err) {
    console.error('Mark attendance error:', err);
    return error(res, 'Failed to mark attendance');
  }
});

// GET /api/attendance/class/:classId/date/:date — Get attendance for a class on a date
router.get('/class/:classId/date/:date', async (req, res) => {
  try {
    const { classId, date } = req.params;

    const students = await db('students')
      .where({ class_id: classId, school_id: req.schoolId, status: 'active' })
      .select('id', 'first_name', 'last_name', 'admission_no')
      .orderBy('last_name');

    const records = await db('attendance')
      .where({ class_id: classId, school_id: req.schoolId, date })
      .select('student_id', 'status', 'note');

    const recordMap = Object.fromEntries(records.map((r) => [r.student_id, r]));

    const result = students.map((s) => ({
      ...s,
      status: recordMap[s.id]?.status || null,
      note: recordMap[s.id]?.note || null,
      marked: !!recordMap[s.id],
    }));

    return success(res, { date, class_id: classId, students: result });
  } catch (err) {
    return error(res, 'Failed to fetch attendance');
  }
});

// GET /api/attendance/student/:studentId/term/:termId — Student attendance summary
router.get('/student/:studentId/term/:termId', async (req, res) => {
  try {
    const { studentId, termId } = req.params;

    const summary = await db('attendance')
      .where({ student_id: studentId, term_id: termId })
      .select(
        db.raw("COUNT(*) FILTER (WHERE status = 'present') as present"),
        db.raw("COUNT(*) FILTER (WHERE status = 'absent') as absent"),
        db.raw("COUNT(*) FILTER (WHERE status = 'late') as late"),
        db.raw("COUNT(*) FILTER (WHERE status = 'excused') as excused"),
        db.raw('COUNT(*) as total')
      )
      .first();

    const daily = await db('attendance')
      .where({ student_id: studentId, term_id: termId })
      .select('date', 'status', 'note')
      .orderBy('date', 'desc');

    return success(res, {
      summary: {
        present: Number(summary.present),
        absent: Number(summary.absent),
        late: Number(summary.late),
        excused: Number(summary.excused),
        total: Number(summary.total),
        rate: summary.total > 0
          ? parseFloat(((Number(summary.present) / Number(summary.total)) * 100).toFixed(1))
          : 0,
      },
      daily,
    });
  } catch (err) {
    return error(res, 'Failed to fetch attendance summary');
  }
});

// GET /api/attendance/class/:classId/summary/:termId — Class attendance overview
router.get('/class/:classId/summary/:termId', async (req, res) => {
  try {
    const { classId, termId } = req.params;

    const summary = await db('attendance')
      .where({ 'attendance.class_id': classId, 'attendance.term_id': termId })
      .leftJoin('students', 'attendance.student_id', 'students.id')
      .groupBy('students.id', 'students.first_name', 'students.last_name', 'students.admission_no')
      .select(
        'students.id',
        'students.first_name',
        'students.last_name',
        'students.admission_no',
        db.raw("COUNT(*) FILTER (WHERE status = 'present') as present"),
        db.raw("COUNT(*) FILTER (WHERE status = 'absent') as absent"),
        db.raw('COUNT(*) as total')
      )
      .orderBy('students.last_name');

    return success(res, summary);
  } catch (err) {
    return error(res, 'Failed to fetch class attendance');
  }
});

module.exports = router;
