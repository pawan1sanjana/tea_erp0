const db = require('../backend/config/db');

async function check() {
  try {
    const [cols] = await db.query("SHOW COLUMNS FROM weeding_logs");
    console.log("Columns in weeding_logs:", cols.map(c => c.Field));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
