// src/routes/products.routes.js
import { Router } from 'express';
import { callProcFirst } from '../db.js'; // atau callProcSets sesuai util kamu

const r = Router();

const normalizeProduct = (row = {}) => ({
  ID: row.ProductID ?? row.ID ?? row.id ?? null,
  Name: row.Name ?? row.name ?? '',
  Description: row.Description ?? row.description ?? null,
  UnitPrice: row.UnitPrice != null ? Number(row.UnitPrice) : null,
  Category: row.Category ?? row.category ?? row.Type ?? row.type ?? null,
  Type: row.Type ?? row.type ?? null,
});

const pickProductPayload = (body = {}) => ({
  name: body.name ?? body.Name,
  description: body.description ?? body.Description ?? null,
  unitPrice: body.unitPrice ?? body.UnitPrice,
  category: body.category ?? body.Category ?? null,
  type: body.type ?? body.Type ?? null,
});

// CREATE
r.post('/', async (req, res) => {
  try {
    const { name, description = null, unitPrice, category = null, type = null } = pickProductPayload(req.body);
    if (!name || unitPrice == null) return res.status(400).json({ error: 'name & unitPrice wajib' });

    // panggil SP baru (dengan p_Type)
    const rows = await callProcFirst('CreateProductTx', [name, description, unitPrice, category, type]);
    const created = rows?.[0] ? normalizeProduct(rows[0]) : { ok: true };
    res.status(201).json(created);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET by ID
r.get('/:id', async (req, res) => {
  try {
    const rows = await callProcFirst('GetProductByIdTx', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(normalizeProduct(rows[0]));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// SEARCH/LIST ?q=&category=&type=
r.get('/', async (req, res) => {
  try {
    const { q = null, category = null, type = null } = req.query;
    const rows = await callProcFirst('SearchProductsTx', [q, category, type]);
    res.json((rows ?? []).map(normalizeProduct));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// UPDATE by ID (semua opsional)
r.patch('/:id', async (req, res) => {
  try {
    const { name = null, description = null, unitPrice = null, category = null, type = null } = pickProductPayload(req.body);
    const rows = await callProcFirst('UpdateProductTx', [
      req.params.id, name, description, unitPrice, category, type
    ]);
    res.json(rows?.[0] ? normalizeProduct(rows[0]) : { ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT alias untuk FE (sama dengan PATCH)
r.put('/:id', async (req, res) => {
  try {
    const { name = null, description = null, unitPrice = null, category = null, type = null } = pickProductPayload(req.body);
    const rows = await callProcFirst('UpdateProductTx', [
      req.params.id, name, description, unitPrice, category, type
    ]);
    res.json(rows?.[0] ? normalizeProduct(rows[0]) : { ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE by ID
r.delete('/:id', async (req, res) => {
  try {
    const rows = await callProcFirst('DeleteProductTx', [req.params.id]);
    res.json(rows?.[0] ? normalizeProduct(rows[0]) : { ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default r;
