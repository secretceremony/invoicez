import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'resolver',
  password: process.env.DB_PASS || 'Ganti_Password_Kuat_123!',
  database: process.env.DB_NAME || 'invoicez_db',
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true,
  multipleStatements: true // penting untuk CALL + SELECT @out
});
