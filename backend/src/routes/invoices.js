import { Router } from 'express';
import { callProc } from '../db.js';

const router = Router();

/**
 * POST /api/invoices
 * Body:
 * {
 *   "invoiceType": "Art Commission",
 *   "invoiceDate": "2025-10-01T00:00:00Z",
 *   "clientID": "<uuid|null>",
 *   "staffID": "<uuid|null>",
 *   "downPaymentAmount": 250000,
 *   "status": "Sent",
 *   "notes": "string",
 *   "items": [
 *     {"Description":"Desain Logo","Quantity":1,"UnitPrice":750000,"PurchaseLocation":null}
 *   ]
 * }
 */
router.post('/', async (req, res) => {
  try {
    const b = req.body || {};
    const itemsJson = JSON.stringify(b.items || []);
    const rows = await callProc('CreateInvoiceWithItems', [
      b.invoiceType,
      new Date(b.invoiceDate),
      b.clientID || null,
      b.staffID || null,
      b.downPaymentAmount ?? 0,
      b.status || 'Sent',
      b.notes || null,
      itemsJson
    ]);
    const out = rows?.[0] || {};
    res.status(201).json(out);
  } catch (e) {
    res.status(400).json({ error: e?.sqlMessage || e.message });
  }
});

/**
 * GET /api/invoices/:code
 * Ambil ringkasan + items + receipts + handover (buat demo read)
 */
router.get('/:code', async (req, res) => {
  try {
    const code = req.params.code;
    const hdr = await callProc('GetInvoiceByCodeTx', [code]);
    res.json(hdr || []);
  } catch (e) {
    res.status(400).json({ error: e?.sqlMessage || e.message });
  }
});

export default router;
