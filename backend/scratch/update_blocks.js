const mysql = require('mysql2/promise');
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'tea_erp'
};

async function run() {
  try {
    const connection = await mysql.createConnection(dbConfig);
    await connection.execute('UPDATE blocks SET cropType = "Cinnamon" WHERE id = 1');
    await connection.execute('UPDATE blocks SET cropType = "Coconut" WHERE id = 2');
    console.log("Updated blocks 1 and 2 to Cinnamon and Coconut");
    await connection.end();
  } catch (error) {
    console.error("Update failed:", error);
  }
}
run();
