// src/routes/receipts.js
import { Router } from 'express';
import { callProcFirst } from '../db.js';
const router = Router();

// LIST: kalau ada ?code= filter pakai SP ListReceiptsByCodeTx, kalau tidak ada -> list all
router.get('/receipts', async (req, res) => {
  try {
    const code = req.query.code ?? null;
    if (code) {
      const rows = await callProcFirst('ListReceiptsByCodeTx', [code]);
      return res.json(rows);
    }
    // list all via stored procedure (lihat patch SQL di bawah)
    const rows = await callProcFirst('ListAllReceiptsTx', []);
    return res.json(rows);
  } catch (e) {
    const msg = e.message || '';
    if (msg.includes('Invoice not found')) return res.status(404).json({ error: 'Invoice not found' });
    res.status(500).json({ error: msg });
  }
});

// CREATE (baru)
router.post('/invoices/:invoiceId/receipts', async (req, res) => {
  const invoiceId = req.params.invoiceId;
  const { amount, method, notes } = req.body || {};
  if (!amount) return res.status(400).json({ error: 'amount is required' });
  try {
    // kita pakai SP existing: UpdateReceiptAmountTx hanya untuk update; create gunakan CreateReceiptByCodeSafe (by code)
    // Untuk by ID, tambahkan SP baru CreateReceiptByIdTx (lihat patch SQL) atau kirim lewat code.
    const rows = await callProcFirst('CreateReceiptByIdTx', [
      invoiceId, amount, method ?? null, notes ?? null
    ]);
    res.status(201).json(rows[0] ?? { ok: true });
  } catch (e) {
    const msg = e.message || '';
    if (msg.includes('Amount')) return res.status(400).json({ error: msg });
    res.status(500).json({ error: msg });
  }
});

// UPDATE nominal
router.patch('/receipts/:id', async (req, res) => {
  const { amount, method, notes } = req.body || {};
  if (amount == null) return res.status(400).json({ error: 'amount is required' });
  try {
    const rows = await callProcFirst('UpdateReceiptAmountTx', [req.params.id, amount, method ?? null, notes ?? null]);
    res.json(rows[0] ?? { ok: true });
  } catch (e) {
    const msg = e.message || '';
    if (msg.includes('Receipt not found')) return res.status(404).json({ error: 'Receipt not found' });
    res.status(400).json({ error: msg });
  }
});

// DELETE
router.delete('/receipts/:id', async (req, res) => {
  try {
    const rows = await callProcFirst('DeleteReceiptTx', [req.params.id]);
    res.json(rows[0] ?? { ok: true });
  } catch (e) {
    const msg = e.message || '';
    if (msg.includes('Receipt not found')) return res.status(404).json({ error: 'Receipt not found' });
    res.status(400).json({ error: msg });
  }
});

export default router;
