const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { authenticate, authorize, schoolScope } = require('../middleware/auth');
const { success, error } = require('../utils/response');

router.use(authenticate, authorize('school_admin', 'super_admin'), schoolScope);

router.get('/', async (req, res) => {
  try {
    const { role } = req.query;
    let query = db('users')
      .where({ school_id: req.schoolId })
      .select('id', 'first_name', 'last_name', 'email', 'phone', 'role', 'avatar_url', 'qualification', 'is_active', 'created_at')
      .orderBy([{ column: 'role' }, { column: 'last_name' }]);

    if (role) query = query.where({ role });
    return success(res, await query);
  } catch (err) {
    console.error('List users error:', err);
    return error(res, 'Failed to fetch users');
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      email,
      phone,
      role,
      password = 'password123',
      avatar_url,
      gender,
      address,
      qualification,
      state_of_origin,
    } = req.body;

    if (!first_name || !last_name || !email || !role) {
      return error(res, 'first_name, last_name, email and role are required', 400);
    }

    if (!['teacher', 'parent', 'student', 'accountant', 'staff', 'school_admin'].includes(role)) {
      return error(res, 'Invalid role', 400);
    }

    const existingQuery = db('users').where({ email });
    if (phone) existingQuery.orWhere({ phone });
    const existing = await existingQuery.first();
    if (existing) return error(res, 'Email or phone already exists', 409);

    const password_hash = await bcrypt.hash(password, 12);
    const [user] = await db('users')
      .insert({
        school_id: req.schoolId,
        first_name,
        last_name,
        email,
        phone,
        role,
        password_hash,
        avatar_url,
        gender,
        address,
        qualification,
        state_of_origin,
      })
      .returning(['id', 'first_name', 'last_name', 'email', 'phone', 'role', 'avatar_url', 'qualification', 'is_active']);

    return success(res, user, 201);
  } catch (err) {
    console.error('Create user error:', err);
    return error(res, 'Failed to create user');
  }
});

router.put('/:id', async (req, res) => {
  try {
    const allowed = ['first_name', 'last_name', 'email', 'phone', 'role', 'avatar_url', 'gender', 'address', 'qualification', 'state_of_origin', 'is_active'];
    const updates = {};
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });
    if (updates.role && !['teacher', 'parent', 'student', 'accountant', 'staff', 'school_admin'].includes(updates.role)) {
      return error(res, 'Invalid role', 400);
    }
    updates.updated_at = db.fn.now();

    const [user] = await db('users')
      .where({ id: req.params.id, school_id: req.schoolId })
      .update(updates)
      .returning(['id', 'first_name', 'last_name', 'email', 'phone', 'role', 'avatar_url', 'qualification', 'is_active']);

    if (!user) return error(res, 'User not found', 404);
    return success(res, user);
  } catch (err) {
    console.error('Update user error:', err);
    if (err.code === '23505') return error(res, 'Email or phone already exists', 409);
    return error(res, 'Failed to update user');
  }
});

router.delete('/:id', async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return error(res, 'You cannot disable your own account', 400);
    }

    const [user] = await db('users')
      .where({ id: req.params.id, school_id: req.schoolId })
      .update({ is_active: false, updated_at: db.fn.now() })
      .returning(['id', 'first_name', 'last_name', 'email', 'phone', 'role', 'avatar_url', 'qualification', 'is_active']);

    if (!user) return error(res, 'User not found', 404);
    return success(res, user);
  } catch (err) {
    console.error('Disable user error:', err);
    return error(res, 'Failed to disable user');
  }
});

module.exports = router;
