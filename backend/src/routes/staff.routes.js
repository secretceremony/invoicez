// src/routes/staff.routes.js
import { callProcFirst } from '../db.js';
import { Router } from 'express';
const router = Router();

// List (semua / search)
router.get('/', async (req, res) => {
  try {
    const q = req.query.search ?? null;
    const rows = await callProcFirst('SearchStaffTx', [q]);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const rows = await callProcFirst('GetStaffByIdTx', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Staff not found' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req, res) => {
  const { name, nim, role, type, contact } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const rows = await callProcFirst('CreateStaffTx', [
      name, nim ?? null, role ?? null, type ?? null, contact ?? null
    ]);
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.patch('/:id', async (req, res) => {
  const { name, nim, role, type, contact } = req.body || {};
  try {
    const rows = await callProcFirst('UpdateStaffTx', [
      req.params.id, name ?? null, nim ?? null, role ?? null, type ?? null, contact ?? null
    ]);
    res.json(rows[0]);
  } catch (e) {
    const msg = e.message || '';
    if (msg.includes('Staff not found')) return res.status(404).json({ error: 'Staff not found' });
    res.status(400).json({ error: msg });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const rows = await callProcFirst('DeleteStaffTx', [req.params.id]);
    res.json(rows[0] ?? { ok: true });
  } catch (e) {
    const msg = e.message || '';
    if (msg.includes('Staff not found')) return res.status(404).json({ error: 'Staff not found' });
    res.status(400).json({ error: msg });
  }
});

export default router;
