const router = require('express').Router();
const db = require('../config/database');
const { authenticate, authorize, schoolScope } = require('../middleware/auth');
const { success, error } = require('../utils/response');

router.use(authenticate, schoolScope);

// GET /api/payroll — list all staff payroll records
router.get('/', authorize('super_admin', 'school_admin', 'accountant'), async (req, res) => {
  try {
    const records = await db('staff_payroll as sp')
      .join('users as u', 'sp.user_id', 'u.id')
      .where('sp.school_id', req.schoolId)
      .where('sp.is_active', true)
      .select('sp.*', 'u.first_name', 'u.last_name', 'u.email', 'u.role', 'u.employee_id')
      .orderBy('u.last_name');
    return success(res, records);
  } catch (err) {
    return error(res, 'Failed to fetch payroll records');
  }
});

// POST /api/payroll — create payroll record for a staff member
router.post('/', authorize('super_admin', 'school_admin'), async (req, res) => {
  try {
    const { user_id, basic_salary, housing_allowance, transport_allowance, meal_allowance,
      other_allowances, tax_deduction, pension_deduction, other_deductions,
      bank_name, account_number, account_name, pay_grade, employment_date, employment_type, currency } = req.body;

    if (!user_id || !basic_salary) {
      return error(res, 'Staff member and basic salary are required', 400);
    }

    const gross = (parseFloat(basic_salary) || 0) + (parseFloat(housing_allowance) || 0) +
      (parseFloat(transport_allowance) || 0) + (parseFloat(meal_allowance) || 0) + (parseFloat(other_allowances) || 0);
    const deductions = (parseFloat(tax_deduction) || 0) + (parseFloat(pension_deduction) || 0) + (parseFloat(other_deductions) || 0);
    const net_salary = gross - deductions;

    const [record] = await db('staff_payroll').insert({
      school_id: req.schoolId, user_id,
      basic_salary: basic_salary || 0, housing_allowance: housing_allowance || 0,
      transport_allowance: transport_allowance || 0, meal_allowance: meal_allowance || 0,
      other_allowances: other_allowances || 0, tax_deduction: tax_deduction || 0,
      pension_deduction: pension_deduction || 0, other_deductions: other_deductions || 0,
      net_salary, bank_name, account_number, account_name, pay_grade,
      employment_date, employment_type: employment_type || 'full_time',
      currency: currency || 'NGN',
    }).returning('*');

    return success(res, record, 201);
  } catch (err) {
    return error(res, 'Failed to create payroll record');
  }
});

// PUT /api/payroll/:id
router.put('/:id', authorize('super_admin', 'school_admin'), async (req, res) => {
  try {
    const allowed = ['basic_salary', 'housing_allowance', 'transport_allowance', 'meal_allowance',
      'other_allowances', 'tax_deduction', 'pension_deduction', 'other_deductions',
      'bank_name', 'account_number', 'account_name', 'pay_grade', 'employment_date', 'employment_type', 'currency'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    // Recalculate net
    const current = await db('staff_payroll').where({ id: req.params.id, school_id: req.schoolId }).first();
    if (!current) return error(res, 'Record not found', 404);

    const merged = { ...current, ...updates };
    const gross = parseFloat(merged.basic_salary) + parseFloat(merged.housing_allowance) +
      parseFloat(merged.transport_allowance) + parseFloat(merged.meal_allowance) + parseFloat(merged.other_allowances);
    const ded = parseFloat(merged.tax_deduction) + parseFloat(merged.pension_deduction) + parseFloat(merged.other_deductions);
    updates.net_salary = gross - ded;
    updates.updated_at = db.fn.now();

    const [record] = await db('staff_payroll').where({ id: req.params.id, school_id: req.schoolId })
      .update(updates).returning('*');
    return success(res, record);
  } catch (err) {
    return error(res, 'Failed to update payroll record');
  }
});

// POST /api/payroll/pay — process salary payment
router.post('/pay', authorize('super_admin', 'school_admin', 'accountant'), async (req, res) => {
  try {
    const { payroll_id, month, bonus, payment_method, notes } = req.body;
    if (!payroll_id || !month) return error(res, 'Payroll ID and month are required', 400);

    const payroll = await db('staff_payroll').where({ id: payroll_id, school_id: req.schoolId }).first();
    if (!payroll) return error(res, 'Payroll record not found', 404);

    const gross = parseFloat(payroll.net_salary) + (parseFloat(bonus) || 0);
    const deductions = parseFloat(payroll.tax_deduction) + parseFloat(payroll.pension_deduction) + parseFloat(payroll.other_deductions);

    const [payment] = await db('salary_payments').insert({
      school_id: req.schoolId, payroll_id, user_id: payroll.user_id,
      month, gross_amount: payroll.basic_salary, deductions,
      net_amount: parseFloat(payroll.net_salary) + (parseFloat(bonus) || 0),
      bonus: bonus || 0, status: 'paid', payment_method: payment_method || 'bank_transfer',
      reference: `SAL-${month}-${Date.now().toString(36).toUpperCase()}`,
      approved_by: req.user.id, paid_at: new Date(), notes,
    }).returning('*');

    return success(res, payment, 201);
  } catch (err) {
    if (err.code === '23505') return error(res, 'Salary already paid for this month', 409);
    return error(res, 'Failed to process payment');
  }
});

// GET /api/payroll/payments — salary payment history
router.get('/payments', authorize('super_admin', 'school_admin', 'accountant'), async (req, res) => {
  try {
    const { month, user_id } = req.query;
    let query = db('salary_payments as sp')
      .join('users as u', 'sp.user_id', 'u.id')
      .where('sp.school_id', req.schoolId)
      .select('sp.*', 'u.first_name', 'u.last_name', 'u.email')
      .orderBy('sp.paid_at', 'desc');

    if (month) query = query.where('sp.month', month);
    if (user_id) query = query.where('sp.user_id', user_id);

    const payments = await query;
    return success(res, payments);
  } catch (err) {
    return error(res, 'Failed to fetch payment history');
  }
});

// ── Staff Leave ──────────────────────────────────────────
// POST /api/payroll/leave — request leave
router.post('/leave', async (req, res) => {
  try {
    const { leave_type, start_date, end_date, days, reason } = req.body;
    if (!leave_type || !start_date || !end_date || !days) {
      return error(res, 'Leave type, dates, and duration are required', 400);
    }

    const [leave] = await db('staff_leaves').insert({
      school_id: req.schoolId, user_id: req.user.id,
      leave_type, start_date, end_date, days, reason,
    }).returning('*');

    return success(res, leave, 201);
  } catch (err) {
    return error(res, 'Failed to submit leave request');
  }
});

// GET /api/payroll/leaves
router.get('/leaves', async (req, res) => {
  try {
    const isAdmin = ['super_admin', 'school_admin'].includes(req.user.role);
    let query = db('staff_leaves as sl')
      .join('users as u', 'sl.user_id', 'u.id')
      .where('sl.school_id', req.schoolId)
      .select('sl.*', 'u.first_name', 'u.last_name')
      .orderBy('sl.created_at', 'desc');

    if (!isAdmin) query = query.where('sl.user_id', req.user.id);

    const leaves = await query;
    return success(res, leaves);
  } catch (err) {
    return error(res, 'Failed to fetch leave records');
  }
});

// PUT /api/payroll/leave/:id/approve
router.put('/leave/:id/approve', authorize('super_admin', 'school_admin'), async (req, res) => {
  try {
    const { status, admin_remarks } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return error(res, 'Status must be approved or rejected', 400);
    }

    const [leave] = await db('staff_leaves')
      .where({ id: req.params.id, school_id: req.schoolId })
      .update({ status, admin_remarks, approved_by: req.user.id, updated_at: db.fn.now() })
      .returning('*');

    return success(res, leave);
  } catch (err) {
    return error(res, 'Failed to update leave request');
  }
});

module.exports = router;
