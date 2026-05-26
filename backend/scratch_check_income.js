const db = require('./config/db');
async function run() {
    try {
        const [rows] = await db.query("SELECT * FROM finance_accounts WHERE type = 'income' OR type = 'revenue'");
        console.log(JSON.stringify(rows, null, 2));
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
run();
