const db = require('../backend/config/db');

async function check() {
  try {
    console.log("--- Users in DB ---");
    const [rows] = await db.query("SELECT id, first_name, last_name, email, role FROM users");
    console.log(JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

check();
