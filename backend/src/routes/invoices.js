// src/routes/invoices.js
import { Router } from 'express';
import { callProcRaw, callProcSets, callProcFirst, pickInvoiceSets } from '../db.js';

const r = Router();

const toNumber = (v) => (v === null || v === undefined || v === '') ? 0 : Number(v);
const normalizeInvoiceHeader = (row = {}) => ({
  ID: row.InvoiceCode ?? row.ID ?? row.id ?? null,
  InvoiceType: row.InvoiceType ?? row.invoiceType ?? row.Type ?? null,
  Date: row.InvoiceDate ?? row.Date ?? row.date ?? null,
  ClientID: row.ClientID ?? row.clientId ?? row.ClientId ?? null,
  StaffID: row.StaffID ?? row.staffId ?? row.StaffId ?? null,
  Subtotal: toNumber(row.Subtotal ?? row.subtotal),
  DownPaymentAmount: toNumber(row.DownPaymentAmount ?? row.DownPayment ?? row.downPaymentAmount),
  TotalDue: toNumber(row.TotalDue ?? row.totalDue ?? row.Total ?? row.Balance),
  Status: row.Status ?? row.status ?? null,
  Notes: row.Notes ?? row.notes ?? null,
});

const normalizeItem = (row = {}) => ({
  ID: row.ItemID ?? row.ID ?? row.id ?? null,
  Description: row.Description ?? row.description ?? '',
  Quantity: toNumber(row.Quantity ?? row.quantity),
  UnitPrice: toNumber(row.UnitPrice ?? row.unitPrice),
  LineTotal: toNumber(row.LineTotal ?? row.lineTotal ?? ((toNumber(row.Quantity) || 0) * (toNumber(row.UnitPrice) || 0))),
  PurchaseLocation: row.PurchaseLocation ?? row.purchaseLocation ?? null,
  ProductID: row.ProductID ?? row.productId ?? null,
});

const normalizeInvoiceDetail = (rowsOrSets) => {
  const sets = pickInvoiceSets(rowsOrSets);
  const header = normalizeInvoiceHeader(sets.summary?.[0] ?? {});
  return {
    ...header,
    items: (sets.items ?? []).map(normalizeItem),
    receipts: sets.receipts ?? [],
    handovers: sets.handovers ?? [],
  };
};

const extractPayload = (body = {}) => ({
  invoiceType: body.invoiceType ?? body.InvoiceType,
  invoiceDate: body.invoiceDate ?? body.Date,
  clientId: body.clientId ?? body.ClientID ?? body.ClientId ?? null,
  staffId: body.staffId ?? body.StaffID ?? body.StaffId ?? null,
  downPaymentAmount: body.downPaymentAmount ?? body.DownPaymentAmount ?? 0,
  status: body.status ?? body.Status ?? 'Draft',
  notes: body.notes ?? body.Notes ?? null,
  items: Array.isArray(body.items) ? body.items : [],
});

const serializeItems = (items = []) => JSON.stringify(
  (items || []).map((item) => ({
    Description: item.Description ?? item.description ?? '',
    Quantity: toNumber(item.Quantity ?? item.quantity ?? 0),
    UnitPrice: toNumber(item.UnitPrice ?? item.unitPrice ?? 0),
    LineTotal: toNumber(item.LineTotal ?? item.lineTotal ?? 0),
    PurchaseLocation: item.PurchaseLocation ?? item.purchaseLocation ?? null,
    ProductID: item.ProductID ?? item.productId ?? null,
  }))
);

/* -------------------- LIST / SEARCH -------------------- */
// GET /api/invoices?limit=&offset=&status=&q=
r.get('/invoices', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
  const offset = Math.max(parseInt(req.query.offset || '0', 10), 0);
  const status = req.query.status || null;
  const q = req.query.q || null;

  try {
    const sets = await callProcSets('SearchInvoicesTx', [q, status, limit, offset]);
    const rows = sets[0] ?? [];
    return res.json(rows.map(normalizeInvoiceHeader));
  } catch (e) {
    res.status(500).json({
      error: e.message,
      hint: 'Pastikan SP SearchInvoicesTx ada dan user punya EXECUTE; semua akses harus via SP (tanpa SELECT langsung).'
    });
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
    const detail = normalizeInvoiceDetail(rows);
    if (!detail.ID) return res.status(404).json({ error: 'Invoice not found', code });
    res.json(detail);
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
    const detail = normalizeInvoiceDetail(rows);
    if (!detail.ID) return res.status(404).json({ error: 'Invoice not found', code });
    res.json(detail);
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
    } = extractPayload(req.body);

    if (!invoiceType || !invoiceDate) {
      return res.status(400).json({ error: 'invoiceType dan invoiceDate wajib' });
    }

    const itemsJson = serializeItems(items);
    const sets = await callProcSets('CreateInvoiceWithItems', [
      invoiceType, invoiceDate, clientId, staffId,
      downPaymentAmount, status, notes, itemsJson
    ]);
    const result = sets[0]?.[0];
    const code = result?.InvoiceCode ?? result?.ID;
    if (!code) return res.status(500).json({ error: 'No result returned' });
    try {
      const detail = normalizeInvoiceDetail(await callProcRaw('GetInvoiceByCodeTx', [code]));
      return res.status(201).json(detail);
    } catch (e) {
      return res.status(201).json(normalizeInvoiceHeader(result));
    }
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

/* ----------------- GET DETAIL by ID (FE expects /api/invoices/:id) ----- */
r.get('/invoices/:id', async (req, res) => {
  try {
    let code = req.params.id;
    if (!code) return res.status(400).json({ error: 'invoice id/code wajib' });
    try { code = decodeURIComponent(code); } catch {}
    const rows = await callProcRaw('GetInvoiceByCodeTx', [code]);
    const detail = normalizeInvoiceDetail(rows);
    if (!detail.ID) return res.status(404).json({ error: 'Invoice not found' });
    res.json(detail);
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
    } = extractPayload(req.body);
    await callProcSets('UpdateInvoiceHeaderByCodeTx', [
      code, invoiceDate, clientId, staffId, downPaymentAmount, status, notes
    ]);
    const detail = normalizeInvoiceDetail(await callProcRaw('GetInvoiceByCodeTx', [code]));
    res.json(detail);
  } catch (e) {
    const msg = e.message || '';
    if (msg.includes('Invoice not found')) return res.status(404).json({ error: 'Invoice not found' });
    if (msg.includes('Cannot set status to Paid')) return res.status(409).json({ error: 'Cannot set status to Paid while there is remaining balance' });
    res.status(500).json({ error: msg });
  }
});

/* -------------------- UPDATE (FE PUT /api/invoices/:id) ------------- */
r.put('/invoices/:id', async (req, res) => {
  try {
    let code = req.params.id; try { code = decodeURIComponent(code); } catch {}
    const {
      invoiceDate = null, clientId = null, staffId = null,
      downPaymentAmount = null, status = null, notes = null
    } = extractPayload(req.body);
    await callProcSets('UpdateInvoiceHeaderByCodeTx', [
      code, invoiceDate, clientId, staffId, downPaymentAmount, status, notes
    ]);
    const detail = normalizeInvoiceDetail(await callProcRaw('GetInvoiceByCodeTx', [code]));
    res.json(detail);
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

/* -------------------- DELETE (FE expects /api/invoices/:id) ---------- */
r.delete('/invoices/:id', async (req, res) => {
  try {
    let code = req.params.id; try { code = decodeURIComponent(code); } catch {}
    const rows = await callProcFirst('DeleteInvoiceByCodeTx', [code]);
    res.json(rows?.[0] ?? { ok: true });
  } catch (e) {
    const msg = e.message || '';
    if (msg.includes('Invoice not found')) return res.status(404).json({ error: 'Invoice not found' });
    res.status(500).json({ error: msg });
  }
});

export default r;
