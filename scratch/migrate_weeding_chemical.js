const db = require('../backend/config/db');

async function migrate() {
  try {
    console.log("Adding chemical fields to weeding_logs...");
    await db.query(`
      ALTER TABLE weeding_logs 
      ADD COLUMN chemical_type VARCHAR(100) AFTER weed_type,
      ADD COLUMN chemical_qty DECIMAL(10,2) AFTER chemical_type
    `);
    console.log("Migration successful.");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

migrate();
