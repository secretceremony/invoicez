# Invoicez — Invoice Management System

> **Important usage note**
> This repository and its contents are intended for **personal use** only. If you find this project useful and wish to adapt or be inspired by its concepts, design, or code for your own work, you **must credit** the original author, `secretceremony`, and create your own implementation from scratch. **Direct copying or unauthorized distribution is not permitted.**

> **Migration update (Nov 2025)**
> Invoicez has migrated from a **Google Sheets** backend to **MySQL + Express.js**.
> Historical pieces are marked with strike-through for clarity (see **Historical / deprecated (Google Sheets) notes**).

## Table of contents

* [Features](#features)
* [Tech stack & how it’s used](#tech-stack--how-its-used)
* [Project structure](#project-structure)
* [Prerequisites](#prerequisites)
* [Quick start](#quick-start)
* [Backend & database setup](#backend--database-setup)
* [Frontend setup](#frontend-setup)
* [Running locally](#running-locally)
* [API testing](#api-testing)
* [Offline dev tools you’ll want](#offline-dev-tools-youll-want)
* [Important notes & troubleshooting](#important-notes--troubleshooting)
* [Historical / deprecated (Google Sheets) notes](#historical--deprecated-google-sheets-notes)
* [Credits](#credits)
* [Contributing / feedback](#contributing--feedback)

---

## Features

* **Client management** — CRUD.
* **Staff/Artist management** — CRUD for internal users.
* **Product & service catalog** — descriptions, unit prices, categories.
* **Invoices**

  * Types: **Staff Check**, **Art Commission**, **Custom Merch**, **Internal Expense**.
  * Multiple line items (qty, unit price, line totals).
  * Subtotal, down payment, total due.
  * Statuses: Draft, Sent, Paid, Partially Paid, Cancelled.
  * Free-form notes.
* **Invoice detail + PDF export** (via `html2canvas` + `jspdf`).
* **Responsive UI** built with **Vuetify**.

---

## Tech stack & how it’s used

**Frontend**

* **Vue 3 + Vite** — SPA scaffold and dev server. Entry at `frontend/src/main.js`.
* **Vuetify 3** — UI components & layout. Global theme in `frontend/src/plugins/vuetify.js`.
* **Pinia** — State in `frontend/src/stores/*`.

  * **Convention:** keep API calls in stores; components stay presentational.
* **Vue Router 4** — Routes in `frontend/src/router/index.js`.
* **Axios** — HTTP client via a small wrapper (e.g., `frontend/src/lib/http.js`) setting baseURL → backend.
* **html2canvas + jsPDF** — PDF generation from invoice views (`frontend/src/features/invoice/pdf/*`).

  * **Tip:** large DOMs increase memory; paginate sections if needed.

**Backend**

* **Node.js + Express** — API server (`backend/src/index.js`), routes under `backend/src/routes/*`.
* **mysql2** — DB driver with pooled connections (`backend/src/db/*`).
* **Stored Procedures** — Business logic in MySQL (e.g., `CreateClientTx`, `GetInvoiceByCodeTx`).

  * **Requires** DB user with `EXECUTE` privilege.
* **dotenv** — Config via `backend/.env` (see `.env.example`).
* **cors** — Allow frontend ↔ backend in dev.

**Database**

* **MySQL 8** — App data (clients, staff, products, invoices).

  * Schema & procedures are **not** in this repo; apply your own migrations first.

**Conventions**

* API base URL defaults to `http://localhost:3000` (align backend `PORT` or update Axios baseURL).
* New feature flow: create a **Pinia store** + **route** + **backend router**; keep data fetching in the store.
* PDFs: test with real data; avoid huge images to prevent memory spikes.

---

## Project structure

```
invoicez/
├─ backend/                 # Node/Express API
│  ├─ src/                  # app code (routers, db, etc.)
│  ├─ scripts/              # utilities, e.g. CSV loader
│  └─ .env.example
├─ frontend/                # Vue 3 app (Vuetify)
│  └─ src/
└─ README.md
```

---

## Prerequisites

* **Git**
* **Node.js** ≥ 18
* **MySQL Server** (local or remote)

**Recommended for offline dev**

* **MySQL Workbench** or **DBeaver** (database GUI)
* **Postman** or **Insomnia** (API testing)

---

## Quick start

```bash
git clone https://github.com/secretceremony/invoicez
cd invoicez
```

Then do:

* [Backend & DB setup](#backend--database-setup)
* [Frontend setup](#frontend-setup)
* [Running locally](#running-locally)

---

## Backend & database setup

### 1) Create database & user

Connect to MySQL and run:

```sql
CREATE DATABASE invoicez_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER 'resolver'@'localhost' IDENTIFIED BY 'CHANGE_ME_STRONG_123!';
GRANT SELECT, INSERT, UPDATE, DELETE, EXECUTE ON invoicez_db.* TO 'resolver'@'localhost';
FLUSH PRIVILEGES;
```

> **Why EXECUTE?** Stored procedures power most reads/writes.

### 2) Apply schema & stored procedures

> **Important:** The SQL schema (tables + stored procedures) is **not** included.
> Create tables + procs (e.g., `CreateClientTx`, `GetInvoiceByCodeTx`) in `invoicez_db` before running the API.

### 3) Install backend deps

```bash
cd backend
npm install
```

### 4) Configure environment

Create `backend/.env` from `.env.example`:

```env
# App
PORT=3001  # or 3000 (see Frontend API note)

# MySQL
DB_HOST=localhost
DB_PORT=3306
DB_USER=resolver
DB_PASSWORD=YOUR_SECURE_PASSWORD_HERE
DB_DATABASE=invoicez_db
```

### 5) (Optional) Seed sample data from CSV

From repo root:

```bash
node backend/scripts/load_from_csv.js ./backend/data
```

---

## Frontend setup

```bash
cd frontend
npm install
```

### API base URL / port

* Frontend stores default to **`http://localhost:3000`**.
* Backend `.env.example` uses **`PORT=3001`**.
* **Fix the mismatch**:

  * Either set backend `PORT=3000`, **or**
  * Update the frontend Axios baseURL(s) to `http://localhost:3001`.

---

## Running locally

Open **two terminals**.

### 1) Backend

```bash
cd backend
npm run dev
```

expect something like this

```bash
...\backend>npm run dev

> invoicez-api@0.1.0 dev
> nodemon --watch src --ext js --exec "node src/index.js"

[nodemon] 3.1.10
[nodemon] to restart at any time, enter `rs`
[nodemon] watching path(s): src\**\*
[nodemon] watching extensions: js
[nodemon] starting `node src/index.js`
Booting Invoicez API...
API listening at http://localhost:3001
```

### 2) Frontend

```bash
cd frontend
npm run dev
```

expect something like this

```bash
...\frontend>npm run dev    
> invoicez@0.0.0 dev
> vite


VITE v6.4.1  ready in 1561 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
➜  Vue DevTools: Open http://localhost:5173/__devtools__/ as a separate window
➜  Vue DevTools: Press Alt(⌥)+Shift(⇧)+D in App to toggle the Vue DevTools
➜  press h + enter to show help
```


### 3) Use the app

Visit **[http://localhost:5173](http://localhost:5173)**.

---

## API testing

Use **Postman**/**Insomnia** (or `curl`):

```bash
# Health
curl http://localhost:3001/health

# List clients
curl http://localhost:3001/api/clients

# Create client
curl -X POST http://localhost:3001/api/clients \
  -H "Content-Type: application/json" \
  -d '{"name":"Acme Co","contact":"admin@acme.test"}'

# Get invoice by code
curl http://localhost:3001/api/invoices/INV-2025-0001
```

> If your **Products & Services** feature expects `/api/products-services`, ensure a router exists and is **mounted** at that path.

---

## Offline dev tools you’ll want

* **DB GUI:** MySQL Workbench or DBeaver.
* **API client:** Postman or Insomnia.
* **Nice to have:** TablePlus, HeidiSQL, HTTPie.

---

## Important notes & troubleshooting

* **Missing SQL schema**
  Backend **won’t run** without tables & **stored procedures**. Create them first.

* **Products & Services route**
  Frontend store (`frontend/src/stores/productService.js`) expects `/api/products-services`.
  Implement and mount a router in `backend/src/index.js`, e.g.:

  ```js
  const productsRouter = require('./routes/products.routes'); // example
  app.use('/api/products-services', productsRouter);
  ```

* **Port mismatch**
  Frontend uses `5173`, backend often `3001`.
  Either set backend `PORT=3000` or update frontend base URLs to `3001`.

* **MySQL errors**

  * Ensure server is running and creds are correct.
  * DB user must have **EXECUTE** on required procs.
  * Procedure names/signatures must match your route calls.

* **CORS**
  If blocked requests in browser:

  ```js
  const cors = require('cors');
  app.use(cors({ origin: 'http://localhost:5173' }));
  ```

* **Security**
  Never commit `.env`. Rotate DB creds if exposed.

---

## Historical / deprecated (Google Sheets) notes

> These apply to the **old** backend and are kept only for reference.

* ~~**Backend datastore:** Google Sheets (via `googleapis`, `google-auth-library`)~~
  → **Now:** MySQL 8 with stored procedures.

* ~~**Service account JSON key** placed in `backend/` and referenced by `SERVICE_ACCOUNT_KEY_PATH`~~
  → **Now:** `.env` holds MySQL credentials; no GCP key is required.

* ~~**Spreadsheet tabs** `Clients`, `Artists`, `ProductsAndServices`, `Invoices`, `InvoiceItems` with fixed headers~~
  → **Now:** relational tables in MySQL (apply your own schema/migrations).

* ~~**Run backend:** `node server.js` on port `3000`~~
  → **Now:** `npm run dev` (nodemon) with port set via `.env` (`3000` or `3001`).

* ~~**UUIDs for IDs generated app-side**~~
  → **Now:** IDs managed by DB/stored procedures (implementation dependent).

* ~~**Security for GCP keys** in repo context~~
  → **Now:** keep `.env` secrets out of VCS; DB creds only.

---

## Credits

* **secretceremony** — Frontend owner (overall FE implementation), deployed the frontend, and previously handled the Google Sheets backend.
* **ShiroTenma** — Backend owner (current **MySQL + Express.js**), attempted Google API Service → Google Sheets (earlier), and contributed help on the frontend.

> If you build on these ideas, please **credit the author(s)** and write your **own** implementation.

---

## Contributing / feedback

Found a bug or have an idea?
Open an issue or contact **`secretceremony`** and **`ShiroTenma`**. For larger changes, propose via fork & PR first.

---
