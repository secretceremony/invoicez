console.log('Booting Invoicez API...');

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'resolver',
  password: process.env.DB_PASS || 'Ganti_Password_Kuat_123!',
  database: process.env.DB_NAME || 'invoicez_db',
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true
});

app.get('/health', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 AS ok');
    res.json({ ok: true, db: rows[0].ok === 1 });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// contoh endpoint baca faktur by code (pakai SP yang sudah ada)
app.get('/api/invoices/:code(*)', async (req, res) => {
  const code = decodeURIComponent(req.params.code);
  try {
    const [resultSets] = await pool.query('CALL GetInvoiceByCodeTx(?)', [code]);
    res.json({
      summary: resultSets?.[0] ?? [],
      items: resultSets?.[1] ?? [],
      receipts: resultSets?.[2] ?? [],
      handovers: resultSets?.[3] ?? []
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`API listening at http://localhost:${port}`);
});
