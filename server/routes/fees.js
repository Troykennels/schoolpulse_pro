const router = require('express').Router();
const db = require('../config/database');
const { authenticate, authorize, schoolScope } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const { success, error, paginate } = require('../utils/response');
const crypto = require('crypto');

// ─── Fee Structures ───

// POST /api/fees/structures
router.post('/structures', authenticate, authorize('school_admin', 'accountant'), async (req, res) => {
  try {
    const { class_id, term_id, name, fee_type, amount, description, due_date } = req.body;
    const [fee] = await db('fee_structures')
      .insert({ school_id: req.user.school_id, class_id, term_id, name, fee_type, amount, description, due_date })
      .returning('*');
    return success(res, fee, 201);
  } catch (err) {
    console.error('Create fee error:', err);
    return error(res, 'Failed to create fee structure');
  }
});

// GET /api/fees/structures/:classId/:termId
router.get('/structures/:classId/:termId', authenticate, schoolScope, async (req, res) => {
  try {
    const fees = await db('fee_structures')
      .where({ school_id: req.user.school_id, class_id: req.params.classId, term_id: req.params.termId, is_active: true })
      .orderBy('fee_type');

    const total = fees.reduce((s, f) => s + parseFloat(f.amount), 0);
    return success(res, { fees, total });
  } catch (err) {
    return error(res, 'Failed to fetch fee structures');
  }
});

// PUT /api/fees/structures/:id
router.put('/structures/:id', authenticate, authorize('school_admin', 'accountant'), async (req, res) => {
  try {
    const { fee_type, name, amount, description, due_date } = req.body;
    const [fee] = await db('fee_structures')
      .where({ id: req.params.id, school_id: req.user.school_id })
      .update({ fee_type, name, amount, description, due_date: due_date || null, updated_at: db.fn.now() })
      .returning('*');
    if (!fee) return error(res, 'Fee structure not found', 404);
    return success(res, fee);
  } catch (err) {
    console.error('Update fee structure error:', err);
    return error(res, 'Failed to update fee structure');
  }
});

// DELETE /api/fees/structures/:id
router.delete('/structures/:id', authenticate, authorize('school_admin', 'accountant'), async (req, res) => {
  try {
    await db('fee_structures')
      .where({ id: req.params.id, school_id: req.user.school_id })
      .update({ is_active: false, updated_at: db.fn.now() });
    return success(res, { message: 'Fee structure deleted' });
  } catch (err) {
    return error(res, 'Failed to delete fee structure');
  }
});

// ─── Payments ───

// POST /api/fees/payments - Record a manual payment
router.post('/payments', authenticate, authorize('school_admin', 'accountant'), validate(schemas.recordPayment), async (req, res) => {
  try {
    const { student_id, fee_structure_id, amount, payment_method, reference, notes } = req.body;

    const fee = await db('fee_structures').where({ id: fee_structure_id }).first();
    if (!fee) return error(res, 'Fee structure not found', 404);

    // Calculate existing payments for this student + fee
    const paid = await db('payments')
      .where({ student_id, fee_structure_id, status: 'success' })
      .sum('amount_paid as total')
      .first();

    const totalPaid = parseFloat(paid.total || 0) + parseFloat(amount);
    const balance = parseFloat(fee.amount) - totalPaid;

    const [payment] = await db('payments')
      .insert({
        school_id: req.user.school_id,
        student_id,
        fee_structure_id,
        amount_paid: amount,
        balance: Math.max(0, balance),
        payment_method: payment_method || 'cash',
        reference: reference || `MAN-${Date.now()}`,
        status: 'success',
        paid_at: db.fn.now(),
        recorded_by: req.user.id,
        notes
      })
      .returning('*');

    return success(res, payment, 201);
  } catch (err) {
    console.error('Payment error:', err);
    return error(res, 'Failed to record payment');
  }
});

// POST /api/fees/paystack/initialize - Initialize Paystack payment
router.post('/paystack/initialize', authenticate, async (req, res) => {
  try {
    const { student_id, fee_structure_id, amount, email } = req.body;

    const fee = await db('fee_structures').where({ id: fee_structure_id }).first();
    if (!fee) return error(res, 'Fee structure not found', 404);

    const reference = `SP-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    // In production, call Paystack API here:
    // const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', { ... })
    const paystackData = {
      authorization_url: `https://checkout.paystack.com/${reference}`,
      access_code: reference,
      reference
    };

    // Record pending payment
    await db('payments').insert({
      school_id: req.user.school_id,
      student_id,
      fee_structure_id,
      amount_paid: amount,
      balance: parseFloat(fee.amount) - parseFloat(amount),
      payment_method: 'paystack',
      reference,
      status: 'pending',
      recorded_by: req.user.id
    });

    return success(res, paystackData);
  } catch (err) {
    return error(res, 'Failed to initialize payment');
  }
});

// POST /api/fees/paystack/webhook - Paystack webhook
router.post('/paystack/webhook', async (req, res) => {
  try {
    const hash = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY || '')
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (hash !== req.headers['x-paystack-signature']) {
      return res.status(401).send('Invalid signature');
    }

    const { event, data } = req.body;
    if (event === 'charge.success') {
      await db('payments')
        .where({ reference: data.reference })
        .update({ status: 'success', paid_at: db.fn.now(), gateway_response: JSON.stringify(data) });
    }

    return res.status(200).send('OK');
  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(500).send('Webhook error');
  }
});

// GET /api/fees/student/:studentId - Get student's fee summary
router.get('/student/:studentId', authenticate, schoolScope, async (req, res) => {
  try {
    const { studentId } = req.params;
    const termId = req.query.term_id;

    let feesQuery = db('fee_structures as fs')
      .where({ 'fs.school_id': req.user.school_id })
      .join('students as s', 's.class_id', 'fs.class_id')
      .where('s.id', studentId);

    if (termId) feesQuery = feesQuery.where('fs.term_id', termId);

    const fees = await feesQuery.select('fs.*');

    const result = await Promise.all(fees.map(async (fee) => {
      const paid = await db('payments')
        .where({ student_id: studentId, fee_structure_id: fee.id, status: 'success' })
        .sum('amount_paid as total').first();

      return {
        ...fee,
        total_paid: parseFloat(paid.total || 0),
        balance: parseFloat(fee.amount) - parseFloat(paid.total || 0),
        status: parseFloat(paid.total || 0) >= parseFloat(fee.amount) ? 'paid' : parseFloat(paid.total || 0) > 0 ? 'partial' : 'unpaid'
      };
    }));

    const summary = {
      total_fees: result.reduce((s, f) => s + parseFloat(f.amount), 0),
      total_paid: result.reduce((s, f) => s + f.total_paid, 0),
      total_balance: result.reduce((s, f) => s + f.balance, 0)
    };

    return success(res, { fees: result, summary });
  } catch (err) {
    return error(res, 'Failed to fetch student fees');
  }
});

// GET /api/fees/class/:classId/term/:termId - Class fee collection report
router.get('/class/:classId/term/:termId', authenticate, authorize('school_admin', 'accountant'), schoolScope, async (req, res) => {
  try {
    const { classId, termId } = req.params;

    const students = await db('students')
      .where({ class_id: classId, school_id: req.user.school_id, status: 'active' })
      .select('id', 'first_name', 'last_name', 'admission_no');

    const fees = await db('fee_structures')
      .where({ class_id: classId, term_id: termId, school_id: req.user.school_id, is_active: true });

    const totalExpected = fees.reduce((s, f) => s + parseFloat(f.amount), 0);

    const report = await Promise.all(students.map(async (student) => {
      const paid = await db('payments')
        .whereIn('fee_structure_id', fees.map(f => f.id))
        .where({ student_id: student.id, status: 'success' })
        .sum('amount_paid as total').first();

      const totalPaid = parseFloat(paid.total || 0);
      return { ...student, total_expected: totalExpected, total_paid: totalPaid, balance: totalExpected - totalPaid, percentage: totalExpected > 0 ? Math.round((totalPaid / totalExpected) * 100) : 0 };
    }));

    const classSummary = {
      total_students: students.length,
      total_expected: totalExpected * students.length,
      total_collected: report.reduce((s, r) => s + r.total_paid, 0),
      fully_paid: report.filter(r => r.balance <= 0).length,
      partial: report.filter(r => r.total_paid > 0 && r.balance > 0).length,
      unpaid: report.filter(r => r.total_paid === 0).length
    };

    return success(res, { report, summary: classSummary });
  } catch (err) {
    return error(res, 'Failed to fetch class fee report');
  }
});

module.exports = router;
