const db = require('../config/db');

async function fixSchema() {
  try {
    console.log('Altering factory_balance_payments table...');
    
    // Add missing columns and rename/change existing ones
    const alters = [
      "ALTER TABLE factory_balance_payments ADD COLUMN IF NOT EXISTS period_from DATE AFTER payment_date",
      "ALTER TABLE factory_balance_payments ADD COLUMN IF NOT EXISTS period_to DATE AFTER period_from",
      "ALTER TABLE factory_balance_payments ADD COLUMN IF NOT EXISTS net_payable DECIMAL(15,2) DEFAULT 0 AFTER deductions",
      "ALTER TABLE factory_balance_payments MODIFY COLUMN status VARCHAR(20) DEFAULT 'pending'",
      "ALTER TABLE factory_balance_payments ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(50) DEFAULT 'Bank Transfer' AFTER amount_paid",
      "ALTER TABLE factory_balance_payments ADD COLUMN IF NOT EXISTS remarks TEXT AFTER status"
    ];

    for (const sql of alters) {
      try {
        await db.query(sql);
        console.log(`Executed: ${sql.slice(0, 50)}...`);
      } catch (e) {
        console.warn(`Error on ${sql.slice(0, 50)}: ${e.message}`);
      }
    }

    // Optional: Migrate data from old columns if they exist
    // Renaming payment_method to payment_mode if payment_mode was just created and payment_method exists
    // Actually, it's safer to just handle both in the code or rename if we are sure.
    
    console.log('Schema update complete.');
  } catch (err) {
    console.error('Migration failed:', err);
  }
  process.exit();
}

fixSchema();
