const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'tea_erp'
};

async function createTable() {
  const connection = await mysql.createConnection(dbConfig);
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS tea_packet_issues (
        id INT AUTO_INCREMENT PRIMARY KEY,
        worker_id INT NOT NULL,
        issue_date DATE NOT NULL,
        grade VARCHAR(50) NOT NULL,
        size_grams INT NOT NULL,
        quantity INT NOT NULL,
        unit_price DECIMAL(10, 2) NOT NULL,
        total_price DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (worker_id) REFERENCES workers(id)
      )
    `);
    console.log("Table 'tea_packet_issues' created successfully.");
  } catch (error) {
    console.error("Error creating table:", error);
  } finally {
    await connection.end();
  }
}

createTable();
