const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
require('dotenv').config();

const { authenticate, authorize, schoolScope } = require('./middleware/auth');
const { runMigrations } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 5000;
const IS_VERCEL = Boolean(process.env.VERCEL);

// ── Security & Middleware ────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    // Allow localhost, any Vercel domain, and the custom CLIENT_URL
    const allowed = [
      'http://localhost:5173',
      'http://localhost:3000',
      process.env.CLIENT_URL,
    ].filter(Boolean);
    if (
      allowed.includes(origin) ||
      /\.vercel\.app$/.test(origin) ||
      process.env.NODE_ENV !== 'production'
    ) {
      return callback(null, true);
    }
    callback(null, true); // open CORS in production — API is protected by JWT
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging (skip in serverless to reduce noise)
if (!IS_VERCEL) {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      if (req.path.startsWith('/api')) {
        console.log(`${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`);
      }
    });
    next();
  });
}

// ── API Routes ───────────────────────────────────────────
const moduleAccess = (...roles) => [authenticate, schoolScope, authorize(...roles)];

app.use('/api/auth',          require('./routes/auth'));
app.use('/api/dashboard',     moduleAccess('super_admin','school_admin','teacher','parent','student','accountant','staff'), require('./routes/dashboard'));
app.use('/api/schools',       moduleAccess('super_admin','school_admin'), require('./routes/schools'));
app.use('/api/users',         moduleAccess('super_admin','school_admin','accountant'), require('./routes/users'));
app.use('/api/students',      moduleAccess('super_admin','school_admin','teacher'), require('./routes/students'));
app.use('/api/academics',     moduleAccess('super_admin','school_admin','teacher'), require('./routes/academics'));
app.use('/api/attendance',    moduleAccess('super_admin','school_admin','teacher'), require('./routes/attendance'));
app.use('/api/fees',          moduleAccess('super_admin','school_admin','accountant'), require('./routes/fees'));
app.use('/api/announcements', moduleAccess('super_admin','school_admin','teacher','parent'), require('./routes/announcements'));
app.use('/api/timetable',     moduleAccess('super_admin','school_admin','teacher','parent','student'), require('./routes/timetable'));
app.use('/api/events',        moduleAccess('super_admin','school_admin','teacher','parent','student'), require('./routes/events'));
app.use('/api/disciplines',   moduleAccess('super_admin','school_admin','teacher'), require('./routes/disciplines'));
app.use('/api/library',       moduleAccess('super_admin','school_admin','teacher','staff','student'), require('./routes/library'));
app.use('/api/chat',          moduleAccess('super_admin','school_admin','teacher','accountant','staff'), require('./routes/chat'));
app.use('/api/learning',      moduleAccess('super_admin','school_admin','teacher','parent','student'), require('./routes/learning'));
app.use('/api/notifications', moduleAccess('super_admin','school_admin','teacher','parent','student','accountant','staff'), require('./routes/notifications'));
app.use('/api/settings',      moduleAccess('super_admin','school_admin'), require('./routes/settings'));
app.use('/api/payroll',       moduleAccess('super_admin','school_admin','accountant'), require('./routes/payroll'));
app.use('/api/hostels',       moduleAccess('super_admin','school_admin','staff'), require('./routes/hostel'));
app.use('/api/transport',     moduleAccess('super_admin','school_admin','staff'), require('./routes/transport'));
app.use('/api/medical',       moduleAccess('super_admin','school_admin','teacher','staff'), require('./routes/medical'));
app.use('/api/inventory',     moduleAccess('super_admin','school_admin','accountant','staff'), require('./routes/inventory'));

// ── Health Check ─────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', version: '2.1.0', product: 'SchoolPulse', timestamp: new Date().toISOString() });
});

app.use('/api', (req, res) => {
  res.status(404).json({ success: false, error: 'API route not found' });
});

// ── Serve Frontend (local dev only — Vercel serves client/dist via CDN) ──
if (!IS_VERCEL) {
  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDist, { maxAge: '1d' }));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      const idx = path.join(clientDist, 'index.html');
      res.sendFile(idx, err => {
        if (err) res.status(404).send('Run `npm run build` first to generate the frontend.');
      });
    }
  });
}

// ── Global Error Handler ─────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'An unexpected error occurred' });
});

// ── Start Server (local only) ────────────────────────────
if (!IS_VERCEL) {
  runMigrations().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n  SchoolPulse v2.1 — http://localhost:${PORT}\n`);
    });
  });
}

module.exports = app;
