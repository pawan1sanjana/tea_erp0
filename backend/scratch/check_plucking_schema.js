const db = require('../config/db');

async function checkSchema() {
  try {
    console.log('--- plucking_logs Table ---');
    const [pl] = await db.query('DESCRIBE plucking_logs');
    console.table(pl);

    console.log('\n--- worker_plucking_entries Table ---');
    const [wpe] = await db.query('DESCRIBE worker_plucking_entries');
    console.table(wpe);

    process.exit(0);
  } catch (error) {
    console.error('Error checking schema:', error);
    process.exit(1);
  }
}

checkSchema();
