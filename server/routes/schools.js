const router = require('express').Router();
const db = require('../config/database');
const { authenticate, authorize, schoolScope } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const { success, error, paginate } = require('../utils/response');

// POST /api/schools - Create a new school
router.post('/', authenticate, authorize('super_admin'), validate(schemas.createSchool), async (req, res) => {
  try {
    const { name, address, city, state, lga, phone, email, logo_url, school_type, motto, grading_scale } = req.body;

    const [school] = await db('schools')
      .insert({ name, address, city, state, lga, phone, email, logo_url, school_type, motto, grading_scale: grading_scale ? JSON.stringify(grading_scale) : null })
      .returning('*');

    // Link the creator as school_admin
    await db('users').where({ id: req.user.id }).update({ school_id: school.id, role: 'school_admin' });

    return success(res, school, 201);
  } catch (err) {
    console.error('Create school error:', err);
    return error(res, 'Failed to create school');
  }
});

// GET /api/schools/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const school = await db('schools').where({ id: req.params.id, is_active: true }).first();
    if (!school) return error(res, 'School not found', 404);
    return success(res, school);
  } catch (err) {
    return error(res, 'Failed to fetch school');
  }
});

// PUT /api/schools/:id
router.put('/:id', authenticate, authorize('super_admin', 'school_admin'), async (req, res) => {
  try {
    const allowed = ['name', 'address', 'city', 'state', 'lga', 'phone', 'email', 'logo_url', 'motto', 'grading_scale'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = f === 'grading_scale' ? JSON.stringify(req.body[f]) : req.body[f]; });
    updates.updated_at = db.fn.now();

    const [school] = await db('schools').where({ id: req.params.id }).update(updates).returning('*');
    if (!school) return error(res, 'School not found', 404);

    return success(res, school);
  } catch (err) {
    return error(res, 'Failed to update school');
  }
});

// GET /api/schools/:id/staff
router.get('/:id/staff', authenticate, authorize('super_admin', 'school_admin'), async (req, res) => {
  try {
    const staff = await db('users')
      .where({ school_id: req.params.id })
      .whereIn('role', ['teacher', 'accountant', 'staff'])
      .select('id', 'first_name', 'last_name', 'email', 'phone', 'role', 'is_active', 'created_at')
      .orderBy('first_name');

    return success(res, staff);
  } catch (err) {
    return error(res, 'Failed to fetch staff');
  }
});

module.exports = router;
