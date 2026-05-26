// backend/config/dbFactory.js
const mysql = require('mysql2/promise');
require('dotenv').config();

// In‑memory cache of pools per estate identifier
const poolCache = {};

/**
 * Build a MySQL pool for a given estate identifier.
 * Expected env vars for an estate with id "ONE":
 *   DB_ONE_HOST, DB_ONE_USER, DB_ONE_PASSWORD, DB_ONE_NAME
 * If a specific var is missing we fall back to the primary DB vars.
 */
function buildPoolForEstate(estateId) {
  const prefix = estateId ? `DB_${estateId.toUpperCase()}_` : '';
  const host = process.env[`${prefix}HOST`] || process.env.DB_HOST;
  const user = process.env[`${prefix}USER`] || process.env.DB_USER;
  const password = process.env[`${prefix}PASSWORD`] || process.env.DB_PASSWORD || '';
  const database = process.env[`${prefix}NAME`] || process.env.DB_NAME;

  if (!host || !user || !database) {
    console.warn(`[dbFactory] Missing DB config for estate "${estateId}" – using primary DB`);
    return null;
  }

  return mysql.createPool({
    host,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });
}

/**
 * Retrieve (or create) a pool for the given estate.
 * @param {string|number} estateId – identifier stored in the user record.
 * @returns {Promise<Pool>} – MySQL pool instance.
 */
async function getPool(estateId) {
  if (!estateId) return null;
  const key = String(estateId);
  if (poolCache[key]) return poolCache[key];
  const pool = buildPoolForEstate(key);
  if (pool) poolCache[key] = pool;
  return pool;
}

module.exports = { getPool };
