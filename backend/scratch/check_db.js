const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' });

async function check() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'tea_erp'
  });
  const [rows] = await connection.query('DESC attendance_muster');
  console.log(JSON.stringify(rows, null, 2));
  await connection.end();
}
check().catch(console.error);
