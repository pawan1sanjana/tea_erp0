const db = require('./config/db');
async function run() {
    try {
        // Create finance_income table
        await db.query(`
            CREATE TABLE IF NOT EXISTS finance_income (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                estate_id INT NOT NULL DEFAULT 1,
                income_date DATE NOT NULL,
                customer VARCHAR(255),
                category VARCHAR(100),
                amount DECIMAL(12, 2) NOT NULL,
                payment_method VARCHAR(50),
                reference VARCHAR(100),
                notes VARCHAR(255),
                income_account_id INT,
                journal_id BIGINT,
                created_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX (estate_id),
                INDEX (income_account_id),
                INDEX (journal_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('finance_income table created or already exists');

        // Add some default income accounts if none exist
        const [existing] = await db.query("SELECT id FROM finance_accounts WHERE type = 'income' LIMIT 1");
        if (existing.length === 0) {
            await db.query(`
                INSERT INTO finance_accounts (estate_id, code, name, type, is_active) VALUES
                (1, '4000', 'Tea Sales', 'income', 1),
                (1, '4100', 'Fertilizer Sales', 'income', 1),
                (1, '4200', 'Nursery Sales', 'income', 1),
                (1, '4900', 'Other Income', 'income', 1)
            `);
            console.log('Default income accounts created');
        }
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
run();
