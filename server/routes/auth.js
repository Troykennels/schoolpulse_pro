const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const {
  generateToken, authenticate, rateLimit,
  isAccountLocked, recordLoginAttempt, createSession, invalidateSession,
  LOCKOUT_MINUTES,
} = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const { success, error } = require('../utils/response');
const { ensureSchoolDefaults } = require('../utils/schoolDefaults');

// POST /api/auth/login — enhanced with rate limiting & lockout
router.post('/login', rateLimit(10, 60000), async (req, res) => {
  try {
    const { password } = req.body;
    const email = req.body.email?.trim().toLowerCase();
    const phone = req.body.phone?.trim();
    const identifier = email || phone;

    if (!identifier || !password) {
      return error(res, 'Email/phone and password are required', 400);
    }

    // Check if account is locked
    if (identifier) {
      const locked = await isAccountLocked(identifier);
      if (locked) {
        return error(res, `Account temporarily locked due to too many failed attempts. Try again in ${LOCKOUT_MINUTES} minutes.`, 423);
      }
    }

    const user = await db('users')
      .where(function () {
        if (email) this.where('email', email);
        else this.where('phone', phone);
      })
      .first();

    if (!user || !user.is_active) {
      await recordLoginAttempt(identifier, false, req);
      return error(res, 'Invalid email/phone or password', 401);
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      await recordLoginAttempt(identifier, false, req);

      // Check if this attempt triggers lockout
      const locked = await isAccountLocked(identifier);
      if (locked) {
        return error(res, `Account locked due to too many failed attempts. Try again in ${LOCKOUT_MINUTES} minutes.`, 423);
      }

      return error(res, 'Invalid email/phone or password', 401);
    }

    // Success — record and generate token
    await recordLoginAttempt(identifier, true, req);
    await db('users').where({ id: user.id }).update({ last_login: new Date() });

    const token = generateToken(user);
    await createSession(user.id, token, req);

    const { password_hash, password_reset_token, password_reset_expires, ...safeUser } = user;

    return success(res, { user: safeUser, token });
  } catch (err) {
    console.error('Login error:', err);
    if (err.code === 'ECONNREFUSED') {
      return error(res, 'Database connection failed. Please contact the administrator.', 503);
    }
    return error(res, 'Login failed. Please try again.', 500);
  }
});

// POST /api/auth/register — admin-only registration (no public signup)
router.post('/register', authenticate, async (req, res) => {
  try {
    // Only admins can create users
    if (!['super_admin', 'school_admin'].includes(req.user.role)) {
      return error(res, 'Only administrators can create user accounts', 403);
    }

    const { email, phone, password, first_name, last_name, role, school_id } = req.body;

    if (!email || !password || !first_name || !last_name || !role) {
      return error(res, 'Email, password, first name, last name, and role are required', 400);
    }

    if (password.length < 8) {
      return error(res, 'Password must be at least 8 characters', 400);
    }

    const validRoles = ['school_admin', 'teacher', 'parent', 'student', 'accountant', 'staff'];
    if (req.user.role !== 'super_admin' && role === 'super_admin') {
      return error(res, 'Cannot create super admin accounts', 403);
    }
    if (!validRoles.includes(role) && role !== 'super_admin') {
      return error(res, 'Invalid role specified', 400);
    }

    const existing = await db('users').where({ email }).first();
    if (existing) {
      return error(res, 'A user with this email already exists', 409);
    }

    if (phone) {
      const phoneExists = await db('users').where({ phone }).first();
      if (phoneExists) {
        return error(res, 'A user with this phone number already exists', 409);
      }
    }

    const password_hash = await bcrypt.hash(password, 12);
    const targetSchoolId = school_id || req.user.school_id;

    const [user] = await db('users')
      .insert({
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || null,
        password_hash,
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        role,
        school_id: targetSchoolId,
      })
      .returning(['id', 'email', 'phone', 'role', 'first_name', 'last_name', 'school_id']);

    return success(res, { user }, 201);
  } catch (err) {
    console.error('Register error:', err);
    if (err.code === '23505') return error(res, 'Email or phone already exists', 409);
    return error(res, 'Registration failed', 500);
  }
});

// POST /api/auth/setup — first-time setup (creates super admin + school)
router.post('/setup', rateLimit(3, 60000), async (req, res) => {
  try {
    // Only allow if no users exist
    const userCount = await db('users').count('id as count').first();
    if (parseInt(userCount.count) > 0) {
      return error(res, 'System already initialized. Use login instead.', 400);
    }

    const { email, password, first_name, last_name, phone, school_name, school_code, country, curriculum } = req.body;

    if (!email || !password || !first_name || !last_name || !school_name) {
      return error(res, 'Email, password, name, and school name are required', 400);
    }

    if (password.length < 8) {
      return error(res, 'Password must be at least 8 characters', 400);
    }

    // Create school
    const [school] = await db('schools')
      .insert({
        name: school_name.trim(),
        code: (school_code || school_name.substring(0, 6).toUpperCase().replace(/\s/g, '')).trim(),
        country: country || 'Nigeria',
        curriculum: curriculum || 'nigerian',
        default_currency: 'NGN',
      })
      .returning('*');

    // Create super admin
    const password_hash = await bcrypt.hash(password, 12);
    const [admin] = await db('users')
      .insert({
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || null,
        password_hash,
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        role: 'super_admin',
        school_id: school.id,
        is_active: true,
        email_verified: true,
      })
      .returning(['id', 'email', 'phone', 'role', 'first_name', 'last_name', 'school_id']);

    await ensureSchoolDefaults(db, school);

    const token = generateToken(admin);
    await createSession(admin.id, token, req);

    return success(res, { user: admin, school, token }, 201);
  } catch (err) {
    console.error('Setup error:', err);
    return error(res, 'System setup failed', 500);
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await db('users')
      .select('id', 'email', 'phone', 'role', 'first_name', 'last_name', 'avatar_url',
        'school_id', 'gender', 'date_of_birth', 'address', 'nationality',
        'qualification', 'employee_id', 'last_login', 'created_at')
      .where({ id: req.user.id })
      .first();

    if (!user) return error(res, 'User not found', 404);

    let school = null;
    if (user.school_id) {
      school = await db('schools').where({ id: user.school_id }).first();
    }

    return success(res, { user, school });
  } catch (err) {
    return error(res, 'Failed to fetch profile');
  }
});

// PUT /api/auth/me
router.put('/me', authenticate, async (req, res) => {
  try {
    const allowed = ['first_name', 'last_name', 'phone', 'avatar_url', 'address', 'gender', 'date_of_birth', 'nationality'];
    const updates = {};
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field] || null;
    });

    if (Object.keys(updates).length === 0) {
      return error(res, 'No changes submitted', 400);
    }

    updates.updated_at = db.fn.now();
    const [user] = await db('users')
      .where({ id: req.user.id })
      .update(updates)
      .returning(['id', 'email', 'phone', 'role', 'first_name', 'last_name', 'avatar_url', 'school_id']);

    return success(res, user);
  } catch (err) {
    if (err.code === '23505') return error(res, 'Phone number already exists', 409);
    return error(res, 'Failed to update profile');
  }
});

// POST /api/auth/change-password
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return error(res, 'Current password and new password are required', 400);
    }

    if (new_password.length < 8) {
      return error(res, 'New password must be at least 8 characters', 400);
    }

    const user = await db('users').where({ id: req.user.id }).first();
    const valid = await bcrypt.compare(current_password, user.password_hash);
    if (!valid) return error(res, 'Current password is incorrect', 400);

    const password_hash = await bcrypt.hash(new_password, 12);
    await db('users').where({ id: req.user.id }).update({ password_hash });

    return success(res, { message: 'Password changed successfully' });
  } catch (err) {
    return error(res, 'Failed to change password');
  }
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req, res) => {
  try {
    await invalidateSession(req.token);
    return success(res, { message: 'Logged out successfully' });
  } catch (err) {
    return success(res, { message: 'Logged out' });
  }
});

// GET /api/auth/check-setup — check if system needs initial setup
router.get('/check-setup', async (req, res) => {
  try {
    const userCount = await db('users').count('id as count').first();
    const needsSetup = parseInt(userCount.count) === 0;
    return success(res, { needsSetup });
  } catch (err) {
    // If tables don't exist yet, needs setup
    return success(res, { needsSetup: true });
  }
});

module.exports = router;
