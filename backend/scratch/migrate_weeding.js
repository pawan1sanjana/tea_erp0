const db = require('../config/db');

async function migrate() {
  try {
    console.log('Adding worker_id to weeding_logs...');
    await db.query('ALTER TABLE weeding_logs ADD COLUMN IF NOT EXISTS worker_id INT AFTER log_date');
    console.log('Success!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
