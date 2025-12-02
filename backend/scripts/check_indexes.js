// scripts/check_indexes.js
// Check recommended indexes/uniques; exits 1 if any missing (tables that don't exist are reported as SKIP).
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const db = process.env.DB_DATABASE || process.env.DB_NAME || 'invoicez_db';

const INDEXES = [
  // Users
  { table: 'Users', name: 'idx_users_email' },
  { table: 'Users', name: 'idx_users_created_at' },

  // Invoices
  { table: 'Invoices', name: 'idx_invoices_code' },
  { table: 'Invoices', name: 'idx_invoices_status_date' },
  { table: 'Invoices', name: 'idx_invoices_date' },
  { table: 'Invoices', name: 'idx_invoices_client' },
  { table: 'Invoices', name: 'idx_invoices_staff' },

  // Invoice items
  { table: 'InvoiceItems', name: 'idx_items_invoice' },
  { table: 'InvoiceItems', name: 'idx_items_product' },

  // Receipts
  { table: 'Receipts', name: 'idx_receipts_invoice' },
  { table: 'Receipts', name: 'idx_receipts_created' },

  // Handovers
  { table: 'Handovers', name: 'idx_handovers_code' },
  { table: 'Handovers', name: 'idx_handovers_staffnim' },
  { table: 'Handovers', name: 'idx_handovers_date' },

  // Products
  { table: 'Products', name: 'idx_products_category' },
  { table: 'Products', name: 'idx_products_type' },

  // Clients / Staff
  { table: 'Clients', name: 'idx_clients_name' },
  { table: 'Staff', name: 'idx_staff_name' },
  { table: 'Staff', name: 'idx_staff_nim' },
];

async function main() {
  const pool = await mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: +(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'resolver',
    password: process.env.DB_PASSWORD || process.env.DB_PASS || '',
    database: db,
    waitForConnections: true,
    connectionLimit: 2,
  });

  let missing = 0;

  try {
    for (const idx of INDEXES) {
      // Check table existence
      const [tbl] = await pool.query(
        `SELECT 1 FROM INFORMATION_SCHEMA.TABLES
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? LIMIT 1`,
        [db, idx.table],
      );
      if (!tbl.length) {
        console.log(`SKIP (no table): ${idx.table}.${idx.name}`);
        continue;
      }

      const [rows] = await pool.query(
        `SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1`,
        [db, idx.table, idx.name],
      );
      if (rows.length) {
        console.log(`OK   ${idx.table}.${idx.name}`);
      } else {
        missing++;
        console.log(`MISS ${idx.table}.${idx.name}`);
      }
    }
  } finally {
    await pool.end();
  }

  if (missing) {
    console.error(`\nMissing ${missing} index(es).`);
    process.exitCode = 1;
  } else {
    console.log('\nAll required indexes present (or tables absent).');
  }
}

main().catch((e) => {
  console.error('Check failed:', e.message);
  process.exitCode = 1;
});
