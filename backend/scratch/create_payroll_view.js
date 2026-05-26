const db = require('../config/db');

async function migrate() {
  try {
    console.log('Creating consolidated payroll view (v_payroll_audit)...');
    await db.query(`
      CREATE OR REPLACE VIEW v_payroll_audit AS
      SELECT 
        b.id as batch_id,
        b.batch_date,
        b.task_type,
        b.base_wage,
        b.target_kg as batch_target,
        b.bonus_rate as batch_bonus_rate,
        e.worker_id,
        e.worker_name,
        e.kg as performance_value,
        e.over_kg as surplus,
        e.bonus as worker_bonus,
        e.wage as total_payable,
        e.eligible
      FROM payroll_batches b
      JOIN payroll_entries e ON b.id = e.batch_id
    `);
    console.log('Success!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
