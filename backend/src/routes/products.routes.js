import { Router } from 'express';
import { callProcFirst, callProcSets } from '../db.js';

const r = Router();

// LIST / SEARCH
// GET /api/products?search=&category=
r.get('/', async (req, res) => {
  try {
    const q = req.query.search ?? null;
    const cat = req.query.category ?? null;
    const sets = await callProcSets('SearchProductsTx', [q, cat]);
    res.json(sets[0] ?? []);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET detail by ID
// GET /api/products/:id
r.get('/:id', async (req, res) => {
  try {
    const rows = await callProcFirst('GetProductByIdTx', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Product not found' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// CREATE
// POST /api/products
r.post('/', async (req, res) => {
  try {
    const { name, description = null, unitPrice, category = null } = req.body || {};
    if (!name || unitPrice == null) {
      return res.status(400).json({ error: 'name dan unitPrice wajib' });
    }
    const sets = await callProcSets('CreateProductTx', [name, description, unitPrice, category]);
    res.status(201).json(sets[0]?.[0] ?? { ok: true });
  } catch (e) {
    const msg = e.message || '';
    if (msg.includes('UnitPrice must be')) return res.status(400).json({ error: msg });
    res.status(500).json({ error: msg });
  }
});

// UPDATE
// PATCH /api/products/:id
r.patch('/:id', async (req, res) => {
  try {
    const { name = null, description = null, unitPrice = null, category = null } = req.body || {};
    const sets = await callProcSets('UpdateProductTx', [
      req.params.id, name, description, unitPrice, category
    ]);
    const rows = await callProcFirst('GetProductByIdTx', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Product not found' });
    res.json(rows[0]);
  } catch (e) {
    const msg = e.message || '';
    if (msg.includes('UnitPrice must be')) return res.status(400).json({ error: msg });
    if (msg.includes('Product not found')) return res.status(404).json({ error: msg });
    res.status(500).json({ error: msg });
  }
});

// DELETE
// DELETE /api/products/:id
r.delete('/:id', async (req, res) => {
  try {
    const rows = await callProcFirst('DeleteProductTx', [req.params.id]);
    res.json(rows?.[0] ?? { ok: true });
  } catch (e) {
    const msg = e.message || '';
    if (msg.includes('Product not found')) return res.status(404).json({ error: msg });
    res.status(500).json({ error: msg });
  }
});

export default r;
