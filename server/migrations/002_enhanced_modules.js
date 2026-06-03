/**
 * SchoolPulse v2.1 — Enhanced Modules
 * Adds: Staff Payroll, Hostel Management, Transport, Medical Records,
 *        Inventory/Assets, Parent Portal Feedback, Student Promotion History,
 *        Enhanced Security (login attempts, sessions)
 */
exports.up = async function (knex) {

  // ── Staff Payroll & HR ─────────────────────────────────
  await knex.schema.createTable('staff_payroll', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE');
    t.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    t.string('bank_name');
    t.string('account_number');
    t.string('account_name');
    t.decimal('basic_salary', 14, 2).defaultTo(0);
    t.decimal('housing_allowance', 14, 2).defaultTo(0);
    t.decimal('transport_allowance', 14, 2).defaultTo(0);
    t.decimal('meal_allowance', 14, 2).defaultTo(0);
    t.decimal('other_allowances', 14, 2).defaultTo(0);
    t.decimal('tax_deduction', 14, 2).defaultTo(0);
    t.decimal('pension_deduction', 14, 2).defaultTo(0);
    t.decimal('other_deductions', 14, 2).defaultTo(0);
    t.decimal('net_salary', 14, 2).defaultTo(0);
    t.string('currency').defaultTo('NGN');
    t.string('pay_grade');
    t.date('employment_date');
    t.enu('employment_type', ['full_time', 'part_time', 'contract', 'volunteer']).defaultTo('full_time');
    t.text('notes');
    t.boolean('is_active').defaultTo(true);
    t.timestamps(true, true);
  });

  await knex.schema.createTable('salary_payments', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE');
    t.uuid('payroll_id').references('id').inTable('staff_payroll').onDelete('CASCADE');
    t.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    t.string('month').notNullable(); // e.g. '2026-01'
    t.decimal('gross_amount', 14, 2).notNullable();
    t.decimal('deductions', 14, 2).defaultTo(0);
    t.decimal('net_amount', 14, 2).notNullable();
    t.decimal('bonus', 14, 2).defaultTo(0);
    t.enu('status', ['pending', 'paid', 'failed']).defaultTo('pending');
    t.enu('payment_method', ['bank_transfer', 'cash', 'check', 'mobile_money']).defaultTo('bank_transfer');
    t.string('reference');
    t.uuid('approved_by').references('id').inTable('users');
    t.timestamp('paid_at');
    t.text('notes');
    t.timestamps(true, true);
    t.unique(['payroll_id', 'month']);
  });

  // ── Staff Leave Management ─────────────────────────────
  await knex.schema.createTable('staff_leaves', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE');
    t.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    t.enu('leave_type', ['annual', 'sick', 'maternity', 'paternity', 'compassionate', 'unpaid', 'study', 'other']).notNullable();
    t.date('start_date').notNullable();
    t.date('end_date').notNullable();
    t.integer('days').notNullable();
    t.text('reason');
    t.enu('status', ['pending', 'approved', 'rejected', 'cancelled']).defaultTo('pending');
    t.uuid('approved_by').references('id').inTable('users');
    t.text('admin_remarks');
    t.timestamps(true, true);
  });

  // ── Hostel Management ──────────────────────────────────
  await knex.schema.createTable('hostels', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE');
    t.string('name').notNullable();
    t.enu('type', ['boys', 'girls', 'mixed']).notNullable();
    t.string('warden_name');
    t.uuid('warden_id').references('id').inTable('users');
    t.integer('total_rooms').defaultTo(0);
    t.integer('total_beds').defaultTo(0);
    t.text('address');
    t.text('description');
    t.boolean('is_active').defaultTo(true);
    t.timestamps(true, true);
  });

  await knex.schema.createTable('hostel_rooms', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('hostel_id').references('id').inTable('hostels').onDelete('CASCADE');
    t.string('room_number').notNullable();
    t.enu('room_type', ['single', 'double', 'dormitory', 'suite']).defaultTo('dormitory');
    t.integer('capacity').defaultTo(4);
    t.integer('occupied').defaultTo(0);
    t.decimal('fee_per_term', 14, 2).defaultTo(0);
    t.enu('status', ['available', 'full', 'maintenance', 'reserved']).defaultTo('available');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('hostel_allocations', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE');
    t.uuid('student_id').references('id').inTable('students').onDelete('CASCADE');
    t.uuid('room_id').references('id').inTable('hostel_rooms').onDelete('CASCADE');
    t.uuid('term_id').references('id').inTable('terms');
    t.string('bed_number');
    t.date('check_in_date');
    t.date('check_out_date');
    t.enu('status', ['active', 'checked_out', 'transferred', 'expelled']).defaultTo('active');
    t.timestamps(true, true);
  });

  // ── Transport Management ───────────────────────────────
  await knex.schema.createTable('transport_routes', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE');
    t.string('route_name').notNullable();
    t.string('vehicle_number');
    t.string('vehicle_type');
    t.string('driver_name');
    t.string('driver_phone');
    t.string('assistant_name');
    t.string('assistant_phone');
    t.integer('capacity').defaultTo(40);
    t.decimal('fee_per_term', 14, 2).defaultTo(0);
    t.text('pickup_points'); // JSON array of stops
    t.time('departure_time');
    t.time('return_time');
    t.boolean('is_active').defaultTo(true);
    t.timestamps(true, true);
  });

  await knex.schema.createTable('transport_subscriptions', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE');
    t.uuid('student_id').references('id').inTable('students').onDelete('CASCADE');
    t.uuid('route_id').references('id').inTable('transport_routes').onDelete('CASCADE');
    t.uuid('term_id').references('id').inTable('terms');
    t.string('pickup_point');
    t.enu('type', ['one_way_morning', 'one_way_afternoon', 'two_way']).defaultTo('two_way');
    t.enu('status', ['active', 'suspended', 'cancelled']).defaultTo('active');
    t.timestamps(true, true);
  });

  // ── Medical Records ────────────────────────────────────
  await knex.schema.createTable('medical_records', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE');
    t.uuid('student_id').references('id').inTable('students').onDelete('CASCADE');
    t.date('visit_date').notNullable();
    t.enu('visit_type', ['routine', 'emergency', 'sick_bay', 'referral', 'immunization']).defaultTo('sick_bay');
    t.text('complaint');
    t.text('diagnosis');
    t.text('treatment');
    t.text('medication_given');
    t.string('temperature');
    t.string('blood_pressure');
    t.string('weight');
    t.boolean('parent_notified').defaultTo(false);
    t.boolean('sent_home').defaultTo(false);
    t.uuid('attended_by').references('id').inTable('users');
    t.text('notes');
    t.timestamps(true, true);
  });

  // ── Inventory / Assets ─────────────────────────────────
  await knex.schema.createTable('inventory_items', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE');
    t.string('item_name').notNullable();
    t.enu('category', ['furniture', 'electronics', 'stationery', 'sports', 'laboratory', 'kitchen', 'cleaning', 'vehicle', 'other']).defaultTo('other');
    t.string('location');
    t.integer('quantity').defaultTo(0);
    t.integer('minimum_stock').defaultTo(0);
    t.decimal('unit_cost', 14, 2).defaultTo(0);
    t.string('supplier');
    t.string('condition');
    t.date('purchase_date');
    t.date('warranty_expiry');
    t.string('serial_number');
    t.text('notes');
    t.boolean('is_active').defaultTo(true);
    t.timestamps(true, true);
  });

  // ── Promotion / Class History ──────────────────────────
  await knex.schema.createTable('promotion_history', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE');
    t.uuid('student_id').references('id').inTable('students').onDelete('CASCADE');
    t.uuid('from_class_id').references('id').inTable('classes');
    t.uuid('to_class_id').references('id').inTable('classes');
    t.uuid('academic_year_id').references('id').inTable('academic_years');
    t.enu('decision', ['promoted', 'repeated', 'graduated', 'withdrawn', 'transferred']).notNullable();
    t.decimal('average_score', 5, 2);
    t.text('remarks');
    t.uuid('decided_by').references('id').inTable('users');
    t.timestamps(true, true);
  });

  // ── Parent Feedback / Complaints ───────────────────────
  await knex.schema.createTable('parent_feedback', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE');
    t.uuid('parent_id').references('id').inTable('users').onDelete('CASCADE');
    t.uuid('student_id').references('id').inTable('students');
    t.enu('type', ['feedback', 'complaint', 'suggestion', 'appreciation']).defaultTo('feedback');
    t.string('subject').notNullable();
    t.text('message').notNullable();
    t.enu('status', ['open', 'in_progress', 'resolved', 'closed']).defaultTo('open');
    t.text('admin_response');
    t.uuid('responded_by').references('id').inTable('users');
    t.timestamp('responded_at');
    t.timestamps(true, true);
  });

  // ── Login Security ─────────────────────────────────────
  await knex.schema.createTable('login_attempts', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.string('email');
    t.string('ip_address');
    t.boolean('success').defaultTo(false);
    t.string('user_agent');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('active_sessions', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    t.string('token_hash').notNullable();
    t.string('ip_address');
    t.string('user_agent');
    t.string('device_name');
    t.timestamp('expires_at').notNullable();
    t.timestamps(true, true);
  });

  // ── Indexes ────────────────────────────────────────────
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_payroll_user ON staff_payroll(user_id)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_salary_month ON salary_payments(month)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_hostel_alloc_student ON hostel_allocations(student_id)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_transport_sub_student ON transport_subscriptions(student_id)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_medical_student ON medical_records(student_id)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_promotion_student ON promotion_history(student_id)');
};

exports.down = async function (knex) {
  const tables = [
    'active_sessions', 'login_attempts', 'parent_feedback',
    'promotion_history', 'inventory_items', 'medical_records',
    'transport_subscriptions', 'transport_routes',
    'hostel_allocations', 'hostel_rooms', 'hostels',
    'staff_leaves', 'salary_payments', 'staff_payroll',
  ];
  for (const table of tables) {
    await knex.schema.dropTableIfExists(table);
  }
};
