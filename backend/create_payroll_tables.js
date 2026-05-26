const db = require('./config/db');

async function createTables() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS payroll_batches (
        id INT AUTO_INCREMENT PRIMARY KEY,
        batch_date DATE NOT NULL UNIQUE,
        base_wage DECIMAL(10,2) NOT NULL,
        target_kg DECIMAL(10,2) NOT NULL,
        bonus_rate DECIMAL(10,2) NOT NULL,
        total_wage DECIMAL(12,2) NOT NULL,
        total_kg DECIMAL(10,2) NOT NULL,
        qualified_workers INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('payroll_batches created');

    await db.query(`
      CREATE TABLE IF NOT EXISTS payroll_entries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        batch_id INT NOT NULL,
        worker_id INT NOT NULL,
        kg DECIMAL(10,2) NOT NULL,
        over_kg DECIMAL(10,2) NOT NULL,
        bonus DECIMAL(10,2) NOT NULL,
        wage DECIMAL(10,2) NOT NULL,
        eligible BOOLEAN NOT NULL,
        FOREIGN KEY (batch_id) REFERENCES payroll_batches(id) ON DELETE CASCADE
      )
    `);
    console.log('payroll_entries created');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit();
  }
}

createTables();
