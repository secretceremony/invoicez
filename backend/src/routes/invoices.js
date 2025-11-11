// src/routes/invoices.js
import { Router } from 'express';
import { callProcRaw, callProcSets, callProcFirst, pickInvoiceSets } from '../db.js';

const r = Router();

// --- GET invoice via query (?code=...) ---
r.get('/invoice', async (req, res) => {
  let code = req.query.code || '';
  if (!code) return res.status(400).json({ error: 'missing ?code=' });
  try { code = decodeURIComponent(code); } catch {}
  try {
    const rows = await callProcRaw('GetInvoiceByCodeTx', [code]);
    const sets = pickInvoiceSets(rows);
    if (!sets.summary.length) return res.status(404).json({ error: 'Invoice not found', code });
    res.json(sets);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- GET invoice via path (/api/invoices/<encoded-code>) ---
r.get(/^\/invoices\/(.+)$/, async (req, res) => {
  let code = req.params[0] || '';
  if (!code) return res.status(400).json({ error: 'invoice code kosong' });
  try { code = decodeURIComponent(code); } catch {}
  try {
    const rows = await callProcRaw('GetInvoiceByCodeTx', [code]);
    const sets = pickInvoiceSets(rows);
    if (!sets.summary.length) return res.status(404).json({ error: 'Invoice not found', code });
    res.json(sets);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- Create invoice (JSON items) ---
r.post('/invoices', async (req, res) => {
  try {
    const {
      invoiceType,
      invoiceDate,
      clientId = null,
      staffId = null,
      downPaymentAmount = 0,
      status = 'Draft',
      notes = null,
      items = null // array -> akan di-JSON.stringify
    } = req.body || {};

    if (!invoiceType || !invoiceDate) {
      return res.status(400).json({ error: 'invoiceType dan invoiceDate wajib' });
    }

    const itemsJson = Array.isArray(items) ? JSON.stringify(items) : null;

    const sets = await callProcSets('CreateInvoiceWithItems', [
      invoiceType, invoiceDate, clientId, staffId,
      downPaymentAmount, status, notes, itemsJson
    ]);

    const result = sets[0]?.[0] || null; // { InvoiceID, InvoiceCode }
    if (!result) return res.status(500).json({ error: 'No result returned' });
    res.status(201).json({ ok: true, result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- Create invoice kosong ---
r.post('/invoices/empty', async (req, res) => {
  try {
    const {
      invoiceType, invoiceDate, clientId = null, staffId = null,
      downPaymentAmount = 0, status = 'Draft', notes = null
    } = req.body || {};
    if (!invoiceType || !invoiceDate) {
      return res.status(400).json({ error: 'invoiceType dan invoiceDate wajib' });
    }

    // SP mengembalikan (InvoiceID, InvoiceCode) di resultset pertama
    const sets = await callProcSets('CreateEmptyInvoice', [
      invoiceType, invoiceDate, clientId, staffId, downPaymentAmount, status, notes, null, null
    ]);
    const result = sets[0]?.[0] || null;
    if (!result) return res.status(201).json({ ok: true }); // fallback
    res.status(201).json({ ok: true, result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- Tambah 1 item pada invoice (by InvoiceID) ---
r.post('/invoices/:invoiceId/items', async (req, res) => {
  try {
    const invoiceId = req.params.invoiceId;
    const { description, quantity, unitPrice, purchaseLocation = null, productId = null } = req.body || {};
    if (!invoiceId || !description || !quantity || unitPrice == null) {
      return res.status(400).json({ error: 'invoiceId, description, quantity, unitPrice wajib' });
    }
    await callProcRaw('AddInvoiceItemTx', [
      invoiceId, description, quantity, unitPrice, purchaseLocation, productId
    ]);
    res.status(201).json({ ok: true });
  } catch (e) {
    const msg = e.message || '';
    if (msg.includes('must be > 0')) return res.status(400).json({ error: msg });
    res.status(500).json({ error: msg });
  }
});

// --- Update header invoice (by code) ---
r.patch('/invoices/:code', async (req, res) => {
  try {
    let code = req.params.code;
    try { code = decodeURIComponent(code); } catch {}
    const {
      invoiceDate = null, clientId = null, staffId = null,
      downPaymentAmount = null, status = null, notes = null
    } = req.body || {};
    const sets = await callProcSets('UpdateInvoiceHeaderByCodeTx', [
      code, invoiceDate, clientId, staffId, downPaymentAmount, status, notes
    ]);
    // SP terakhir memanggil GetInvoiceByCodeTx -> multi set
    const rows = await callProcRaw('GetInvoiceByCodeTx', [code]);
    const detail = pickInvoiceSets(rows);
    res.json({ ok: true, detail });
  } catch (e) {
    const msg = e.message || '';
    if (msg.includes('Invoice not found')) return res.status(404).json({ error: 'Invoice not found' });
    if (msg.includes('Cannot set status to Paid')) return res.status(409).json({ error: 'Cannot set status to Paid while there is remaining balance' });
    res.status(500).json({ error: msg });
  }
});

// --- Delete invoice (by code) ---
r.delete('/invoices/:code', async (req, res) => {
  try {
    let code = req.params.code;
    try { code = decodeURIComponent(code); } catch {}
    const sets = await callProcFirst('DeleteInvoiceByCodeTx', [code]);
    res.json(sets?.[0] || { ok: true });
  } catch (e) {
    const msg = e.message || '';
    if (msg.includes('Invoice not found')) return res.status(404).json({ error: 'Invoice not found' });
    res.status(500).json({ error: msg });
  }
});

// --- List items/receipts/handovers (by code) ---
r.get('/invoices/:code/items', async (req, res) => {
  let code = req.params.code; try { code = decodeURIComponent(code); } catch {}
  try { res.json(await callProcFirst('ListItemsByCodeTx', [code])); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
r.get('/invoices/:code/receipts', async (req, res) => {
  let code = req.params.code; try { code = decodeURIComponent(code); } catch {}
  try { res.json(await callProcFirst('ListReceiptsByCodeTx', [code])); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
r.get('/invoices/:code/handovers', async (req, res) => {
  let code = req.params.code; try { code = decodeURIComponent(code); } catch {}
  try { res.json(await callProcFirst('ListHandoverByCodeTx', [code])); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

export default r;
