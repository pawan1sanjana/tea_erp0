const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'tea_erp'
};

async function setupAdvances() {
  const connection = await mysql.createConnection(dbConfig);
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS cash_advances (
        id INT AUTO_INCREMENT PRIMARY KEY,
        worker_id INT NOT NULL,
        advance_date DATE NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (worker_id) REFERENCES workers(id)
      )
    `);
    console.log("Table 'cash_advances' created.");
  } catch (error) {
    console.error("Error setting up advances:", error);
  } finally {
    await connection.end();
  }
}

setupAdvances();
