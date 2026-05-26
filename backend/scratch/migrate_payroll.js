const db = require('../config/db');

async function migrate() {
  try {
    console.log('Adding worker_name to payroll_entries...');
    await db.query('ALTER TABLE payroll_entries ADD COLUMN IF NOT EXISTS worker_name VARCHAR(255) AFTER worker_id');
    console.log('Success!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
