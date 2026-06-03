const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'sp2-change-this-in-production';
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || '7d';
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, role: user.role, school_id: user.school_id },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
};

// Hash token for storage (never store raw tokens)
const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

// Check if account is locked due to too many failed attempts
const isAccountLocked = async (email) => {
  try {
    const cutoff = new Date(Date.now() - LOCKOUT_MINUTES * 60 * 1000);
    const recentFailures = await db('login_attempts')
      .where('email', email)
      .where('success', false)
      .where('created_at', '>', cutoff)
      .count('id as count')
      .first();

    return (recentFailures?.count || 0) >= MAX_LOGIN_ATTEMPTS;
  } catch {
    return false; // Don't block login if table doesn't exist yet
  }
};

// Record login attempt
const recordLoginAttempt = async (email, success, req) => {
  try {
    await db('login_attempts').insert({
      email,
      success,
      ip_address: req.ip || req.connection?.remoteAddress,
      user_agent: (req.headers['user-agent'] || '').substring(0, 500),
    });
  } catch {
    // Non-critical — don't fail the request
  }
};

// Create session record
const createSession = async (userId, token, req) => {
  try {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await db('active_sessions').insert({
      user_id: userId,
      token_hash: hashToken(token),
      ip_address: req.ip || req.connection?.remoteAddress,
      user_agent: (req.headers['user-agent'] || '').substring(0, 500),
      device_name: req.headers['x-device-name'] || 'Unknown',
      expires_at: expiresAt,
    });
  } catch {
    // Non-critical
  }
};

// Invalidate session on logout
const invalidateSession = async (token) => {
  try {
    await db('active_sessions').where({ token_hash: hashToken(token) }).del();
  } catch {
    // Non-critical
  }
};

// Clean up expired sessions (call periodically)
const cleanupSessions = async () => {
  try {
    await db('active_sessions').where('expires_at', '<', new Date()).del();
    await db('login_attempts')
      .where('created_at', '<', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
      .del();
  } catch {
    // Non-critical
  }
};

// Verify token middleware
const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await db('users')
      .where({ id: decoded.id, is_active: true })
      .first();

    if (!user) {
      return res.status(401).json({ error: 'User not found or deactivated' });
    }

    req.user = {
      id: user.id,
      role: user.role,
      school_id: user.school_id,
      first_name: user.first_name,
      last_name: user.last_name,
    };
    req.token = token;

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid authentication token' });
  }
};

// Role-based access control
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (req.user.role === 'super_admin') {
      return next();
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have permission to access this resource' });
    }
    next();
  };
};

// School-scoped data access
const schoolScope = async (req, res, next) => {
  try {
    if (req.user.school_id) {
      req.schoolId = req.user.school_id;
      return next();
    }

    if (req.user.role === 'super_admin') {
      const requestedSchoolId = req.query.school_id || req.body.school_id;
      if (requestedSchoolId) {
        const school = await db('schools').where({ id: requestedSchoolId, is_active: true }).first();
        if (!school) return res.status(404).json({ error: 'School not found' });
        req.schoolId = school.id;
        return next();
      }

      const defaultSchool = await db('schools').where({ is_active: true }).orderBy('created_at').first();
      if (defaultSchool) {
        req.schoolId = defaultSchool.id;
        return next();
      }
    }

    return res.status(403).json({ error: 'No school associated with your account' });
  } catch (err) {
    return res.status(500).json({ error: 'Could not resolve school access' });
  }
};

// Simple rate limiter (in-memory, per IP)
const rateLimitMap = new Map();
const rateLimit = (maxRequests = 10, windowMs = 60000) => {
  return (req, res, next) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const windowStart = now - windowMs;

    if (!rateLimitMap.has(key)) {
      rateLimitMap.set(key, []);
    }

    const attempts = rateLimitMap.get(key).filter(t => t > windowStart);
    attempts.push(now);
    rateLimitMap.set(key, attempts);

    if (attempts.length > maxRequests) {
      return res.status(429).json({
        error: 'Too many requests. Please wait a moment and try again.',
        retryAfter: Math.ceil(windowMs / 1000),
      });
    }

    next();
  };
};

// Periodic cleanup (every hour)
setInterval(cleanupSessions, 60 * 60 * 1000);

module.exports = {
  generateToken,
  hashToken,
  authenticate,
  authorize,
  schoolScope,
  isAccountLocked,
  recordLoginAttempt,
  createSession,
  invalidateSession,
  rateLimit,
  LOCKOUT_MINUTES,
};
