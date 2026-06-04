const knex = require('knex');
const config = require('../knexfile');

const environment = process.env.NODE_ENV || 'development';
const db = knex(config[environment]);
const isSQLite = !process.env.DATABASE_URL && environment !== 'production';

async function runMigrations() {
  try {
    console.log('  → Checking database migrations...');

    if (isSQLite) {
      const [, migrations] = await db.migrate.latest();
      if (migrations.length === 0) {
        console.log('  ✓ SQLite database is up to date\n');
      } else {
        console.log(`  ✓ Ran ${migrations.length} migration(s)\n`);
      }
      return;
    }

    // PostgreSQL — safe raw SQL that works with pooler
    await db.raw(`
      CREATE TABLE IF NOT EXISTS knex_migrations (
        id SERIAL PRIMARY KEY, name VARCHAR(255),
        batch INTEGER, migration_time TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await db.raw(`
      CREATE TABLE IF NOT EXISTS knex_migrations_lock (
        index SERIAL PRIMARY KEY, is_locked INTEGER DEFAULT 0
      )
    `);
    await db.raw(`INSERT INTO knex_migrations_lock (index,is_locked) VALUES (1,0) ON CONFLICT DO NOTHING`);

    const done = await db('knex_migrations').pluck('name');
    const pending = ['001_initial_schema.js', '002_enhanced_modules.js'].filter(m => !done.includes(m));

    if (pending.length === 0) {
      console.log('  ✓ Database is up to date\n');
      return;
    }

    for (const name of pending) {
      const migration = require(`../migrations/${name}`);
      await migration.up(db);
      await db('knex_migrations').insert({ name, batch: 1 });
      console.log(`  ✓ Ran: ${name}`);
    }
    console.log('  ✓ All tables ready\n');
  } catch (err) {
    console.warn('  ⚠ Migration note:', err.message, '\n');
  }
}

module.exports = db;
module.exports.runMigrations = runMigrations;
