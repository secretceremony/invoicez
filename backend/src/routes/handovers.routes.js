import { Router } from 'express';
import { callProcFirst, callProcSets } from '../db.js';

const r = Router();

/** LIST by InvoiceCode (encoded di path)  
 * GET /api/handovers/by-code/<encoded>
 */
r.get(/^\/by-code\/(.+)$/, async (req, res) => {
  try {
    let code = req.params[0]; try { code = decodeURIComponent(code); } catch {}
    const rows = await callProcFirst('ListHandoverByCodeTx', [code]);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/** CREATE (by InvoiceCode + StaffNIM)
 * POST /api/handovers
 * body: { invoiceCode, staffNIM, description }
 */
r.post('/', async (req, res) => {
  try {
    const { invoiceCode, staffNIM, description = null } = req.body || {};
    if (!invoiceCode || !staffNIM) {
      return res.status(400).json({ error: 'invoiceCode dan staffNIM wajib' });
    }
    const sets = await callProcSets('CreateHandoverByCodeSafe', [
      invoiceCode, staffNIM, description
    ]);
    res.status(201).json(sets[0]?.[0] ?? { ok: true });
  } catch (e) {
    const msg = e.message || '';
    if (msg.includes('Invoice not found')) return res.status(404).json({ error: 'Invoice not found' });
    if (msg.includes('Staff not found'))   return res.status(404).json({ error: 'Staff not found' });
    res.status(500).json({ error: msg });
  }
});

/** UPDATE by LetterID
 * PATCH /api/handovers/:id
 * body: { letterDate, staffNIM, description }
 */
r.patch('/:id', async (req, res) => {
  try {
    const { letterDate = null, staffNIM = null, description = null } = req.body || {};
    const sets = await callProcSets('UpdateHandoverTx', [
      req.params.id, letterDate, staffNIM, description
    ]);
    let updated = sets[0]?.[0] ?? null;
    try {
      const fresh = await callProcFirst('GetHandoverByIdTx', [req.params.id]);
      if (fresh?.[0]) updated = fresh[0];
    } catch (_) {}
    res.json(updated ?? { ok: true });
  } catch (e) {
    const msg = e.message || '';
    if (msg.includes('Staff not found'))        return res.status(404).json({ error: msg });
    if (msg.includes('Handover letter not found')) return res.status(404).json({ error: msg });
    res.status(500).json({ error: msg });
  }
});

/** DELETE by LetterID
 * DELETE /api/handovers/:id
 */
r.delete('/:id', async (req, res) => {
  try {
    const rows = await callProcFirst('DeleteHandoverTx', [req.params.id]);
    res.json(rows?.[0] ?? { ok: true });
  } catch (e) {
    const msg = e.message || '';
    if (msg.includes('Handover letter not found')) return res.status(404).json({ error: msg });
    res.status(500).json({ error: msg });
  }
});

export default r;
