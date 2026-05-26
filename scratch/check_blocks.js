const db = require('../backend/config/db');

async function check() {
  try {
    console.log("--- All Blocks in DB ---");
    const [rows] = await db.query("SELECT id, name, cropType FROM blocks");
    console.log(rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

check();
