/**
 * Automatically finds the correct Supabase connection URL.
 * Tests all known regions and saves the working one to server/.env
 *
 * Run: node find-db-url.js
 */
process.chdir(__dirname);
require('dotenv').config();

const fs = require('fs');
const path = require('path');

// Extract credentials from current DATABASE_URL or use known values
const PROJECT_REF = 'yqjdrwacmlhzpsnufisz';
const PASSWORD = 'Mathewade163%40%40'; // URL-encoded

// All Supabase pooler regions to try
const REGIONS = [
  'us-east-1',
  'us-west-1',
  'eu-west-1',
  'eu-west-2',
  'eu-central-1',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-south-1',
  'ap-northeast-1',
  'ca-central-1',
  'sa-east-1',
];

// Also try direct connection formats
const DIRECT_URLS = [
  `postgresql://postgres:${PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres`,
];

async function testConnection(url, label) {
  const knex = require('knex');
  const db = knex({
    client: 'pg',
    connection: {
      connectionString: url,
      ssl: { rejectUnauthorized: false },
    },
    pool: { min: 0, max: 1, acquireTimeoutMillis: 5000 },
  });

  try {
    await db.raw('SELECT 1');
    await db.destroy();
    return true;
  } catch {
    await db.destroy().catch(() => {});
    return false;
  }
}

async function main() {
  console.log('\n  SchoolPulse — Finding Working Database Connection');
  console.log('  ──────────────────────────────────────────────────');
  console.log(`  Project: ${PROJECT_REF}\n`);

  // Build all pooler URLs to test
  const urlsToTest = [
    // Transaction pooler (port 6543) — best for serverless/Vercel
    ...REGIONS.map(r => ({
      url: `postgresql://postgres.${PROJECT_REF}:${PASSWORD}@aws-0-${r}.pooler.supabase.com:6543/postgres`,
      label: `Pooler Transaction (${r})`,
    })),
    // Session pooler (port 5432) — acts like direct connection
    ...REGIONS.map(r => ({
      url: `postgresql://postgres.${PROJECT_REF}:${PASSWORD}@aws-0-${r}.pooler.supabase.com:5432/postgres`,
      label: `Pooler Session (${r})`,
    })),
    // Direct connections
    ...DIRECT_URLS.map(url => ({ url, label: 'Direct connection' })),
  ];

  console.log(`  Testing ${urlsToTest.length} connection variants...\n`);

  for (const { url, label } of urlsToTest) {
    process.stdout.write(`  Testing ${label}... `);
    const ok = await testConnection(url);
    if (ok) {
      console.log('✓ WORKS!\n');
      console.log(`  ✓ Working URL found:\n`);
      console.log(`  ${url}\n`);

      // Save to .env
      const envPath = path.join(__dirname, '.env');
      let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

      if (envContent.includes('DATABASE_URL=')) {
        envContent = envContent.replace(/DATABASE_URL=.*/g, `DATABASE_URL=${url}`);
      } else {
        envContent += `\nDATABASE_URL=${url}\n`;
      }

      fs.writeFileSync(envPath, envContent);
      console.log(`  ✓ Saved to server/.env automatically\n`);
      console.log(`  ─────────────────────────────────────────────────────`);
      console.log(`  Copy this URL into Vercel Environment Variables too:\n`);
      console.log(`  DATABASE_URL=${url}\n`);
      process.exit(0);
    } else {
      console.log('✗');
    }
  }

  console.log('\n  ✗ No working connection found.\n');
  console.log('  This usually means:\n');
  console.log('  1. The Supabase project is paused — go to supabase.com and click Restore');
  console.log('  2. Your internet is blocking the connection\n');
  console.log('  Solution: Use Vercel for deployment — Vercel can reach Supabase even');
  console.log('  when your local network cannot. Tables are already created so you\'re ready.\n');
  process.exit(1);
}

main();
