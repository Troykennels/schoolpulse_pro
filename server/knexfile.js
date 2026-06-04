const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Detect environment
const isServerless = Boolean(process.env.VERCEL || process.env.SERVERLESS);
const isProduction = process.env.NODE_ENV === 'production';
const usePostgres = Boolean(process.env.DATABASE_URL) || process.env.DB_CLIENT === 'pg';

// SQLite config — used locally when no DATABASE_URL is set (zero setup)
const sqliteFilename = process.env.SQLITE_FILENAME || path.join(__dirname, 'data', 'schoolpulse.sqlite3');
if (!usePostgres) {
  try { fs.mkdirSync(path.dirname(sqliteFilename), { recursive: true }); } catch (_) {}
}

const sqliteConfig = {
  client: 'sqlite3',
  connection: { filename: sqliteFilename },
  useNullAsDefault: true,
  pool: {
    afterCreate: (conn, done) => conn.run('PRAGMA foreign_keys = ON', done),
  },
  migrations: { directory: './migrations' },
  seeds: { directory: './seeds' },
};

// ── PostgreSQL config ────────────────────────────────────────────
// Compatible with: Supabase, CockroachDB, Railway, Aiven, Render,
//                  any standard PostgreSQL connection string.
//
// Supabase pooler URLs contain "pgbouncer=true" — Knex needs
// `prepareStatements: false` for those connections.
const dbUrl = process.env.DATABASE_URL || '';
const isPgBouncer = dbUrl.includes('pgbouncer=true') || dbUrl.includes('pooler.supabase');

const postgresConfig = {
  client: 'pg',
  connection: dbUrl
    ? {
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false },
      }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME || 'schoolpulse',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      },
  // Serverless-safe pool — keeps connections low to stay within free tier limits
  pool: (isServerless || isProduction)
    ? { min: 0, max: 2, acquireTimeoutMillis: 10000, idleTimeoutMillis: 5000 }
    : { min: 1, max: 10, acquireTimeoutMillis: 8000 },
  // Required for Supabase connection pooler (PgBouncer)
  ...(isPgBouncer ? { version: '13.0' } : {}),
  migrations: { directory: './migrations' },
  seeds: { directory: './seeds' },
  asyncStackTraces: !isProduction,
};

module.exports = {
  development: usePostgres ? postgresConfig : sqliteConfig,
  test: sqliteConfig,
  production: postgresConfig,
};
