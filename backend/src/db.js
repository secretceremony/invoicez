// src/db.js
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

// Pool tunggal untuk semua router
export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'resolver',
  // dukung dua nama variabel env yang pernah dipakai
  password: process.env.DB_PASSWORD || process.env.DB_PASS || 'Ganti_Password_Kuat_123!',
  database: process.env.DB_DATABASE || process.env.DB_NAME || 'invoicez_db',
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true,
});

function placeholders(n) {
  return n ? Array(n).fill('?').join(',') : '';
}

// === Helpers universal untuk CALL ===
export async function callProcRaw(proc, params = []) {
  const sql = `CALL ${proc}(${placeholders(params.length)});`;
  const [rows] = await pool.query(sql, params);
  // mysql2: rows akan berisi [set1, fields1, set2, fields2, ...]
  return rows;
}
export function toSets(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.filter(Array.isArray);
}
export async function callProcSets(proc, params = []) {
  const rows = await callProcRaw(proc, params);
  return toSets(rows);
}
export async function callProcFirst(proc, params = []) {
  const sets = await callProcSets(proc, params);
  const firstSet = sets[0] || [];
  return firstSet[0] || null;
}

// Backward-compat: beberapa file masih import callProc
export async function callProc(proc, params = []) {
  return callProcFirst(proc, params);
}

// Bentuk khusus untuk hasil GetInvoiceByCodeTx
export function pickInvoiceSets(rowsOrSets) {
  const sets = Array.isArray(rowsOrSets?.[0]) ? rowsOrSets : toSets(rowsOrSets);
  return {
    summary:   sets[0] ?? [],
    items:     sets[1] ?? [],
    receipts:  sets[2] ?? [],
    handovers: sets[3] ?? [],
  };
}
