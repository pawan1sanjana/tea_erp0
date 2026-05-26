const db = require('../backend/config/db');

async function check() {
  try {
    console.log("--- cinnamon_contracts Columns ---");
    const [cols] = await db.query("SHOW COLUMNS FROM cinnamon_contracts");
    cols.forEach(c => console.log(`${c.Field}: ${c.Type} (${c.Null}, ${c.Key})`));

    console.log("\n--- cinnamon_contracts Rows ---");
    const [rows] = await db.query("SELECT * FROM cinnamon_contracts ORDER BY id DESC LIMIT 5");
    console.log(JSON.stringify(rows, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

check();
