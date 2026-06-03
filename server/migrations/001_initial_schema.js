/**
 * SchoolPulse v2 — International School Intelligence Platform
 * Complete database schema supporting:
 *   - Multi-curriculum (IB, British, American, CBSE, Nigerian, custom)
 *   - Multi-currency fee management
 *   - Academic year/semester/trimester/term structures
 *   - Comprehensive grading systems (GPA, percentage, letter, custom)
 *   - Event calendar, discipline tracking, library management
 *   - Parent-teacher communications
 *   - Report card generation with international formats
 *   - Staff chat, quiz/learning hub, notifications
 *   - Role-based access: super_admin, school_admin, teacher, parent, student, accountant, staff
 */
exports.up = async function (knex) {

  // ── 1. Schools ──────────────────────────────────────────
  await knex.schema.createTable('schools', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.string('name').notNullable();
    t.string('code').unique().notNullable();
    t.string('address');
    t.string('city');
    t.string('state_province');
    t.string('country').defaultTo('Nigeria');
    t.string('postal_code');
    t.string('region');
    t.enu('school_type', ['nursery', 'primary', 'secondary', 'combined', 'k12', 'international']).defaultTo('international');
    t.enu('curriculum', ['nigerian', 'british', 'american', 'ib', 'cbse', 'french', 'custom']).defaultTo('british');
    t.string('logo_url');
    t.string('phone');
    t.string('email');
    t.string('website');
    t.string('motto');
    t.string('timezone').defaultTo('Africa/Lagos');
    t.string('default_currency').defaultTo('USD');
    t.string('locale').defaultTo('en');
    t.jsonb('settings').defaultTo('{}');
    t.jsonb('grading_scale').defaultTo(JSON.stringify({
      A: { min: 70, max: 100, remark: 'Excellent', gpa: 4.0 },
      B: { min: 60, max: 69, remark: 'Very Good', gpa: 3.0 },
      C: { min: 50, max: 59, remark: 'Good', gpa: 2.0 },
      D: { min: 45, max: 49, remark: 'Fair', gpa: 1.0 },
      E: { min: 40, max: 44, remark: 'Poor', gpa: 0.5 },
      F: { min: 0, max: 39, remark: 'Fail', gpa: 0.0 },
    }));
    t.jsonb('academic_structure').defaultTo(JSON.stringify({
      type: 'term', // 'term' | 'semester' | 'trimester' | 'quarter'
      periods_per_year: 3,
      assessment_weights: { ca1: 10, ca2: 10, ca3: 10, exam: 70 }
    }));
    t.boolean('is_active').defaultTo(true);
    t.timestamps(true, true);
  });

  // ── 2. Users ────────────────────────────────────────────
  await knex.schema.createTable('users', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE');
    t.string('email').unique();
    t.string('phone').unique();
    t.string('password_hash').notNullable();
    t.enu('role', ['super_admin', 'school_admin', 'teacher', 'parent', 'student', 'accountant', 'staff']).notNullable();
    t.string('first_name').notNullable();
    t.string('last_name').notNullable();
    t.string('avatar_url');
    t.string('gender');
    t.date('date_of_birth');
    t.text('address');
    t.string('nationality');
    t.string('state_of_origin');
    t.string('qualification');
    t.string('employee_id');
    t.string('preferred_language').defaultTo('en');
    t.jsonb('permissions').defaultTo('[]');
    t.boolean('is_active').defaultTo(true);
    t.boolean('email_verified').defaultTo(false);
    t.timestamp('last_login');
    t.string('password_reset_token');
    t.timestamp('password_reset_expires');
    t.timestamps(true, true);
  });

  // ── 3. Academic Years ───────────────────────────────────
  await knex.schema.createTable('academic_years', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE');
    t.string('name').notNullable();
    t.date('start_date').notNullable();
    t.date('end_date').notNullable();
    t.boolean('is_current').defaultTo(false);
    t.timestamps(true, true);
  });

  // ── 4. Terms / Semesters ────────────────────────────────
  await knex.schema.createTable('terms', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE');
    t.uuid('academic_year_id').references('id').inTable('academic_years').onDelete('CASCADE');
    t.string('name').notNullable();
    t.integer('term_number').notNullable();
    t.date('start_date').notNullable();
    t.date('end_date').notNullable();
    t.date('mid_term_break_start');
    t.date('mid_term_break_end');
    t.boolean('is_current').defaultTo(false);
    t.timestamps(true, true);
  });

  // ── 5. Classes / Grades / Year Groups ───────────────────
  await knex.schema.createTable('classes', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE');
    t.string('name').notNullable();
    t.string('section');
    t.uuid('class_teacher_id').references('id').inTable('users');
    t.uuid('academic_year_id').references('id').inTable('academic_years');
    t.integer('capacity').defaultTo(40);
    t.enu('level', ['nursery', 'primary', 'junior_secondary', 'senior_secondary', 'as_level', 'a_level', 'ib_myp', 'ib_dp', 'grade_k', 'grade_1_5', 'grade_6_8', 'grade_9_12']).notNullable();
    t.integer('order_index').defaultTo(0);
    t.string('room_number');
    t.boolean('is_active').defaultTo(true);
    t.timestamps(true, true);
  });

  // ── 6. Subjects ─────────────────────────────────────────
  await knex.schema.createTable('subjects', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE');
    t.string('name').notNullable();
    t.string('code');
    t.boolean('is_elective').defaultTo(false);
    t.integer('credit_units').defaultTo(1);
    t.enu('category', ['science', 'arts', 'commercial', 'vocational', 'general', 'languages', 'mathematics', 'humanities', 'technology', 'physical_education', 'creative_arts']).defaultTo('general');
    t.string('department');
    t.boolean('is_active').defaultTo(true);
    t.timestamps(true, true);
  });

  // ── 7. Class-Subject mapping ────────────────────────────
  await knex.schema.createTable('class_subjects', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('class_id').references('id').inTable('classes').onDelete('CASCADE');
    t.uuid('subject_id').references('id').inTable('subjects').onDelete('CASCADE');
    t.uuid('teacher_id').references('id').inTable('users');
    t.unique(['class_id', 'subject_id']);
  });

  // ── 8. Students ─────────────────────────────────────────
  await knex.schema.createTable('students', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE');
    t.uuid('class_id').references('id').inTable('classes');
    t.uuid('parent_id').references('id').inTable('users');
    t.string('admission_no').notNullable();
    t.string('first_name').notNullable();
    t.string('last_name').notNullable();
    t.string('other_names');
    t.date('date_of_birth');
    t.enu('gender', ['male', 'female', 'other']).notNullable();
    t.string('blood_group');
    t.string('genotype');
    t.string('nationality').defaultTo('Nigerian');
    t.string('state_of_origin');
    t.string('lga_of_origin');
    t.string('religion');
    t.text('address');
    t.string('photo_url');
    t.string('passport_no');
    t.string('visa_status');
    t.string('primary_language');
    t.string('secondary_language');
    t.jsonb('medical_info').defaultTo('{}');
    t.jsonb('emergency_contact').defaultTo('{}');
    t.jsonb('previous_school').defaultTo('{}');
    t.date('admission_date');
    t.enu('status', ['active', 'graduated', 'withdrawn', 'suspended', 'expelled', 'transferred']).defaultTo('active');
    t.enu('boarding_status', ['day', 'boarding', 'half_boarding']).defaultTo('day');
    t.text('special_needs');
    t.text('allergies');
    t.timestamps(true, true);
    t.unique(['school_id', 'admission_no']);
  });

  // ── 9. Grades / Assessment Results ──────────────────────
  await knex.schema.createTable('grades', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE');
    t.uuid('student_id').references('id').inTable('students').onDelete('CASCADE');
    t.uuid('subject_id').references('id').inTable('subjects').onDelete('CASCADE');
    t.uuid('term_id').references('id').inTable('terms').onDelete('CASCADE');
    t.uuid('class_id').references('id').inTable('classes');
    t.uuid('teacher_id').references('id').inTable('users');
    t.decimal('ca1_score', 5, 2).defaultTo(0);
    t.decimal('ca2_score', 5, 2).defaultTo(0);
    t.decimal('ca3_score', 5, 2).defaultTo(0);
    t.decimal('exam_score', 5, 2).defaultTo(0);
    t.decimal('total', 5, 2).defaultTo(0);
    t.decimal('gpa_points', 3, 1).defaultTo(0);
    t.string('grade_letter');
    t.string('remark');
    t.integer('position_in_subject');
    t.text('teacher_comment');
    t.boolean('is_published').defaultTo(false);
    t.timestamps(true, true);
    t.unique(['student_id', 'subject_id', 'term_id']);
  });

  // ── 10. Attendance ──────────────────────────────────────
  await knex.schema.createTable('attendance', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE');
    t.uuid('student_id').references('id').inTable('students').onDelete('CASCADE');
    t.uuid('class_id').references('id').inTable('classes').onDelete('CASCADE');
    t.uuid('term_id').references('id').inTable('terms');
    t.date('date').notNullable();
    t.enu('status', ['present', 'absent', 'late', 'excused', 'sick']).notNullable();
    t.uuid('marked_by').references('id').inTable('users');
    t.text('note');
    t.time('arrival_time');
    t.timestamps(true, true);
    t.unique(['student_id', 'date']);
  });

  // ── 11. Fee Structures ──────────────────────────────────
  await knex.schema.createTable('fee_structures', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE');
    t.uuid('term_id').references('id').inTable('terms');
    t.uuid('class_id').references('id').inTable('classes');
    t.string('name').notNullable();
    t.decimal('amount', 14, 2).notNullable();
    t.string('currency').defaultTo('USD');
    t.enu('fee_type', ['tuition', 'development', 'uniform', 'books', 'transport', 'feeding', 'pta', 'exam', 'boarding', 'activity', 'technology', 'insurance', 'other']).defaultTo('other');
    t.boolean('is_mandatory').defaultTo(true);
    t.text('description');
    t.date('due_date');
    t.boolean('is_active').defaultTo(true);
    t.timestamps(true, true);
  });

  // ── 12. Payments ────────────────────────────────────────
  await knex.schema.createTable('payments', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('student_id').references('id').inTable('students').onDelete('CASCADE');
    t.uuid('fee_structure_id').references('id').inTable('fee_structures');
    t.uuid('school_id').references('id').inTable('schools');
    t.uuid('term_id').references('id').inTable('terms');
    t.decimal('amount_paid', 14, 2).notNullable();
    t.decimal('balance', 14, 2).defaultTo(0);
    t.string('currency').defaultTo('USD');
    t.string('reference').unique();
    t.enu('payment_method', ['cash', 'bank_transfer', 'paystack', 'flutterwave', 'stripe', 'pos', 'mobile_money', 'check']).defaultTo('cash');
    t.enu('status', ['pending', 'success', 'failed', 'refunded']).defaultTo('pending');
    t.uuid('recorded_by').references('id').inTable('users');
    t.text('notes');
    t.string('receipt_no');
    t.jsonb('gateway_response');
    t.timestamp('paid_at');
    t.timestamps(true, true);
  });

  // ── 13. Announcements ───────────────────────────────────
  await knex.schema.createTable('announcements', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE');
    t.uuid('created_by').references('id').inTable('users');
    t.string('title').notNullable();
    t.text('content').notNullable();
    t.enu('target_audience', ['all', 'parents', 'teachers', 'students', 'staff', 'class']).defaultTo('all');
    t.uuid('target_class_id').references('id').inTable('classes');
    t.enu('priority', ['low', 'normal', 'high', 'urgent']).defaultTo('normal');
    t.boolean('is_pinned').defaultTo(false);
    t.boolean('send_sms').defaultTo(false);
    t.boolean('send_email').defaultTo(false);
    t.string('attachment_url');
    t.timestamp('published_at');
    t.timestamp('expires_at');
    t.timestamps(true, true);
  });

  // ── 14. Timetable Slots ─────────────────────────────────
  await knex.schema.createTable('timetable_slots', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE');
    t.uuid('class_id').references('id').inTable('classes').onDelete('CASCADE');
    t.uuid('subject_id').references('id').inTable('subjects');
    t.uuid('teacher_id').references('id').inTable('users');
    t.enu('day_of_week', ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']).notNullable();
    t.time('start_time').notNullable();
    t.time('end_time').notNullable();
    t.string('room');
    t.timestamps(true, true);
  });

  // ── 15. Behavioural / Psychomotor Assessment ────────────
  await knex.schema.createTable('behavioural_traits', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('student_id').references('id').inTable('students').onDelete('CASCADE');
    t.uuid('term_id').references('id').inTable('terms').onDelete('CASCADE');
    t.uuid('rated_by').references('id').inTable('users');
    t.integer('punctuality').defaultTo(0);
    t.integer('attentiveness').defaultTo(0);
    t.integer('neatness').defaultTo(0);
    t.integer('politeness').defaultTo(0);
    t.integer('honesty').defaultTo(0);
    t.integer('self_control').defaultTo(0);
    t.integer('relationship_with_others').defaultTo(0);
    t.integer('handwriting').defaultTo(0);
    t.integer('verbal_fluency').defaultTo(0);
    t.integer('sports').defaultTo(0);
    t.integer('creativity').defaultTo(0);
    t.integer('musical_skills').defaultTo(0);
    t.integer('leadership').defaultTo(0);
    t.integer('teamwork').defaultTo(0);
    t.integer('critical_thinking').defaultTo(0);
    t.text('class_teacher_remark');
    t.text('head_teacher_remark');
    t.text('counselor_remark');
    t.date('next_term_begins');
    t.timestamps(true, true);
    t.unique(['student_id', 'term_id']);
  });

  // ── 16. Events Calendar ─────────────────────────────────
  await knex.schema.createTable('events', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE');
    t.uuid('created_by').references('id').inTable('users');
    t.string('title').notNullable();
    t.text('description');
    t.enu('event_type', ['academic', 'sports', 'cultural', 'holiday', 'exam', 'meeting', 'excursion', 'competition', 'assembly', 'other']).defaultTo('other');
    t.date('start_date').notNullable();
    t.date('end_date');
    t.time('start_time');
    t.time('end_time');
    t.string('location');
    t.enu('visibility', ['all', 'staff', 'parents', 'students']).defaultTo('all');
    t.boolean('is_recurring').defaultTo(false);
    t.string('recurrence_rule');
    t.string('color').defaultTo('#22A97A');
    t.boolean('is_active').defaultTo(true);
    t.timestamps(true, true);
  });

  // ── 17. Discipline Records ──────────────────────────────
  await knex.schema.createTable('discipline_records', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE');
    t.uuid('student_id').references('id').inTable('students').onDelete('CASCADE');
    t.uuid('reported_by').references('id').inTable('users');
    t.uuid('resolved_by').references('id').inTable('users');
    t.string('title').notNullable();
    t.text('description').notNullable();
    t.enu('category', ['minor', 'moderate', 'major', 'critical']).defaultTo('minor');
    t.enu('infraction_type', ['tardiness', 'dress_code', 'disruption', 'bullying', 'cheating', 'vandalism', 'fighting', 'substance', 'truancy', 'disrespect', 'other']).defaultTo('other');
    t.text('action_taken');
    t.enu('status', ['reported', 'investigating', 'resolved', 'appealed', 'dismissed']).defaultTo('reported');
    t.date('incident_date');
    t.integer('demerit_points').defaultTo(0);
    t.boolean('parent_notified').defaultTo(false);
    t.text('parent_response');
    t.timestamps(true, true);
  });

  // ── 18. Student Notifications ───────────────────────────
  await knex.schema.createTable('student_notifications', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('school_id').notNullable().references('id').inTable('schools').onDelete('CASCADE');
    t.uuid('student_id').notNullable().references('id').inTable('students').onDelete('CASCADE');
    t.uuid('class_id').references('id').inTable('classes').onDelete('SET NULL');
    t.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');
    t.string('title').notNullable();
    t.text('message').notNullable();
    t.enu('category', ['academic', 'attendance', 'fees', 'behaviour', 'health', 'general']).defaultTo('general');
    t.enu('priority', ['normal', 'high', 'urgent']).defaultTo('normal');
    t.boolean('visible_to_parent').defaultTo(true);
    t.boolean('is_read').defaultTo(false);
    t.timestamps(true, true);
  });

  // ── 19. Chat System ─────────────────────────────────────
  await knex.schema.createTable('chat_threads', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE');
    t.string('title').notNullable();
    t.enu('type', ['staff', 'class', 'direct', 'parent_teacher']).defaultTo('staff');
    t.uuid('class_id').references('id').inTable('classes').onDelete('SET NULL');
    t.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('chat_participants', (t) => {
    t.uuid('thread_id').references('id').inTable('chat_threads').onDelete('CASCADE');
    t.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    t.timestamp('last_read_at');
    t.primary(['thread_id', 'user_id']);
  });

  await knex.schema.createTable('chat_messages', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('thread_id').references('id').inTable('chat_threads').onDelete('CASCADE');
    t.uuid('sender_id').references('id').inTable('users').onDelete('SET NULL');
    t.text('body').notNullable();
    t.string('attachment_url');
    t.timestamps(true, true);
  });

  // ── 20. Quiz / Learning Hub ─────────────────────────────
  await knex.schema.createTable('quiz_banks', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE');
    t.string('title').notNullable();
    t.string('subject').notNullable();
    t.enu('level', ['junior', 'senior', 'primary', 'all']).notNullable();
    t.string('class_level');
    t.enu('exam_type', ['waec', 'neco', 'igcse', 'sat', 'ib', 'school', 'checkpoint', 'common_entrance']).defaultTo('school');
    t.integer('time_limit_minutes').defaultTo(0);
    t.boolean('is_published').defaultTo(true);
    t.uuid('created_by').references('id').inTable('users');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('quiz_questions', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('bank_id').references('id').inTable('quiz_banks').onDelete('CASCADE');
    t.text('question').notNullable();
    t.jsonb('options').notNullable();
    t.integer('answer_index').notNullable();
    t.text('explanation');
    t.enu('difficulty', ['foundation', 'standard', 'challenge']).defaultTo('standard');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('quiz_attempts', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE');
    t.uuid('bank_id').references('id').inTable('quiz_banks').onDelete('CASCADE');
    t.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    t.decimal('score', 5, 2).defaultTo(0);
    t.integer('total').defaultTo(0);
    t.integer('time_taken_seconds').defaultTo(0);
    t.jsonb('answers').defaultTo('[]');
    t.timestamps(true, true);
  });

  // ── 21. Activity Log (Audit Trail) ──────────────────────
  await knex.schema.createTable('activity_logs', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('school_id').references('id').inTable('schools');
    t.uuid('user_id').references('id').inTable('users');
    t.string('action').notNullable();
    t.string('entity_type');
    t.uuid('entity_id');
    t.jsonb('details').defaultTo('{}');
    t.string('ip_address');
    t.timestamps(true, true);
  });

  // ── 22. Library Books ───────────────────────────────────
  await knex.schema.createTable('library_books', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE');
    t.string('title').notNullable();
    t.string('author');
    t.string('isbn');
    t.string('category');
    t.string('publisher');
    t.integer('year_published');
    t.integer('total_copies').defaultTo(1);
    t.integer('available_copies').defaultTo(1);
    t.string('shelf_location');
    t.string('cover_image_url');
    t.text('description');
    t.boolean('is_active').defaultTo(true);
    t.timestamps(true, true);
  });

  await knex.schema.createTable('book_loans', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('book_id').references('id').inTable('library_books').onDelete('CASCADE');
    t.uuid('student_id').references('id').inTable('students');
    t.uuid('user_id').references('id').inTable('users');
    t.uuid('school_id').references('id').inTable('schools');
    t.date('borrow_date').notNullable();
    t.date('due_date').notNullable();
    t.date('return_date');
    t.enu('status', ['borrowed', 'returned', 'overdue', 'lost']).defaultTo('borrowed');
    t.uuid('issued_by').references('id').inTable('users');
    t.timestamps(true, true);
  });

  // ── 23. Parent-Teacher Meeting Slots ────────────────────
  await knex.schema.createTable('ptm_slots', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE');
    t.uuid('teacher_id').references('id').inTable('users').onDelete('CASCADE');
    t.uuid('parent_id').references('id').inTable('users');
    t.uuid('student_id').references('id').inTable('students');
    t.date('meeting_date').notNullable();
    t.time('start_time').notNullable();
    t.time('end_time').notNullable();
    t.enu('status', ['available', 'booked', 'completed', 'cancelled']).defaultTo('available');
    t.text('notes');
    t.text('teacher_feedback');
    t.timestamps(true, true);
  });

  // ── Indexes ─────────────────────────────────────────────
  await knex.schema.raw('CREATE INDEX idx_students_school ON students(school_id)');
  await knex.schema.raw('CREATE INDEX idx_grades_school ON grades(school_id)');
  await knex.schema.raw('CREATE INDEX idx_attendance_school ON attendance(school_id)');
  await knex.schema.raw('CREATE INDEX idx_students_class ON students(class_id)');
  await knex.schema.raw('CREATE INDEX idx_grades_student ON grades(student_id)');
  await knex.schema.raw('CREATE INDEX idx_grades_term ON grades(term_id)');
  await knex.schema.raw('CREATE INDEX idx_attendance_student_date ON attendance(student_id, date)');
  await knex.schema.raw('CREATE INDEX idx_payments_student ON payments(student_id)');
  await knex.schema.raw('CREATE INDEX idx_payments_status ON payments(status)');
  await knex.schema.raw('CREATE INDEX idx_users_school ON users(school_id)');
  await knex.schema.raw('CREATE INDEX idx_announcements_school ON announcements(school_id)');
  await knex.schema.raw('CREATE INDEX idx_events_school ON events(school_id)');
  await knex.schema.raw('CREATE INDEX idx_discipline_student ON discipline_records(student_id)');
  await knex.schema.raw('CREATE INDEX idx_student_notifications_student ON student_notifications(student_id)');
  await knex.schema.raw('CREATE INDEX idx_student_notifications_school ON student_notifications(school_id)');
  await knex.schema.raw('CREATE INDEX idx_library_books_school ON library_books(school_id)');
  await knex.schema.raw('CREATE INDEX idx_book_loans_student ON book_loans(student_id)');
};

exports.down = async function (knex) {
  const tables = [
    'ptm_slots', 'book_loans', 'library_books',
    'activity_logs', 'quiz_attempts', 'quiz_questions', 'quiz_banks',
    'chat_messages', 'chat_participants', 'chat_threads',
    'student_notifications', 'discipline_records', 'events',
    'behavioural_traits', 'timetable_slots',
    'announcements', 'payments', 'fee_structures', 'attendance',
    'grades', 'students', 'class_subjects', 'subjects', 'classes',
    'terms', 'academic_years', 'users', 'schools',
  ];
  for (const table of tables) {
    await knex.schema.dropTableIfExists(table);
  }
};
