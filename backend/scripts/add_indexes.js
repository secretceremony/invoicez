// scripts/add_indexes.js
// Create recommended indexes/uniques for core tables (idempotent via name check).
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const db = process.env.DB_DATABASE || process.env.DB_NAME || 'invoicez_db';

const INDEXES = [
  // Users
  { table: 'Users', name: 'idx_users_email', columns: ['Email'], unique: true },
  { table: 'Users', name: 'idx_users_created_at', columns: ['CreatedAt'], unique: false },

  // Invoices
  { table: 'Invoices', name: 'idx_invoices_code', columns: ['InvoiceCode'], unique: true },
  { table: 'Invoices', name: 'idx_invoices_status_date', columns: ['Status', 'InvoiceDate'], unique: false },
  { table: 'Invoices', name: 'idx_invoices_date', columns: ['InvoiceDate'], unique: false },
  { table: 'Invoices', name: 'idx_invoices_client', columns: ['ClientID'], unique: false },
  { table: 'Invoices', name: 'idx_invoices_staff', columns: ['StaffID'], unique: false },

  // Invoice items
  { table: 'InvoiceItems', name: 'idx_items_invoice', columns: ['InvoiceID'], unique: false },
  { table: 'InvoiceItems', name: 'idx_items_product', columns: ['ProductID'], unique: false },

  // Receipts
  { table: 'Receipts', name: 'idx_receipts_invoice', columns: ['InvoiceID'], unique: false },
  { table: 'Receipts', name: 'idx_receipts_created', columns: ['CreatedAt'], unique: false },

  // Handovers
  { table: 'Handovers', name: 'idx_handovers_code', columns: ['InvoiceCode'], unique: false },
  { table: 'Handovers', name: 'idx_handovers_staffnim', columns: ['StaffNIM'], unique: false },
  { table: 'Handovers', name: 'idx_handovers_date', columns: ['LetterDate'], unique: false },

  // Products
  { table: 'Products', name: 'idx_products_category', columns: ['Category'], unique: false },
  { table: 'Products', name: 'idx_products_type', columns: ['Type'], unique: false },

  // Clients / Staff
  { table: 'Clients', name: 'idx_clients_name', columns: ['Name'], unique: false },
  { table: 'Staff', name: 'idx_staff_name', columns: ['Name'], unique: false },
  { table: 'Staff', name: 'idx_staff_nim', columns: ['NIM'], unique: true },
];

async function indexExists(conn, table, name) {
  const [rows] = await conn.query(
    `SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1`,
    [db, table, name],
  );
  return rows.length > 0;
}

async function createIndex(conn, { table, name, columns, unique }) {
  const cols = columns.map((c) => `\`${c}\``).join(', ');
  const ddl = `${unique ? 'CREATE UNIQUE INDEX' : 'CREATE INDEX'} \`${name}\` ON \`${table}\` (${cols});`;
  await conn.query(ddl);
}

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

  let created = 0;
  try {
    for (const idx of INDEXES) {
      try {
        const exists = await indexExists(pool, idx.table, idx.name);
        if (exists) {
          console.log(`SKIP ${idx.table}.${idx.name} (already exists)`);
          continue;
        }
        await createIndex(pool, idx);
        created++;
        console.log(`OK   ${idx.table}.${idx.name} created`);
      } catch (e) {
        console.error(`FAIL ${idx.table}.${idx.name}: ${e.message}`);
      }
    }
  } finally {
    await pool.end();
  }

  if (created === 0) {
    console.log('\nNo new indexes created.');
  } else {
    console.log(`\nCreated ${created} index(es).`);
  }
}

main().catch((e) => {
  console.error('Index creation failed:', e.message);
  process.exitCode = 1;
});
