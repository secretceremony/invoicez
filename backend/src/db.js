// src/db.js
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

// --- MySQL pool ---
export const pool = await mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: +(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'resolver',
  password: process.env.DB_PASSWORD || 'Ganti_Password_Kuat_123!',
  database: process.env.DB_DATABASE || 'invoicez_db',
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true,
});

// --- Generic CALL helpers ---

// returns the raw mysql2 rows from CALL (mixed arrays + OkPackets)
export async function callProcRaw(proc, params = []) {
  const placeholders = params.map(() => '?').join(',');
  const sql = `CALL ${proc}(${placeholders});`;
  const [rows] = await pool.query(sql, params);
  return rows;
}

// returns the FIRST resultset (first Array in rows), or []
export async function callProcFirst(proc, params = []) {
  const rows = await callProcRaw(proc, params);
  for (const rs of rows) if (Array.isArray(rs)) return rs;
  return [];
}

// returns ALL resultsets (only arrays), e.g. [[...],[...], ...]
export async function callProcSets(proc, params = []) {
  const rows = await callProcRaw(proc, params);
  return rows.filter(Array.isArray);
}

// returns FIRST resultset (array) via a simpler name (used by scripts)
export async function callProc(proc, params = []) {
  return callProcFirst(proc, params);
}

// helper to map GET INVOICE multi-sets into named fields
export function pickInvoiceSets(rowsOrSets) {
  const sets = Array.isArray(rowsOrSets) && Array.isArray(rowsOrSets[0])
    ? rowsOrSets
    : (rowsOrSets || []).filter?.(Array.isArray) ?? [];
  return {
    summary:   sets[0] ?? [],
    items:     sets[1] ?? [],
    receipts:  sets[2] ?? [],
    handovers: sets[3] ?? [],
  };
}
