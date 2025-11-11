// src/db.js
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
dotenv.config();

export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'resolver',
  password: process.env.DB_PASSWORD || process.env.DB_PASS || 'Ganti_Password_Kuat_123!',
  database: process.env.DB_DATABASE || process.env.DB_NAME || 'invoicez_db',
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true,
  multipleStatements: true
});

// -------- Helpers untuk hasil CALL SP --------
function splitSets(rows) {
  // mysql2: [ resultset(Array), OkPacket(Object), resultset(Array), ... ]
  return Array.isArray(rows) ? rows.filter(Array.isArray) : [];
}

export function pickInvoiceSets(rows) {
  const sets = splitSets(rows);
  return {
    summary:   sets[0] ?? [],
    items:     sets[1] ?? [],
    receipts:  sets[2] ?? [],
    handovers: sets[3] ?? []
  };
}

// RAW (kembalikan rows campuran)
export async function callProcRaw(proc, params = []) {
  const placeholders = params.map(() => '?').join(',');
  const sql = `CALL ${proc}(${placeholders});`;
  const [rows] = await pool.query(sql, params);
  return rows;
}

// SETS (langsung array of arrays)
export async function callProcSets(proc, params = []) {
  return splitSets(await callProcRaw(proc, params));
}

// FIRST (ambil resultset pertama saja)
export async function callProcFirst(proc, params = []) {
  const sets = await callProcSets(proc, params);
  return sets[0] ?? [];
}
