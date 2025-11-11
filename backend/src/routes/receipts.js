// src/routes/receipts.js
import { Router } from 'express';
import { callProcRaw, callProcFirst } from '../db.js';

const r = Router();

// Create receipt (by InvoiceCode)
r.post('/receipts', async (req, res) => {
  try {
    let code = req.body?.code || '';
    const amount = req.body?.amount;
    const method = req.body?.method ?? null;
    const notes  = req.body?.notes  ?? null;
    if (!code || !amount) return res.status(400).json({ error: 'code dan amount wajib' });
    try { code = decodeURIComponent(code); } catch {}

    const rows = await callProcRaw('CreateReceiptByCodeSafe', [code, amount, method, notes]);
    // SP terakhir SELECT ringkasan invoice:
    const summary = Array.isArray(rows) ? rows.find(Array.isArray) || [] : [];
    return res.status(201).json({ ok: true, summary });
  } catch (e) {
    const msg = e.message || '';
    if (msg.includes('Invoice not found')) return res.status(404).json({ error: 'Invoice not found' });
    if (msg.includes('Amount must be greater than zero')) return res.status(400).json({ error: 'Amount must be > 0' });
    if (msg.includes('Payment exceeds remaining balance')) return res.status(409).json({ error: 'Payment exceeds remaining balance' });
    return res.status(500).json({ error: msg });
  }
});

// List receipts by code
r.get('/receipts', async (req, res) => {
  let code = req.query.code || '';
  if (!code) return res.status(400).json({ error: 'missing ?code=' });
  try { code = decodeURIComponent(code); } catch {}
  try {
    const list = await callProcFirst('ListReceiptsByCodeTx', [code]);
    res.json(list);
  } catch (e) {
    const msg = e.message || '';
    // jika user 'resolver' belum di-grant EXECUTE yang ini, tambahkan GRANT di SQL
    res.status(500).json({ error: msg });
  }
});

// Update receipt amount / method / notes
r.patch('/receipts/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const newAmount = req.body?.amount;
    const method = req.body?.method ?? null;
    const notes  = req.body?.notes  ?? null;
    if (!id || newAmount == null) {
      return res.status(400).json({ error: 'id dan amount wajib' });
    }
    const after = await callProcFirst('UpdateReceiptAmountTx', [id, newAmount, method, notes]);
    res.json({ ok: true, receipt: after?.[0] || null });
  } catch (e) {
    const msg = e.message || '';
    if (msg.includes('AmountPaid must be > 0')) return res.status(400).json({ error: 'Amount must be > 0' });
    if (msg.includes('Payment exceeds remaining balance')) return res.status(409).json({ error: 'Payment exceeds remaining balance' });
    if (msg.includes('Receipt not found')) return res.status(404).json({ error: 'Receipt not found' });
    res.status(500).json({ error: msg });
  }
});

// Delete receipt
r.delete('/receipts/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const out = await callProcFirst('DeleteReceiptTx', [id]);
    res.json(out?.[0] || { ok: true });
  } catch (e) {
    const msg = e.message || '';
    if (msg.includes('Receipt not found')) return res.status(404).json({ error: 'Receipt not found' });
    res.status(500).json({ error: msg });
  }
});

r.get('/receipts', async (req, res) => {
  let { code, from, to } = req.query;
  try {
    if (code) {
      try { code = decodeURIComponent(code); } catch {}
    } else {
      code = null;
    }
    const sets = await callProcSets('SearchReceiptsTx', [code, from ?? null, to ?? null]);
    res.json(sets[0] ?? []);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default r;
