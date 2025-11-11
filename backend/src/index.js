// src/index.js
console.log('Booting Invoicez API...');

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

import invoicesRouter from './routes/invoices.js';
import receiptsRouter from './routes/receipts.js';
import clientsRouter from './routes/clients.routes.js';
import staffRouter from './routes/staff.routes.js';

const app = express();
app.use(cors());
app.use(express.json());

// Health
app.get('/health', (_req, res) => res.json({ ok: true }));

// Routers
app.use('/api', invoicesRouter);
app.use('/api', receiptsRouter);
app.use('/api/clients', clientsRouter);
app.use('/api/staff',   staffRouter);

// Fallback 404 untuk /api
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not Found' }));

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`API listening at http://localhost:${port}`);
});
