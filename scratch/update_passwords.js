const db = require('../backend/config/db');
const bcrypt = require('bcryptjs');

async function update() {
  try {
    console.log("Hashing password...");
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('admin123', salt);
    
    console.log("Updating admin@admin.com password to admin123...");
    await db.query("UPDATE users SET password_hash = ? WHERE email = ?", [hash, 'admin@admin.com']);
    
    console.log("Updating psmgrap@gmail.com password to admin123...");
    await db.query("UPDATE users SET password_hash = ? WHERE email = ?", [hash, 'psmgrap@gmail.com']);
    
    console.log("Update completed successfully!");
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

update();
