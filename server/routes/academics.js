const router = require('express').Router();
const db = require('../config/database');
const { authenticate, authorize, schoolScope } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const { success, error } = require('../utils/response');
const { computeTotal, getGradeLetter, DEFAULT_GRADING_SCALE } = require('../utils/grading');
const { ensureSchoolDefaults } = require('../utils/schoolDefaults');

router.use(authenticate, schoolScope);

// POST /api/grades — Single grade entry
router.post(['/grades', '/'], authorize('school_admin', 'teacher'), validate(schemas.createGrade), async (req, res) => {
  try {
    const { student_id, subject_id, term_id, class_id, ca1_score, ca2_score, ca3_score, exam_score } = req.body;
    const total = computeTotal(ca1_score, ca2_score, ca3_score, exam_score);
    const { letter, remark } = getGradeLetter(total);

    const [grade] = await db('grades')
      .insert({
        school_id: req.schoolId,
        student_id, subject_id, term_id, class_id,
        teacher_id: req.user.id,
        ca1_score, ca2_score, ca3_score, exam_score,
        total, grade_letter: letter, remark,
      })
      .onConflict(['student_id', 'subject_id', 'term_id'])
      .merge()
      .returning('*');

    return success(res, grade, 201);
  } catch (err) {
    console.error('Grade entry error:', err);
    return error(res, 'Failed to save grade');
  }
});

// POST /api/grades/bulk — Bulk grade entry for a class-subject
router.post(['/grades/bulk', '/bulk'], authorize('school_admin', 'teacher'), validate(schemas.bulkGrades), async (req, res) => {
  try {
    const { subject_id, term_id, class_id, grades } = req.body;

    const school = await db('schools').where({ id: req.schoolId }).first();
    const gradingScale = school?.grading_scale || DEFAULT_GRADING_SCALE;

    const records = grades.map((g) => {
      const total = computeTotal(g.ca1_score, g.ca2_score, g.ca3_score, g.exam_score);
      const { letter, remark } = getGradeLetter(total, gradingScale);
      return {
        student_id: g.student_id,
        school_id: req.schoolId,
        subject_id, term_id, class_id,
        teacher_id: req.user.id,
        ca1_score: g.ca1_score, ca2_score: g.ca2_score,
        ca3_score: g.ca3_score, exam_score: g.exam_score,
        total, grade_letter: letter, remark,
      };
    });

    await db('grades')
      .insert(records)
      .onConflict(['student_id', 'subject_id', 'term_id'])
      .merge();

    return success(res, { message: `${records.length} grades saved`, count: records.length }, 201);
  } catch (err) {
    console.error('Bulk grade error:', err);
    return error(res, 'Failed to save grades');
  }
});

// GET /api/grades/class/:classId/term/:termId — All grades for a class term
router.get(['/grades/class/:classId/term/:termId', '/class/:classId/term/:termId'], async (req, res) => {
  try {
    const grades = await db('grades')
      .where({ 'grades.class_id': req.params.classId, 'grades.term_id': req.params.termId })
      .leftJoin('students', 'grades.student_id', 'students.id')
      .leftJoin('subjects', 'grades.subject_id', 'subjects.id')
      .select(
        'grades.*',
        db.raw("TRIM(COALESCE(students.first_name, '') || ' ' || COALESCE(students.last_name, '')) as student_name"),
        'students.admission_no',
        'subjects.name as subject_name'
      )
      .orderBy('students.last_name');

    return success(res, grades);
  } catch (err) {
    return error(res, 'Failed to fetch grades');
  }
});

// POST /api/grades/publish/:classId/:termId — Publish results
router.post(['/grades/publish/:classId/:termId', '/publish/:classId/:termId'], authorize('school_admin'), async (req, res) => {
  try {
    const updated = await db('grades')
      .where({ class_id: req.params.classId, term_id: req.params.termId })
      .update({ is_published: true });

    return success(res, { message: `${updated} grades published` });
  } catch (err) {
    return error(res, 'Failed to publish results');
  }
});

// ── Subjects ───────────────────────────────────────────

// GET /api/grades/subjects
router.get('/subjects', async (req, res) => {
  try {
    const subjects = await db('subjects')
      .where({ school_id: req.schoolId, is_active: true })
      .orderBy('name');
    return success(res, subjects);
  } catch (err) {
    return error(res, 'Failed to fetch subjects');
  }
});

// POST /api/grades/subjects
router.post('/subjects', authorize('school_admin'), async (req, res) => {
  try {
    const { name, code, is_elective, credit_units, category } = req.body;
    const [subject] = await db('subjects')
      .insert({ name, code, is_elective, credit_units, category, school_id: req.schoolId })
      .returning('*');
    return success(res, subject, 201);
  } catch (err) {
    return error(res, 'Failed to create subject');
  }
});

// PUT /api/academics/subjects/:id
router.put('/subjects/:id', authorize('school_admin'), async (req, res) => {
  try {
    const { name, code, is_elective, credit_units, category } = req.body;
    const [subject] = await db('subjects')
      .where({ id: req.params.id, school_id: req.schoolId })
      .update({ name, code, is_elective, credit_units, category, updated_at: db.fn.now() })
      .returning('*');
    if (!subject) return error(res, 'Subject not found', 404);
    return success(res, subject);
  } catch (err) {
    return error(res, 'Failed to update subject');
  }
});

// DELETE /api/academics/subjects/:id
router.delete('/subjects/:id', authorize('school_admin'), async (req, res) => {
  try {
    await db('subjects')
      .where({ id: req.params.id, school_id: req.schoolId })
      .update({ is_active: false, updated_at: db.fn.now() });
    return success(res, { message: 'Subject removed' });
  } catch (err) {
    return error(res, 'Failed to remove subject');
  }
});

// ── Terms ──────────────────────────────────────────────

// POST /api/academics/terms
router.post('/terms', authorize('school_admin', 'super_admin'), async (req, res) => {
  try {
    const { name, term_number, start_date, end_date, academic_year_id, is_current } = req.body;
    if (!name || !term_number) return error(res, 'Term name and number are required', 400);

    if (is_current) {
      await db('terms').where({ school_id: req.schoolId }).update({ is_current: false });
    }

    const [term] = await db('terms')
      .insert({ school_id: req.schoolId, name, term_number, start_date, end_date, academic_year_id, is_current: !!is_current })
      .returning('*');
    return success(res, term, 201);
  } catch (err) {
    return error(res, 'Failed to create term');
  }
});

// PUT /api/academics/terms/:id
router.put('/terms/:id', authorize('school_admin', 'super_admin'), async (req, res) => {
  try {
    const { name, term_number, start_date, end_date, is_current } = req.body;
    if (is_current) {
      await db('terms').where({ school_id: req.schoolId }).update({ is_current: false });
    }
    const [term] = await db('terms')
      .where({ id: req.params.id, school_id: req.schoolId })
      .update({ name, term_number, start_date, end_date, is_current: !!is_current, updated_at: db.fn.now() })
      .returning('*');
    if (!term) return error(res, 'Term not found', 404);
    return success(res, term);
  } catch (err) {
    return error(res, 'Failed to update term');
  }
});

// DELETE /api/academics/terms/:id
router.delete('/terms/:id', authorize('school_admin', 'super_admin'), async (req, res) => {
  try {
    await db('terms').where({ id: req.params.id, school_id: req.schoolId }).del();
    return success(res, { message: 'Term deleted' });
  } catch (err) {
    return error(res, 'Failed to delete term — it may have linked data');
  }
});

// GET /api/academics/years
router.get('/years', async (req, res) => {
  try {
    const years = await db('academic_years')
      .where({ school_id: req.schoolId })
      .orderBy('start_date', 'desc');
    return success(res, years);
  } catch (err) {
    return error(res, 'Failed to fetch academic years');
  }
});

// POST /api/academics/years
router.post('/years', authorize('school_admin', 'super_admin'), async (req, res) => {
  try {
    const { name, start_date, end_date, is_current } = req.body;
    if (!name) return error(res, 'Academic year name is required', 400);
    if (is_current) {
      await db('academic_years').where({ school_id: req.schoolId }).update({ is_current: false });
    }
    const [year] = await db('academic_years')
      .insert({ school_id: req.schoolId, name, start_date, end_date, is_current: !!is_current })
      .returning('*');
    return success(res, year, 201);
  } catch (err) {
    return error(res, 'Failed to create academic year');
  }
});

// ── Classes ────────────────────────────────────────────

// GET /api/grades/classes
router.get('/classes', async (req, res) => {
  try {
    const school = await db('schools').where({ id: req.schoolId }).first();
    if (school) await ensureSchoolDefaults(db, school);

    let classesQuery = db('classes')
      .where({ 'classes.school_id': req.schoolId, 'classes.is_active': true })
      .leftJoin('users as teacher', 'classes.class_teacher_id', 'teacher.id')
      .select(
        'classes.*',
        db.raw("TRIM(COALESCE(teacher.first_name, '') || ' ' || COALESCE(teacher.last_name, '')) as teacher_name")
      )
      .orderBy('classes.order_index');

    if (req.user.role === 'teacher') {
      const taughtClassIds = db('class_subjects')
        .where({ teacher_id: req.user.id })
        .select('class_id');
      classesQuery = classesQuery.where(function () {
        this.where('classes.class_teacher_id', req.user.id).orWhereIn('classes.id', taughtClassIds);
      });
    }

    const classes = await classesQuery;

    // Get student count per class
    const counts = await db('students')
      .where({ school_id: req.schoolId, status: 'active' })
      .groupBy('class_id')
      .select('class_id', db.raw('COUNT(*) as student_count'));

    const countMap = Object.fromEntries(counts.map((c) => [c.class_id, Number(c.student_count)]));

    const result = classes.map((c) => ({
      ...c,
      student_count: countMap[c.id] || 0,
    }));

    return success(res, result);
  } catch (err) {
    return error(res, 'Failed to fetch classes');
  }
});

router.post('/classes', authorize('school_admin', 'super_admin'), async (req, res) => {
  try {
    const { name, section, level, capacity, room_number, order_index } = req.body;
    if (!name || !level) return error(res, 'Class name and level are required', 400);

    const currentYear = await db('academic_years')
      .where({ school_id: req.schoolId, is_current: true })
      .first();

    const [cls] = await db('classes')
      .insert({
        school_id: req.schoolId,
        academic_year_id: currentYear?.id || null,
        name: name.trim(),
        section: section?.trim() || null,
        level,
        capacity: Number(capacity || 40),
        room_number: room_number?.trim() || null,
        order_index: Number(order_index || 0),
        is_active: true,
      })
      .returning('*');

    return success(res, cls, 201);
  } catch (err) {
    console.error('Create class error:', err);
    return error(res, 'Failed to create class');
  }
});

router.put('/classes/:id', authorize('school_admin', 'super_admin'), async (req, res) => {
  try {
    const allowed = ['name', 'section', 'level', 'capacity', 'room_number', 'order_index', 'is_active'];
    const updates = {};
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field] || null;
    });
    if (updates.capacity !== undefined) updates.capacity = Number(updates.capacity || 0);
    if (updates.order_index !== undefined) updates.order_index = Number(updates.order_index || 0);
    updates.updated_at = db.fn.now();

    const [cls] = await db('classes')
      .where({ id: req.params.id, school_id: req.schoolId })
      .update(updates)
      .returning('*');

    if (!cls) return error(res, 'Class not found', 404);
    return success(res, cls);
  } catch (err) {
    console.error('Update class error:', err);
    return error(res, 'Failed to update class');
  }
});

router.delete('/classes/:id', authorize('school_admin', 'super_admin'), async (req, res) => {
  try {
    await db('classes')
      .where({ id: req.params.id, school_id: req.schoolId })
      .update({ is_active: false, updated_at: db.fn.now() });
    return success(res, { message: 'Class removed' });
  } catch (err) {
    return error(res, 'Failed to remove class');
  }
});

// ── Terms ──────────────────────────────────────────────

// GET /api/grades/terms
router.get('/terms', async (req, res) => {
  try {
    const school = await db('schools').where({ id: req.schoolId }).first();
    if (school) await ensureSchoolDefaults(db, school);

    const terms = await db('terms')
      .where({ 'terms.school_id': req.schoolId })
      .leftJoin('academic_years', 'terms.academic_year_id', 'academic_years.id')
      .select('terms.*', 'academic_years.name as academic_year')
      .orderBy([{ column: 'academic_years.start_date', order: 'desc' }, { column: 'terms.term_number' }]);
    return success(res, terms);
  } catch (err) {
    return error(res, 'Failed to fetch terms');
  }
});

// GET /api/academics/teaching-profile - Teacher workload/profile setup
router.get('/teaching-profile', authorize('school_admin', 'super_admin', 'teacher'), async (req, res) => {
  try {
    const teacherId = req.user.role === 'teacher' ? req.user.id : req.query.teacher_id;
    if (!teacherId) return error(res, 'teacher_id is required', 400);

    const [teacher, assignments, timetable, classTeacherOf, classes, subjects] = await Promise.all([
      db('users')
        .where({ id: teacherId, school_id: req.schoolId, role: 'teacher' })
        .select('id', 'first_name', 'last_name', 'email', 'phone', 'qualification', 'avatar_url')
        .first(),
      db('class_subjects as cs')
        .join('classes as c', 'c.id', 'cs.class_id')
        .join('subjects as s', 's.id', 'cs.subject_id')
        .where({ 'cs.teacher_id': teacherId, 'c.school_id': req.schoolId })
        .select('cs.*', 'c.name as class_name', 'c.section', 's.name as subject_name', 's.code as subject_code')
        .orderBy(['c.order_index', 's.name']),
      db('timetable_slots as ts')
        .join('classes as c', 'c.id', 'ts.class_id')
        .join('subjects as s', 's.id', 'ts.subject_id')
        .where({ 'ts.teacher_id': teacherId, 'ts.school_id': req.schoolId })
        .select('ts.*', 'c.name as class_name', 's.name as subject_name')
        .orderByRaw("CASE day_of_week WHEN 'monday' THEN 1 WHEN 'tuesday' THEN 2 WHEN 'wednesday' THEN 3 WHEN 'thursday' THEN 4 WHEN 'friday' THEN 5 ELSE 6 END")
        .orderBy('ts.start_time'),
      db('classes')
        .where({ school_id: req.schoolId, class_teacher_id: teacherId, is_active: true })
        .select('id', 'name', 'section', 'level')
        .orderBy('order_index'),
      db('classes').where({ school_id: req.schoolId, is_active: true }).orderBy('order_index'),
      db('subjects').where({ school_id: req.schoolId, is_active: true }).orderBy('name'),
    ]);

    if (!teacher) return error(res, 'Teacher not found', 404);
    return success(res, { teacher, assignments, timetable, class_teacher_of: classTeacherOf, classes, subjects });
  } catch (err) {
    console.error('Teaching profile error:', err);
    return error(res, 'Failed to load teaching profile');
  }
});

// POST /api/academics/teaching-profile - Teachers can declare workload; admins can do it for any teacher
router.post('/teaching-profile', authorize('school_admin', 'super_admin', 'teacher'), async (req, res) => {
  try {
    const teacherId = req.user.role === 'teacher' ? req.user.id : req.body.teacher_id;
    const { class_id, subject_id, day_of_week, start_time, end_time, room, is_class_teacher } = req.body;
    if (!teacherId || !class_id || !subject_id) return error(res, 'teacher_id, class_id and subject_id are required', 400);

    const cls = await db('classes').where({ id: class_id, school_id: req.schoolId, is_active: true }).first();
    if (!cls) return error(res, 'Class not found', 404);

    await db('class_subjects')
      .insert({ class_id, subject_id, teacher_id: teacherId })
      .onConflict(['class_id', 'subject_id'])
      .merge(['teacher_id']);

    if (is_class_teacher) {
      await db('classes').where({ id: class_id, school_id: req.schoolId }).update({ class_teacher_id: teacherId });
    }

    let slot = null;
    if (day_of_week && start_time && end_time) {
      const conflict = await db('timetable_slots')
        .where({ school_id: req.schoolId, day_of_week })
        .where(function () {
          this.where({ class_id }).orWhere({ teacher_id: teacherId });
        })
        .where('start_time', '<', end_time)
        .where('end_time', '>', start_time)
        .first();
      if (conflict) return error(res, 'Time slot conflicts with an existing schedule', 409);

      [slot] = await db('timetable_slots')
        .insert({ school_id: req.schoolId, class_id, subject_id, teacher_id: teacherId, day_of_week, start_time, end_time, room })
        .returning('*');
    }

    return success(res, { message: 'Teaching profile updated', slot }, 201);
  } catch (err) {
    console.error('Update teaching profile error:', err);
    return error(res, 'Failed to update teaching profile');
  }
});

module.exports = router;
