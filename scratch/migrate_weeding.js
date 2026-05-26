const db = require('../backend/config/db');

async function checkTable() {
  try {
    const [rows] = await db.query("SHOW TABLES LIKE 'weeding_logs'");
    if (rows.length === 0) {
      console.log("Table weeding_logs does not exist. Creating...");
      await db.query(`
        CREATE TABLE weeding_logs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          block_id INT NOT NULL,
          log_date DATE NOT NULL,
          weed_type VARCHAR(50),
          round_label VARCHAR(50),
          covered_area DECIMAL(10,2),
          recorded_by VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY unique_weeding (block_id, log_date, weed_type, round_label)
        )
      `);
      console.log("Table weeding_logs created successfully.");
    } else {
      console.log("Table weeding_logs already exists.");
    }
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

checkTable();
