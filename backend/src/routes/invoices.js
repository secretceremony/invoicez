import { Router } from 'express';
import { callProc } from '../db.js';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';

const prod = process.env.NODE_ENV === 'production';

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(compression());

// Batasi ukuran body (hindari payload besar)
app.use(express.json({ limit: '200kb' }));

// CORS: batasi origin di production
const allowed = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors(prod && allowed.length ? { origin: allowed } : {}));

// Rate limit dasar untuk endpoint /api
app.use('/api', rateLimit({
  windowMs: 60 * 1000,
  max: 120, // 120 req/menit per IP
  standardHeaders: true,
  legacyHeaders: false
}));



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
