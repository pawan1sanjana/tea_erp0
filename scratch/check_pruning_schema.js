const db = require('../backend/config/db');


async function checkSchema() {
  try {
    const [tables] = await db.query("SHOW TABLES LIKE 'pruning_logs'");
    if (tables.length === 0) {
      console.log("Creating pruning_logs table...");
      await db.query(`
        CREATE TABLE pruning_logs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          block_id INT NOT NULL,
          log_date DATE NOT NULL,
          worker_id INT DEFAULT NULL,
          bushes_pruned INT DEFAULT 0,
          notes TEXT,
          recorded_by VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY unique_worker_log (block_id, log_date, worker_id)
        )
      `);
      console.log("Table created.");
    } else {
      console.log("Table pruning_logs already exists.");
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

checkSchema();
