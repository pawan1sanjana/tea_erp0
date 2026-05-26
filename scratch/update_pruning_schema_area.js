const db = require('../backend/config/db');

async function updateSchema() {
  try {
    console.log("Adding area_covered to pruning_logs...");
    await db.query(`
      ALTER TABLE pruning_logs 
      ADD COLUMN area_covered DECIMAL(10,4) DEFAULT 0 AFTER bushes_pruned
    `);
    console.log("Column added.");
  } catch (err) {
    console.error("Error or column already exists:", err.message);
  } finally {
    process.exit();
  }
}

updateSchema();
