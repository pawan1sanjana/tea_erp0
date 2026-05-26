const db = require('../backend/config/db');

async function fix() {
  try {
    console.log("Adding updated_at to weeding_logs...");
    await db.query("ALTER TABLE weeding_logs ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
    console.log("Fix successful.");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

fix();
