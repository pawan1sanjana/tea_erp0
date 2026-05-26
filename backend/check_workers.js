const mysql = require('mysql2/promise');

async function checkWorkerTypes() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'tea_erp'
  });
  try {
    const [cols] = await connection.query('DESCRIBE workers');
    console.log("Worker Table Columns:", cols.map(c => c.Field));
    // Try to find a type column
    const typeCol = cols.find(c => c.Field.toLowerCase().includes('type') || c.Field.toLowerCase().includes('status') || c.Field.toLowerCase().includes('category'));
    if (typeCol) {
      const [rows] = await connection.query(`SELECT DISTINCT ${typeCol.Field} FROM workers`);
      console.log(`Distinct ${typeCol.Field}:`, rows);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}

checkWorkerTypes();
