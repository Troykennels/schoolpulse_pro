const router = require('express').Router();
const db = require('../config/database');
const { authenticate, authorize, schoolScope } = require('../middleware/auth');
const { success, error } = require('../utils/response');

function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - Number(days || 0));
  return date.toISOString().split('T')[0];
}

// GET /api/dashboard/overview - School-wide stats
router.get('/overview', authenticate, authorize('school_admin', 'super_admin'), schoolScope, async (req, res) => {
  try {
    const schoolId = req.user.school_id;

    const [students, staff, classes, currentTerm] = await Promise.all([
      db('students').where({ school_id: schoolId, status: 'active' }).count('id as count').first(),
      db('users').where({ school_id: schoolId }).whereIn('role', ['teacher', 'staff', 'accountant']).where({ is_active: true }).count('id as count').first(),
      db('classes').where({ school_id: schoolId, is_active: true }).count('id as count').first(),
      db('terms').where({ school_id: schoolId, is_current: true }).first()
    ]);

    // Fee collection summary for current term
    let feeStats = { total_expected: 0, total_collected: 0, collection_rate: 0 };
    if (currentTerm) {
      const fees = await db('fee_structures')
        .where({ school_id: schoolId, term_id: currentTerm.id, is_active: true })
        .sum('amount as total').first();

      const studentCount = parseInt(students.count);
      feeStats.total_expected = parseFloat(fees.total || 0) * studentCount;

      const collected = await db('payments')
        .where({ school_id: schoolId, status: 'success' })
        .whereIn('fee_structure_id', db('fee_structures').where({ term_id: currentTerm.id, school_id: schoolId }).select('id'))
        .sum('amount_paid as total').first();

      feeStats.total_collected = parseFloat(collected.total || 0);
      feeStats.collection_rate = feeStats.total_expected > 0 ? Math.round((feeStats.total_collected / feeStats.total_expected) * 100) : 0;
    }

    // Today's attendance
    const today = new Date().toISOString().split('T')[0];
    const attendanceToday = await db('attendance')
      .where({ school_id: schoolId, date: today })
      .select('status')
      .then(rows => {
        const total = rows.length;
        const present = rows.filter(r => r.status === 'present').length;
        return { total_marked: total, present, rate: total > 0 ? Math.round((present / total) * 100) : 0 };
      });

    // Recent announcements
    const recentAnnouncements = await db('announcements')
      .where({ school_id: schoolId })
      .orderBy('created_at', 'desc')
      .limit(5)
      .select('id', 'title', 'priority', 'target_audience', 'created_at');

    return success(res, {
      counts: {
        students: parseInt(students.count),
        staff: parseInt(staff.count),
        classes: parseInt(classes.count)
      },
      current_term: currentTerm,
      fee_collection: feeStats,
      attendance_today: attendanceToday,
      recent_announcements: recentAnnouncements
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    return error(res, 'Failed to load dashboard');
  }
});

// GET /api/dashboard/academic-performance - Class-wise performance analysis
router.get('/academic-performance', authenticate, authorize('school_admin', 'teacher'), schoolScope, async (req, res) => {
  try {
    const { term_id } = req.query;
    const schoolId = req.user.school_id;

    if (!term_id) return error(res, 'term_id is required', 400);

    const classes = await db('classes').where({ school_id: schoolId, is_active: true });

    const performance = await Promise.all(classes.map(async (cls) => {
      const grades = await db('grades')
        .where({ class_id: cls.id, term_id, school_id: schoolId });

      if (!grades.length) return { class_id: cls.id, class_name: cls.name, level: cls.level, avg: 0, student_count: 0 };

      const studentGrades = {};
      grades.forEach(g => {
        if (!studentGrades[g.student_id]) studentGrades[g.student_id] = [];
        studentGrades[g.student_id].push(parseFloat(g.total || 0));
      });

      const averages = Object.values(studentGrades).map(sg => sg.reduce((a, b) => a + b, 0) / sg.length);
      const classAvg = averages.length ? averages.reduce((a, b) => a + b, 0) / averages.length : 0;

      return {
        class_id: cls.id,
        class_name: cls.name,
        level: cls.level,
        avg: Math.round(classAvg * 10) / 10,
        student_count: Object.keys(studentGrades).length,
        grade_distribution: {
          A: averages.filter(a => a >= 70).length,
          B: averages.filter(a => a >= 60 && a < 70).length,
          C: averages.filter(a => a >= 50 && a < 60).length,
          D: averages.filter(a => a >= 45 && a < 50).length,
          E: averages.filter(a => a >= 40 && a < 45).length,
          F: averages.filter(a => a < 40).length
        }
      };
    }));

    return success(res, performance);
  } catch (err) {
    return error(res, 'Failed to load academic performance');
  }
});

// GET /api/dashboard/teacher - Class-teacher workspace
router.get('/teacher', authenticate, authorize('teacher'), schoolScope, async (req, res) => {
  try {
    const teacherId = req.user.id;
    const schoolId = req.user.school_id;

    const assignedClasses = await db('classes')
      .where({ school_id: schoolId, class_teacher_id: teacherId, is_active: true })
      .orderBy('order_index');

    const taughtSubjects = await db('class_subjects as cs')
      .where({ 'cs.teacher_id': teacherId })
      .join('classes as c', 'c.id', 'cs.class_id')
      .join('subjects as s', 's.id', 'cs.subject_id')
      .select('cs.class_id', 'c.name as class_name', 's.name as subject_name', 's.code as subject_code')
      .orderBy(['c.order_index', 's.name']);

    const currentTerm = await db('terms')
      .where({ school_id: schoolId, is_current: true })
      .first();

    const classProfiles = await Promise.all(assignedClasses.map(async (cls) => {
      const students = await db('students')
        .where({ school_id: schoolId, class_id: cls.id, status: 'active' })
        .select('id', 'first_name', 'last_name', 'admission_no');

      const studentIds = students.map((student) => student.id);
      const attendanceRows = studentIds.length
        ? await db('attendance')
          .whereIn('student_id', studentIds)
          .where({ class_id: cls.id })
          .where('date', '>=', daysAgo(14))
          .select('status')
        : [];

      const present = attendanceRows.filter((row) => row.status === 'present').length;
      const attendanceRate = attendanceRows.length ? Math.round((present / attendanceRows.length) * 100) : 0;

      const gradeRows = currentTerm && studentIds.length
        ? await db('grades')
          .where({ class_id: cls.id, term_id: currentTerm.id, is_published: true })
          .whereIn('student_id', studentIds)
          .select('student_id', 'total')
        : [];

      const averagesByStudent = {};
      gradeRows.forEach((grade) => {
        if (!averagesByStudent[grade.student_id]) averagesByStudent[grade.student_id] = [];
        averagesByStudent[grade.student_id].push(Number(grade.total || 0));
      });
      const averages = Object.values(averagesByStudent).map((scores) => scores.reduce((sum, score) => sum + score, 0) / scores.length);
      const classAverage = averages.length ? Math.round((averages.reduce((sum, score) => sum + score, 0) / averages.length) * 10) / 10 : 0;

      const atRisk = students.filter((student) => {
        const scores = averagesByStudent[student.id] || [];
        if (!scores.length) return false;
        const avg = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        return avg < 50;
      }).length;

      return {
        ...cls,
        student_count: students.length,
        attendance_rate: attendanceRate,
        class_average: classAverage,
        at_risk: atRisk,
      };
    }));

    const todaysAttendance = await db('attendance')
      .where({ school_id: schoolId, marked_by: teacherId, date: new Date().toISOString().split('T')[0] })
      .count('id as count')
      .first();

    return success(res, {
      current_term: currentTerm,
      assigned_classes: classProfiles,
      taught_subjects: taughtSubjects,
      counts: {
        assigned_classes: assignedClasses.length,
        taught_subjects: taughtSubjects.length,
        attendance_marked_today: Number(todaysAttendance.count || 0),
      },
    });
  } catch (err) {
    console.error('Teacher dashboard error:', err);
    return error(res, 'Failed to load teacher dashboard');
  }
});

// GET /api/dashboard/staff - Operational staff workspace
router.get('/staff', authenticate, authorize('accountant', 'staff'), schoolScope, async (req, res) => {
  try {
    const schoolId = req.user.school_id;
    const currentTerm = await db('terms').where({ school_id: schoolId, is_current: true }).first();

    const [students, payments, announcements] = await Promise.all([
      db('students').where({ school_id: schoolId, status: 'active' }).count('id as count').first(),
      db('payments').where({ school_id: schoolId, status: 'success' }).sum('amount_paid as total').count('id as count').first(),
      db('announcements').where({ school_id: schoolId }).orderBy('created_at', 'desc').limit(5),
    ]);

    return success(res, {
      current_term: currentTerm,
      counts: {
        students: Number(students.count || 0),
        payments: Number(payments.count || 0),
      },
      fee_collection: {
        total_collected: Number(payments.total || 0),
      },
      recent_announcements: announcements,
    });
  } catch (err) {
    console.error('Staff dashboard error:', err);
    return error(res, 'Failed to load staff dashboard');
  }
});

// GET /api/dashboard/student - Student learning workspace
router.get('/student', authenticate, authorize('student'), schoolScope, async (req, res) => {
  try {
    const banks = await db('quiz_banks')
      .where({ school_id: req.user.school_id, is_published: true })
      .count('id as count')
      .first();

    const attempts = await db('quiz_attempts')
      .where({ school_id: req.user.school_id, user_id: req.user.id })
      .orderBy('created_at', 'desc')
      .limit(5);

    const avg = attempts.length
      ? Math.round(attempts.reduce((sum, attempt) => sum + ((Number(attempt.score) / Math.max(Number(attempt.total), 1)) * 100), 0) / attempts.length)
      : 0;

    return success(res, {
      counts: { quiz_banks: Number(banks.count || 0), attempts: attempts.length },
      average_score: avg,
      recent_attempts: attempts,
    });
  } catch (err) {
    console.error('Student dashboard error:', err);
    return error(res, 'Failed to load student dashboard');
  }
});

// GET /api/dashboard/attendance-trends
router.get('/attendance-trends', authenticate, authorize('school_admin', 'teacher'), schoolScope, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const schoolId = req.user.school_id;

    const trends = await db('attendance')
      .where({ school_id: schoolId })
      .where('date', '>=', daysAgo(parseInt(days)))
      .groupBy('date')
      .select('date')
      .count('id as total')
      .select(db.raw("SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_count"))
      .orderBy('date');

    const formatted = trends.map(t => ({
      date: t.date,
      total: parseInt(t.total),
      present: parseInt(t.present_count),
      rate: parseInt(t.total) > 0 ? Math.round((parseInt(t.present_count) / parseInt(t.total)) * 100) : 0
    }));

    return success(res, formatted);
  } catch (err) {
    return error(res, 'Failed to load attendance trends');
  }
});

// GET /api/dashboard/parent - Parent's own children overview
router.get('/parent', authenticate, authorize('parent'), async (req, res) => {
  try {
    const children = await db('students')
      .where({ parent_id: req.user.id, status: 'active' })
      .join('classes as c', 'c.id', 'students.class_id')
      .select('students.*', 'c.name as class_name', 'c.level');

    const currentTerm = await db('terms')
      .where({ school_id: req.user.school_id, is_current: true }).first();

    const childrenData = await Promise.all(children.map(async (child) => {
      const [recentGrades, attendanceSummary, feeBalance] = await Promise.all([
        currentTerm ? db('grades')
          .where({ student_id: child.id, term_id: currentTerm.id })
          .join('subjects as sub', 'sub.id', 'grades.subject_id')
          .select('sub.name as subject', 'grades.total', 'grades.grade_letter', 'grades.remark')
          .orderBy('sub.name') : [],
        currentTerm ? db('attendance')
          .where({ student_id: child.id })
          .where('date', '>=', currentTerm.start_date)
          .select('status')
          .then(rows => ({
            total: rows.length,
            present: rows.filter(r => r.status === 'present').length,
            absent: rows.filter(r => r.status === 'absent').length,
            late: rows.filter(r => r.status === 'late').length
          })) : { total: 0, present: 0, absent: 0, late: 0 },
        currentTerm ? db('payments')
          .where({ student_id: child.id, status: 'success' })
          .sum('amount_paid as paid').first()
          .then(async (p) => {
            const fees = await db('fee_structures')
              .where({ class_id: child.class_id, term_id: currentTerm.id })
              .sum('amount as total').first();
            return { total: parseFloat(fees.total || 0), paid: parseFloat(p.paid || 0), balance: parseFloat(fees.total || 0) - parseFloat(p.paid || 0) };
          }) : { total: 0, paid: 0, balance: 0 }
      ]);

      const avg = recentGrades.length
        ? Math.round(recentGrades.reduce((sum, grade) => sum + Number(grade.total || 0), 0) / recentGrades.length)
        : 0;

      const behavioural = currentTerm
        ? await db('behavioural_traits')
          .where({ student_id: child.id, term_id: currentTerm.id })
          .first()
        : null;

      const notifications = await db('student_notifications as n')
        .leftJoin('users as u', 'u.id', 'n.created_by')
        .where({ 'n.student_id': child.id, 'n.visible_to_parent': true })
        .select('n.*', db.raw("COALESCE(u.first_name || ' ' || u.last_name, 'School') as author_name"))
        .orderBy('n.created_at', 'desc')
        .limit(5);

      return {
        ...child,
        grades: recentGrades,
        performance: {
          average: avg,
          grade: avg >= 70 ? 'A' : avg >= 60 ? 'B' : avg >= 50 ? 'C' : avg >= 45 ? 'D' : avg >= 40 ? 'E' : 'F',
          strongest_subject: [...recentGrades].sort((a, b) => Number(b.total) - Number(a.total))[0] || null,
          support_subject: [...recentGrades].sort((a, b) => Number(a.total) - Number(b.total))[0] || null,
        },
        attendance: attendanceSummary,
        fees: feeBalance,
        behavioural_traits: behavioural,
        notifications,
      };
    }));

    return success(res, { children: childrenData, current_term: currentTerm });
  } catch (err) {
    console.error('Parent dashboard error:', err);
    return error(res, 'Failed to load parent dashboard');
  }
});

module.exports = router;
