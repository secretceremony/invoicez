// src/index.js
console.log('Booting Invoicez API...');

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

// Routers (IMPORT SEKALI SAJA)
import invoicesRouter  from './routes/invoices.js';
import receiptsRouter  from './routes/receipts.js';
import clientsRouter   from './routes/clients.routes.js';
import staffRouter     from './routes/staff.routes.js';
import productsRouter  from './routes/products.routes.js';
import handoversRouter from './routes/handovers.routes.js';

const app = express();
app.use(cors());
app.use(express.json());

// Healthcheck
app.get('/health', (_req, res) => res.json({ ok: true }));

// Mount routers (PASTIKAN TIDAK DUPLIKAT)
app.use('/api',          invoicesRouter);     // invoices: /api/...
app.use('/api',          receiptsRouter);     // receipts: /api/...
app.use('/api/clients',  clientsRouter);      // clients:  /api/clients/...
app.use('/api/staff',    staffRouter);        // staff:    /api/staff/...
app.use('/api/products', productsRouter);     // products: /api/products/...
app.use('/api/handovers', handoversRouter);   // handovers:/api/handovers/...

// Fallback 404 untuk /api
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not Found' }));

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`API listening at http://localhost:${port}`);
});
