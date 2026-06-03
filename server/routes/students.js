const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { authenticate, authorize, schoolScope } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const { success, error, paginate, paginationMeta } = require('../utils/response');

router.use(authenticate, schoolScope);

// GET /api/students — List students with search + filters
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, class_id, status = 'active', gender } = req.query;

    let query = db('students')
      .where({ 'students.school_id': req.schoolId, 'students.status': status })
      .leftJoin('classes', 'students.class_id', 'classes.id')
      .leftJoin('users as parent', 'students.parent_id', 'parent.id')
      .select(
        'students.*',
        'classes.name as class_name',
        'classes.section as class_section',
        db.raw("TRIM(COALESCE(parent.first_name, '') || ' ' || COALESCE(parent.last_name, '')) as parent_name"),
        'parent.phone as parent_phone',
        'parent.email as parent_email'
      );

    if (req.user.role === 'teacher') {
      const assignedClassIds = db('classes')
        .where({ school_id: req.schoolId, class_teacher_id: req.user.id, is_active: true })
        .select('id');
      query = query.whereIn('students.class_id', assignedClassIds);
    }

    if (search) {
      query = query.where(function () {
        this.whereILike('students.first_name', `%${search}%`)
          .orWhereILike('students.last_name', `%${search}%`)
          .orWhereILike('students.admission_no', `%${search}%`);
      });
    }

    if (class_id) query = query.where('students.class_id', class_id);
    if (gender) query = query.where('students.gender', gender);

    const countQuery = query.clone().clearSelect().count('students.id as count').first();
    const [{ count }] = await Promise.all([countQuery]);

    const students = await paginate(
      query.orderBy('students.last_name', 'asc'),
      page,
      limit
    );

    return success(res, {
      students,
      pagination: paginationMeta(Number(count), page, limit),
    });
  } catch (err) {
    console.error('List students error:', err);
    return error(res, 'Failed to fetch students');
  }
});

// GET /api/students/:id — Single student with full profile
router.get('/:id', async (req, res) => {
  try {
    const student = await db('students')
      .where({ 'students.id': req.params.id, 'students.school_id': req.schoolId })
      .leftJoin('classes', 'students.class_id', 'classes.id')
      .leftJoin('users as parent', 'students.parent_id', 'parent.id')
      .select(
        'students.*',
        'classes.name as class_name',
        'classes.section as class_section',
        db.raw("TRIM(COALESCE(parent.first_name, '') || ' ' || COALESCE(parent.last_name, '')) as parent_name"),
        'parent.phone as parent_phone',
        'parent.email as parent_email'
      )
      .first();

    if (!student) return error(res, 'Student not found', 404);

    return success(res, student);
  } catch (err) {
    return error(res, 'Failed to fetch student');
  }
});

// POST /api/students — Create student
router.post('/', authorize('school_admin', 'super_admin', 'staff'), validate(schemas.createStudent), async (req, res) => {
  try {
    const { parent, ...studentInput } = req.body;
    const data = { ...studentInput, school_id: req.schoolId };

    const exists = await db('students')
      .where({ school_id: req.schoolId, admission_no: data.admission_no })
      .first();
    if (exists) return error(res, 'Admission number already exists', 409);

    const result = await db.transaction(async (trx) => {
      let parentAccount = null;

      if (!data.parent_id && parent?.email) {
        parentAccount = await trx('users')
          .where(function () {
            this.where({ email: parent.email });
            if (parent.phone) this.orWhere({ phone: parent.phone });
          })
          .first();

        if (parentAccount && parentAccount.school_id !== req.schoolId) {
          throw Object.assign(new Error('Parent email or phone already belongs to another school'), { statusCode: 409 });
        }

        if (!parentAccount) {
          const password_hash = await bcrypt.hash(parent.password || 'password123', 12);
          [parentAccount] = await trx('users')
            .insert({
              school_id: req.schoolId,
              role: 'parent',
              first_name: parent.first_name,
              last_name: parent.last_name,
              email: parent.email,
              phone: parent.phone || null,
              password_hash,
              avatar_url: parent.avatar_url || null,
              address: parent.address || data.address || null,
            })
            .returning(['id', 'first_name', 'last_name', 'email', 'phone', 'role']);
        }

        data.parent_id = parentAccount.id;
      }

      const [student] = await trx('students').insert(data).returning('*');

      await trx('activity_logs').insert({
        school_id: req.schoolId,
        user_id: req.user.id,
        action: 'student_created',
        entity_type: 'student',
        entity_id: student.id,
        details: JSON.stringify({
          admission_no: student.admission_no,
          parent_login: parentAccount ? parentAccount.email : undefined,
        }),
      });

      return { student, parent: parentAccount };
    });

    return success(res, result, 201);
  } catch (err) {
    console.error('Create student error:', err);
    if (err.statusCode) return error(res, err.message, err.statusCode);
    if (err.code === '23505') return error(res, 'Admission number, parent email, or parent phone already exists', 409);
    return error(res, 'Failed to create student');
  }
});

// PUT /api/students/:id — Update student
router.put('/:id', authorize('school_admin', 'teacher', 'staff'), async (req, res) => {
  try {
    const [student] = await db('students')
      .where({ id: req.params.id, school_id: req.schoolId })
      .update({ ...req.body, updated_at: new Date() })
      .returning('*');

    if (!student) return error(res, 'Student not found', 404);

    return success(res, student);
  } catch (err) {
    return error(res, 'Failed to update student');
  }
});

// DELETE /api/students/:id — Soft delete (change status)
router.delete('/:id', authorize('school_admin', 'super_admin'), async (req, res) => {
  try {
    await db('students')
      .where({ id: req.params.id, school_id: req.schoolId })
      .update({ status: 'withdrawn', updated_at: new Date() });

    return success(res, { message: 'Student withdrawn successfully' });
  } catch (err) {
    return error(res, 'Failed to remove student');
  }
});

// GET /api/students/:id/report-card/:termId — Generate report card
router.get('/:id/report-card/:termId', async (req, res) => {
  try {
    const { id, termId } = req.params;
    const grading = require('../utils/grading');

    const student = await db('students')
      .where({ 'students.id': id })
      .leftJoin('classes', 'students.class_id', 'classes.id')
      .select('students.*', 'classes.name as class_name', 'classes.section as class_section')
      .first();

    if (!student) return error(res, 'Student not found', 404);

    const term = await db('terms').where({ id: termId }).first();
    const school = await db('schools').where({ id: student.school_id }).first();

    // Get student's grades for this term
    const studentGrades = await db('grades')
      .where({ 'grades.student_id': id, 'grades.term_id': termId })
      .leftJoin('subjects', 'grades.subject_id', 'subjects.id')
      .select('grades.*', 'subjects.name as subject_name');

    // Get all class grades for comparison
    const classGrades = await db('grades')
      .where({ 'grades.class_id': student.class_id, 'grades.term_id': termId })
      .leftJoin('subjects', 'grades.subject_id', 'subjects.id')
      .select('grades.*', 'subjects.name as subject_name');

    // Get behavioural traits
    const traits = await db('behavioural_traits')
      .where({ student_id: id, term_id: termId })
      .first();

    // Get attendance summary
    const attendance = await db('attendance')
      .where({ student_id: id, term_id: termId })
      .select(
        db.raw("COUNT(*) FILTER (WHERE status = 'present') as days_present"),
        db.raw("COUNT(*) FILTER (WHERE status = 'absent') as days_absent"),
        db.raw("COUNT(*) FILTER (WHERE status = 'late') as days_late"),
        db.raw('COUNT(*) as total_days')
      )
      .first();

    const gradingScale = school.grading_scale || grading.DEFAULT_GRADING_SCALE;
    const reportData = grading.generateReportCardData(studentGrades, classGrades, gradingScale);

    return success(res, {
      student,
      school: { name: school.name, logo_url: school.logo_url, motto: school.motto, address: school.address },
      term,
      academics: reportData,
      attendance: {
        present: Number(attendance?.days_present || 0),
        absent: Number(attendance?.days_absent || 0),
        late: Number(attendance?.days_late || 0),
        total: Number(attendance?.total_days || 0),
      },
      behavioural_traits: traits || null,
    });
  } catch (err) {
    console.error('Report card error:', err);
    return error(res, 'Failed to generate report card');
  }
});

module.exports = router;
