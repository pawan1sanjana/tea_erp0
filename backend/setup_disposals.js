const db = require('./config/db');
async function run() {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS asset_disposals (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                estate_id INT NOT NULL DEFAULT 1,
                asset_type ENUM('biological', 'physical') NOT NULL,
                original_id BIGINT NOT NULL,
                asset_name VARCHAR(255) NOT NULL,
                asset_category VARCHAR(100),
                sale_date DATE NOT NULL,
                buyer VARCHAR(255),
                amount DECIMAL(12, 2) NOT NULL,
                notes TEXT,
                metadata JSON,
                income_account_id INT,
                journal_id BIGINT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX (estate_id),
                INDEX (asset_type),
                INDEX (sale_date)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('asset_disposals table created or already exists');
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
run();
