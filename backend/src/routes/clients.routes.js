// src/routes/clients.routes.js
import { callProcFirst } from '../db.js';
import { Router } from 'express';
const router = Router();

// List (semua / pencarian)
router.get('/', async (req, res) => {
  try {
    const q = req.query.search ?? null; // null = list semua
    const rows = await callProcFirst('SearchClientsTx', [q]);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Detail by ID
router.get('/:id', async (req, res) => {
  try {
    const rows = await callProcFirst('GetClientByIdTx', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Client not found' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Create
router.post('/', async (req, res) => {
  const { name, contact } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const rows = await callProcFirst('CreateClientTx', [name, contact ?? null]);
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Update
router.patch('/:id', async (req, res) => {
  const { name, contact } = req.body || {};
  try {
    const rows = await callProcFirst('UpdateClientTx', [req.params.id, name ?? null, contact ?? null]);
    res.json(rows[0]);
  } catch (e) {
    const msg = e.message || '';
    if (msg.includes('Client not found')) return res.status(404).json({ error: 'Client not found' });
    res.status(400).json({ error: msg });
  }
});

// Delete
router.delete('/:id', async (req, res) => {
  try {
    const rows = await callProcFirst('DeleteClientTx', [req.params.id]);
    res.json(rows[0] ?? { ok: true });
  } catch (e) {
    const msg = e.message || '';
    if (msg.includes('Client not found')) return res.status(404).json({ error: 'Client not found' });
    res.status(400).json({ error: msg });
  }
});

export default router;
