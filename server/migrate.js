/**
 * Database setup script — handles all scenarios automatically.
 * Usage: node migrate.js
 */
process.chdir(__dirname);
require('dotenv').config();

async function main() {
  const knex = require('knex');
  const config = require('./knexfile');
  const env = process.env.NODE_ENV || 'development';
  const isSQLite = !process.env.DATABASE_URL;
  const db = knex(config[env]);

  console.log('\n  SchoolPulse — Database Setup');
  console.log('  ─────────────────────────────────');
  console.log(`  Environment : ${env}`);
  console.log(`  Database    : ${isSQLite ? 'SQLite (local)' : 'PostgreSQL (remote)'}\n`);

  try {
    if (isSQLite) {
      // SQLite — just run Knex migrations normally
      const [, migrations] = await db.migrate.latest();
      if (migrations.length === 0) {
        console.log('  ✓ SQLite database is up to date.\n');
      } else {
        console.log(`  ✓ Created ${migrations.length} migration(s)\n`);
      }
    } else {
      // PostgreSQL — use raw SQL to register migrations safely
      // Step 1: ensure Knex tracking tables exist
      await db.raw(`
        CREATE TABLE IF NOT EXISTS knex_migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255),
          batch INTEGER,
          migration_time TIMESTAMPTZ DEFAULT NOW()
        )
      `);

      await db.raw(`
        CREATE TABLE IF NOT EXISTS knex_migrations_lock (
          index SERIAL PRIMARY KEY,
          is_locked INTEGER DEFAULT 0
        )
      `);

      // Step 2: ensure lock row exists
      await db.raw(`
        INSERT INTO knex_migrations_lock (index, is_locked)
        VALUES (1, 0)
        ON CONFLICT (index) DO NOTHING
      `);

      // Step 3: mark both migrations as complete (skip if already marked)
      await db.raw(`
        INSERT INTO knex_migrations (name, batch, migration_time)
        VALUES
          ('001_initial_schema.js',  1, NOW()),
          ('002_enhanced_modules.js', 1, NOW())
        ON CONFLICT DO NOTHING
      `);

      console.log('  ✓ Migration tracking registered\n');
    }

    // List all tables
    const result = isSQLite
      ? await db.raw("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'knex_%' AND name NOT LIKE 'sqlite_%' ORDER BY name")
      : await db.raw("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name NOT LIKE 'knex_%' ORDER BY table_name");

    const tables = isSQLite
      ? result.map(r => r.name)
      : result.rows.map(r => r.table_name);

    console.log(`  ✓ Tables in database (${tables.length}):`);
    tables.forEach(t => console.log(`      · ${t}`));
    console.log('\n  ✓ Database is ready!\n');

  } catch (err) {
    console.error('\n  ✗ Failed:', err.message, '\n');
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

main();
