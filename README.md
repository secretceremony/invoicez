# Invoicez — Invoice Management System

> Personal-use project. If you reuse ideas/code, credit `secretceremony` and build your own implementation.

## Features
- Client CRUD
- Staff/Artist CRUD
- Products & Services catalog
- Invoices with items, subtotal/down payment/total due, statuses
- PDF export (html2canvas + jsPDF)
- Auth (register/login) via PBKDF2 + HS256 token

## Tech stack
**Frontend**: Vue 3 + Vite, Vuetify 3, Pinia, Vue Router, Axios (base URL via `VITE_API_BASE`), html2canvas + jsPDF  
**Backend**: Node.js + Express, mysql2 pool, stored procedures only (no direct SELECT in app), dotenv, cors  
**DB**: MySQL 8 (tables + stored procedures)

## Project structure
```
invoicez/
├─ backend/
│  ├─ src/            # Express app, routers, db pool
│  ├─ scripts/        # utilities (loader, checks, DDL, Postman)
│  ├─ .env.example
├─ frontend/          # Vue 3 app
└─ README.md
```

## Prerequisites
- Node.js >= 18
- MySQL 8
- Git

## Quick start
```bash
git clone https://github.com/secretceremony/invoicez
cd invoicez
```
Then follow backend & frontend setup.

## Backend setup
1) **Create DB + user** (run as admin):
```sql
CREATE DATABASE invoicez_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'resolver'@'localhost' IDENTIFIED BY 'CHANGE_ME_STRONG_123!';
GRANT EXECUTE ON invoicez_db.* TO 'resolver'@'localhost';
FLUSH PRIVILEGES;
```
2) **Create tables** (as root/DBA):
```
SOURCE backend/scripts/create_tables.sql;
```
3) **Create stored procedures**: ensure all procs required by routes exist (use `node backend/scripts/check_procs.js` to list). Procs should run under a definer with SELECT/INSERT/UPDATE/DELETE; app user only needs EXECUTE.
4) **Install deps**:
```bash
cd backend
npm install
```
5) **Env**: copy `.env.example` to `.env` and set:
```
PORT=3001
DB_HOST=localhost
DB_PORT=3306
DB_USER=resolver
DB_PASSWORD=your_password
DB_DATABASE=invoicez_db
JWT_SECRET=change_me_dev_secret
```
6) **(Optional) Seed sample data** (via stored procs only):
```bash
node scripts/load.js ./data
```
Expected files in the target folder: `clients.csv`, `staff.csv`, `products.csv`, `invoices.csv`, `invoice_items.csv`.
7) **Run API**:
```bash
npm run dev
```

### Sanity checks
- Procs present: `node scripts/check_procs.js`
- Indexes present: `node scripts/check_indexes.js` (tables must exist)
- Health: `curl http://localhost:3001/health`

## Frontend setup
```bash
cd frontend
npm install
```
Create `frontend/.env.local`:
```
VITE_API_BASE=http://localhost:3001
```
Run:
```bash
npm run dev
```
Open http://localhost:5173.

## API testing
- Postman collection: `backend/scripts/Invoicez.postman_collection.json`
- Example curls:
```bash
curl http://localhost:3001/health
curl http://localhost:3001/api/products
curl http://localhost:3001/api/clients
curl -X POST http://localhost:3001/api/auth/register -H "Content-Type: application/json" -d '{"email":"user@test.com","password":"pass123","name":"User"}'
```

## Important notes
- **Stored Procedures only**: App code never runs direct SELECT; ensure procs exist and user has EXECUTE. Definer of procs must have DML privileges.
- **Data model**: Minimal DDL provided in `backend/scripts/create_tables.sql`.
- **Routing**: Products available at `/api/products` and alias `/api/products-services`.
- **Port**: Backend defaults to 3001; set `VITE_API_BASE` accordingly.
- **CORS**: Enabled; restrict origin if needed.
- **Env**: Do not commit `.env`.

## Troubleshooting
- 500 on products/invoices: check procs (`SearchProductsTx`, `GetProductByIdTx`, `SearchInvoicesTx`, etc.) and EXECUTE grants.
- DB permission errors: run GRANT EXECUTE as admin; procs should be `SQL SECURITY DEFINER`.
- Loader FK errors: ensure referenced Client/Staff exist or adjust CSV/loader to resolve IDs.

## Historical / deprecated (Google Sheets) notes
- Old datastore: Google Sheets (via googleapis/google-auth-library).
- Service account JSON used to live in backend and referenced by `SERVICE_ACCOUNT_KEY_PATH`.
- Sheets tabs: Clients, Artists, ProductsAndServices, Invoices, InvoiceItems with fixed headers.
- Old run: `node server.js` on port 3000 with direct Sheet reads/writes.
- Replaced by: MySQL 8 + stored procedures + Express (`backend/src`).
- Security: keep `.env` secrets out of VCS; DB creds only (no GCP keys).

## Credits
- **secretceremony** — Frontend owner, earlier Google Sheets backend.
- **ShiroTenma** — Backend owner (MySQL + Express.js), frontend contributions.
