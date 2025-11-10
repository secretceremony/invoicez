import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

export const pool = await mysql.createPool({
  host: process.env.DB_HOST,
  port: +process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 5
});

export async function callProc(proc, params = []) {
  const placeholders = params.map(() => '?').join(',');
  const sql = `CALL ${proc}(${placeholders});`;
  const [sets] = await pool.query(sql, params);
  // Kembalikan resultset pertama yang berupa array
  for (const rs of sets) if (Array.isArray(rs)) return rs;
  return [];
}
