const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'tea_erp'
};

async function setupStock() {
  const connection = await mysql.createConnection(dbConfig);
  try {
    // 1. Create Stock Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS tea_packet_stock (
        id INT AUTO_INCREMENT PRIMARY KEY,
        grade VARCHAR(50) NOT NULL,
        size_grams INT NOT NULL,
        current_stock INT DEFAULT 0,
        unit_price DECIMAL(10, 2) DEFAULT 0.00,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY grade_size (grade, size_grams)
      )
    `);
    console.log("Table 'tea_packet_stock' ready.");

    // 2. Seed initial data if empty
    const [rows] = await connection.query("SELECT COUNT(*) as count FROM tea_packet_stock");
    if (rows[0].count === 0) {
      const initialData = [
        ['BOPF', 250, 0, 350.00],
        ['BOPF', 500, 0, 650.00],
        ['BOPF', 1000, 0, 1200.00],
        ['BOP', 500, 0, 700.00],
        ['Dust', 500, 0, 550.00]
      ];
      await connection.query(
        "INSERT INTO tea_packet_stock (grade, size_grams, current_stock, unit_price) VALUES ?",
        [initialData]
      );
      console.log("Initial stock types seeded.");
    }

  } catch (error) {
    console.error("Error setting up stock:", error);
  } finally {
    await connection.end();
  }
}

setupStock();
