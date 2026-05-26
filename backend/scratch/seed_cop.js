const db = require('../config/db');

async function checkAndSeed() {
  try {
    console.log('Checking estate_cop_reports table...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS estate_cop_reports (
        id               INT AUTO_INCREMENT PRIMARY KEY,
        code             VARCHAR(20) NOT NULL,
        month            VARCHAR(20) NOT NULL,
        estate           VARCHAR(120),
        crop_monthly     DECIMAL(12,2) DEFAULT 0,
        crop_todate      DECIMAL(12,2) DEFAULT 0,
        leaf_income_m    DECIMAL(14,2) DEFAULT 0,
        leaf_income_t    DECIMAL(14,2) DEFAULT 0,
        sundry_income_m  DECIMAL(14,2) DEFAULT 0,
        sundry_income_t  DECIMAL(14,2) DEFAULT 0,
        sundry_exp_m     DECIMAL(14,2) DEFAULT 0,
        sundry_exp_t     DECIMAL(14,2) DEFAULT 0,
        field_expenses   JSON,
        capital_expenses JSON,
        created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_code_month (code, month)
      )
    `);
    console.log('Table ensured.');

    const [rows] = await db.query('SELECT COUNT(*) as count FROM estate_cop_reports');
    if (rows[0].count === 0) {
      console.log('Seeding initial report...');
      const fieldExpenses = [
        { label: "T/F_WEEDING", monthly: 9000, todate: 114731.25 },
        { label: "T/F_MANURING", monthly: 39300, todate: 453550 },
        { label: "T/F_PLUCKING", monthly: 77233.33, todate: 815500.56 },
        { label: "T/F_ADVISING CHARGES", monthly: 50000, todate: 356666.67 }
      ];
      const capitalExpenses = [
        { label: "2025 N/C - Acr 2", monthly: 33800, todate: 187449.09 }
      ];

      await db.query(
        `INSERT INTO estate_cop_reports 
         (code, month, estate, crop_monthly, crop_todate, leaf_income_m, leaf_income_t, sundry_income_m, sundry_income_t, sundry_exp_m, sundry_exp_t, field_expenses, capital_expenses)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          "5941", "Feb-26", "Rekadahena", 1274, 12482, 261170, 2553519, 0, 11025, 0, 0,
          JSON.stringify(fieldExpenses), JSON.stringify(capitalExpenses)
        ]
      );
      console.log('Seeding complete.');
    } else {
      console.log('Table already has data.');
    }
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkAndSeed();
