const db = require('./backend/config/db');

async function test() {
  const [rows] = await db.query(
    `SELECT 
        m.id,
        m.block_id,
        DAY(m.log_date) as day,
        m.log_date as date,
        m.manure_type as type,
        SUM(m.qty_kg) as qty,
        SUM(m.covered_area) as area,
        (SELECT COUNT(DISTINCT worker_id) 
         FROM attendance_muster am 
         WHERE am.block_id = m.block_id 
           AND am.shift_date = m.log_date 
           AND am.task = 'Manure'
        ) as labours
     FROM manure_logs m
     WHERE YEAR(m.log_date) = ? 
       AND MONTH(m.log_date) = ?
     GROUP BY m.block_id, m.log_date, m.manure_type`,
    [2026, 4]
  );
  console.log(rows);
  process.exit(0);
}
test();
