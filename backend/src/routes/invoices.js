// src/routes/invoices.js
import { Router } from 'express';
import { callProcRaw, callProcSets, callProcFirst, pickInvoiceSets, pool } from '../db.js';

const r = Router();

/* -------------------- LIST / SEARCH -------------------- */
// GET /api/invoices?limit=&offset=&status=&q=
r.get('/invoices', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
  const offset = Math.max(parseInt(req.query.offset || '0', 10), 0);
  const status = req.query.status || null;
  const q = req.query.q || null;

  try {
    // 1) pakai SP kalau ada
    try {
      const sets = await callProcSets('SearchInvoicesTx', [q, status, null, null]);
      return res.json(sets[0] ?? []);
    } catch (_) {}

    // 2) fallback SELECT (butuh SELECT privilege)
    const [rows] = await pool.query(
      `SELECT InvoiceCode, InvoiceType, InvoiceDate, Status, Subtotal, AmountPaid, TotalDue
         FROM Invoices
        WHERE (? IS NULL OR Status = ?)
          AND (? IS NULL OR InvoiceCode LIKE CONCAT('%', ?, '%'))
        ORDER BY InvoiceDate DESC, CreatedAt DESC
        LIMIT ? OFFSET ?`,
      [status, status, q, q, limit, offset]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message, hint: 'Buat SP SearchInvoicesTx/ListInvoicesTx lalu GRANT EXECUTE' });
  }
});

/* -------------- DETAIL (via querystring) ---------------- */
// GET /api/invoice?code=FOLKS%2FCOMM%2F2025%2F09%2F001
r.get('/invoice', async (req, res) => {
  let code = req.query.code || '';
  if (!code) return res.status(400).json({ error: 'missing ?code=' });
  try { code = decodeURIComponent(code); } catch {}
  try {
    const rows = await callProcRaw('GetInvoiceByCodeTx', [code]);
    const sets = pickInvoiceSets(rows);
    if (!sets.summary.length) return res.status(404).json({ error: 'Invoice not found', code });
    res.json(sets);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* ---------- SUB-RESOURCES (pakai regex anti-* bentrok) -- */
// GET /api/invoices/by-code/<encoded>/items
r.get(/^\/invoices\/by-code\/(.+)\/items$/, async (req, res) => {
  let code = req.params[0]; try { code = decodeURIComponent(code); } catch {}
  try { res.json(await callProcFirst('ListItemsByCodeTx', [code])); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/invoices/by-code/<encoded>/receipts
r.get(/^\/invoices\/by-code\/(.+)\/receipts$/, async (req, res) => {
  let code = req.params[0]; try { code = decodeURIComponent(code); } catch {}
  try { res.json(await callProcFirst('ListReceiptsByCodeTx', [code])); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/invoices/by-code/<encoded>/handovers
r.get(/^\/invoices\/by-code\/(.+)\/handovers$/, async (req, res) => {
  let code = req.params[0]; try { code = decodeURIComponent(code); } catch {}
  try { res.json(await callProcFirst('ListHandoverByCodeTx', [code])); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

/* -------------- DETAIL (via path) ----------------------- */
// GET /api/invoices/by-code/<encoded>
r.get(/^\/invoices\/by-code\/(.+)$/, async (req, res) => {
  let code = req.params[0] || '';
  if (!code) return res.status(400).json({ error: 'invoice code kosong' });
  try { code = decodeURIComponent(code); } catch {}
  try {
    const rows = await callProcRaw('GetInvoiceByCodeTx', [code]);
    const sets = pickInvoiceSets(rows);
    if (!sets.summary.length) return res.status(404).json({ error: 'Invoice not found', code });
    res.json(sets);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* ------------------- CREATE (dengan items) -------------- */
// POST /api/invoices
r.post('/invoices', async (req, res) => {
  try {
    const {
      invoiceType, invoiceDate,
      clientId = null, staffId = null,
      downPaymentAmount = 0, status = 'Draft', notes = null,
      items = []
    } = req.body || {};

    if (!invoiceType || !invoiceDate) {
      return res.status(400).json({ error: 'invoiceType dan invoiceDate wajib' });
    }

    const itemsJson = JSON.stringify(items || []);
    const sets = await callProcSets('CreateInvoiceWithItems', [
      invoiceType, invoiceDate, clientId, staffId,
      downPaymentAmount, status, notes, itemsJson
    ]);
    const result = sets[0]?.[0];
    if (!result) return res.status(500).json({ error: 'No result returned' });
    res.status(201).json({ ok: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* -------- CREATE “kosong” (pakai items=[]) --------------- */
// POST /api/invoices/empty
r.post('/invoices/empty', async (req, res) => {
  try {
    const {
      invoiceType, invoiceDate,
      clientId = null, staffId = null,
      downPaymentAmount = 0, status = 'Draft', notes = null
    } = req.body || {};
    if (!invoiceType || !invoiceDate) {
      return res.status(400).json({ error: 'invoiceType dan invoiceDate wajib' });
    }
    const sets = await callProcSets('CreateInvoiceWithItems', [
      invoiceType, invoiceDate, clientId, staffId,
      downPaymentAmount, status, notes, '[]'
    ]);
    const result = sets[0]?.[0];
    res.status(201).json({ ok: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* ----------------- ADD ITEM BY INVOICEID ---------------- */
// POST /api/invoices/:invoiceId/items
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
    if (msg.includes('Quantity must be > 0') || msg.includes('UnitPrice must be >= 0'))
      return res.status(400).json({ error: msg });
    res.status(500).json({ error: msg });
  }
});

/* -------------------- UPDATE HEADER BY CODE ------------- */
// PATCH /api/invoices/by-code/<encoded>
r.patch(/^\/invoices\/by-code\/(.+)$/, async (req, res) => {
  try {
    let code = req.params[0]; try { code = decodeURIComponent(code); } catch {}
    const {
      invoiceDate = null, clientId = null, staffId = null,
      downPaymentAmount = null, status = null, notes = null
    } = req.body || {};
    await callProcSets('UpdateInvoiceHeaderByCodeTx', [
      code, invoiceDate, clientId, staffId, downPaymentAmount, status, notes
    ]);
    const detail = pickInvoiceSets(await callProcRaw('GetInvoiceByCodeTx', [code]));
    res.json({ ok: true, detail });
  } catch (e) {
    const msg = e.message || '';
    if (msg.includes('Invoice not found')) return res.status(404).json({ error: 'Invoice not found' });
    if (msg.includes('Cannot set status to Paid')) return res.status(409).json({ error: 'Cannot set status to Paid while there is remaining balance' });
    res.status(500).json({ error: msg });
  }
});

/* -------------------- DELETE BY CODE -------------------- */
// DELETE /api/invoices/by-code/<encoded>
r.delete(/^\/invoices\/by-code\/(.+)$/, async (req, res) => {
  try {
    let code = req.params[0]; try { code = decodeURIComponent(code); } catch {}
    const rows = await callProcFirst('DeleteInvoiceByCodeTx', [code]);
    res.json(rows?.[0] || { ok: true });
  } catch (e) {
    const msg = e.message || '';
    if (msg.includes('Invoice not found')) return res.status(404).json({ error: 'Invoice not found' });
    res.status(500).json({ error: msg });
  }
});

export default r;
