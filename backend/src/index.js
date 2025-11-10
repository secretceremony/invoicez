console.log('Booting Invoicez API...');

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ---------------- MySQL Pool ----------------
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'resolver',
  password: process.env.DB_PASS || 'Ganti_Password_Kuat_123!',
  database: process.env.DB_NAME || 'invoicez_db',
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true
});

// --------------- Helper: bentuk result dari CALL ---------------
function pickSets(rows) {
  // rows = array yang berisi resultset (array) & ok packets (object)
  const sets = Array.isArray(rows) ? rows.filter(Array.isArray) : [];
  return {
    summary:   sets[0] ?? [],
    items:     sets[1] ?? [],
    receipts:  sets[2] ?? [],
    handovers: sets[3] ?? []
  };
}

// --------------- Healthcheck ---------------
app.get('/health', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 AS ok');
    res.json({ ok: true, db: rows?.[0]?.ok === 1 });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// --------------- GET invoice via query (?code=...) ---------------
app.get('/api/invoice', async (req, res) => {
  let raw = req.query.code || '';
  if (!raw) return res.status(400).json({ error: 'missing ?code=' });
  try { raw = decodeURIComponent(raw); } catch {}
  try {
    const [rows] = await pool.query('CALL GetInvoiceByCodeTx(?)', [raw]);
    const sets = pickSets(rows);
    if (!sets.summary.length) return res.status(404).json({ error: 'Invoice not found', code: raw });
    res.json(sets);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --------------- GET invoice via path (/api/invoices/<encoded-code>) ---------------
app.get(/^\/api\/invoices\/(.+)$/, async (req, res) => {
  let code = req.params[0] || '';
  if (!code) return res.status(400).json({ error: 'invoice code kosong' });
  try { code = decodeURIComponent(code); } catch {}
  try {
    const [rows] = await pool.query('CALL GetInvoiceByCodeTx(?)', [code]);
    const sets = pickSets(rows);
    if (!sets.summary.length) return res.status(404).json({ error: 'Invoice not found', code });
    res.json(sets);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --------------- POST receipt ---------------
app.post('/api/receipts', async (req, res) => {
  try {
    let raw = req.body?.code || '';
    try { raw = decodeURIComponent(raw); } catch {}
    const amount = req.body?.amount;
    const method = req.body?.method ?? null;
    const notes  = req.body?.notes  ?? null;

    if (!raw || !amount) return res.status(400).json({ error: 'code dan amount wajib diisi' });

    const [rows] = await pool.query('CALL CreateReceiptByCodeSafe(?, ?, ?, ?)', [
      raw, amount, method, notes
    ]);
    const sets = pickSets(rows);
    return res.status(201).json({ ok: true, summary: sets.summary });
  } catch (e) {
    const msg = e.message || '';
    if (msg.includes('Invoice not found')) return res.status(404).json({ error: 'Invoice not found' });
    if (msg.includes('Amount must be greater than zero')) return res.status(400).json({ error: 'Amount must be > 0' });
    if (msg.includes('Payment exceeds remaining balance')) return res.status(409).json({ error: 'Payment exceeds remaining balance' });
    return res.status(500).json({ error: msg });
  }
});

// --------------- Debug: recent invoice codes (opsional) ---------------
app.get('/api/debug/recent-invoices', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT InvoiceCode, Status, Subtotal, AmountPaid, TotalDue FROM Invoices ORDER BY InvoiceDate DESC, CreatedAt DESC LIMIT 20'
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --------------- Fallback 404 ---------------
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`API listening at http://localhost:${port}`);
});
