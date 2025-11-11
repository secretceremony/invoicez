import { Router } from 'express';
import { callProcSets } from '../db.js';

const r = Router();

function mapMySQLError(e) {
  const msg = (e && e.message) || '';
  if (/not found/i.test(msg)) return { code: 404, body: { error: msg } };
  if (/already exists/i.test(msg)) return { code: 409, body: { error: msg } };
  if (/required|invalid|must be/i.test(msg)) return { code: 400, body: { error: msg } };
  return { code: 500, body: { error: msg } };
}

/** List/Search clients: ?q= */
r.get('/', async (req, res) => {
  try {
    const q = req.query.q ?? null; // SP akan kembalikan semua jika NULL
    const rows = await callProc('SearchClientsTx', [q]);
    res.json({ ok: true, data: rows });
  } catch (e) {
    const out = mapMySQLError(e);
    res.status(out.code).json(out.body);
  }
});

/** Get by ID */
r.get('/:id', async (req, res) => {
  try {
    const rows = await callProc('GetClientByIdTx', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Client not found' });
    res.json({ ok: true, data: rows[0] });
  } catch (e) {
    const out = mapMySQLError(e);
    res.status(out.code).json(out.body);
  }
});

/** Create */
r.post('/', async (req, res) => {
  try {
    const { name, contact } = req.body || {};
    const rows = await callProc('CreateClientTx', [name ?? null, contact ?? null]);
    res.status(201).json({ ok: true, data: rows[0] });
  } catch (e) {
    const out = mapMySQLError(e);
    res.status(out.code).json(out.body);
  }
});

/** Update */
r.put('/:id', async (req, res) => {
  try {
    const { name, contact } = req.body || {};
    const rows = await callProc('UpdateClientTx', [
      req.params.id, name ?? null, contact ?? null
    ]);
    res.json({ ok: true, data: rows[0] });
  } catch (e) {
    const out = mapMySQLError(e);
    res.status(out.code).json(out.body);
  }
});

/** Delete */
r.delete('/:id', async (req, res) => {
  try {
    const rows = await callProc('DeleteClientTx', [req.params.id]);
    res.json({ ok: true, data: rows[0] });
  } catch (e) {
    const out = mapMySQLError(e);
    res.status(out.code).json(out.body);
  }
});

// List/Search clients: GET /api/clients?q=keyword
r.get('/', async (req, res) => {
  const q = req.query.q ?? null;
  try {
    const sets = await callProcSets('SearchClientsTx', [q]);
    res.json(sets[0] ?? []); // resultset pertama
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default r;
