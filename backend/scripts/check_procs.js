// scripts/check_procs.js
// Quick checker for required stored procedures + grants.
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const required = {
  clients: [
    'SearchClientsTx', 'GetClientByIdTx', 'CreateClientTx',
    'UpdateClientTx', 'DeleteClientTx',
  ],
  staff: [
    'SearchStaffTx', 'GetStaffByIdTx', 'CreateStaffTx',
    'UpdateStaffTx', 'DeleteStaffTx',
  ],
  products: [
    'CreateProductTx', 'GetProductByIdTx', 'SearchProductsTx',
    'UpdateProductTx', 'DeleteProductTx',
  ],
  receipts: [
    'ListReceiptsByCodeTx', 'ListAllReceiptsTx', 'CreateReceiptByIdTx',
    'UpdateReceiptAmountTx', 'DeleteReceiptTx', 'CreateReceiptByCodeSafe',
  ],
  handovers: [
    'ListHandoverByCodeTx', 'CreateHandoverByCodeSafe',
    'UpdateHandoverTx', 'DeleteHandoverTx', 'GetHandoverByIdTx',
  ],
  invoices: [
    'SearchInvoicesTx', 'GetInvoiceByCodeTx', 'ListItemsByCodeTx',
    'CreateInvoiceWithItems', 'AddInvoiceItemTx',
    'UpdateInvoiceHeaderByCodeTx', 'DeleteInvoiceByCodeTx',
  ],
  loaderHelpers: [
    'GetClientIDsByExactTx', 'GetStaffIDsByNIMsTx',
  ],
};

async function main() {
  const db = process.env.DB_DATABASE || process.env.DB_NAME || 'invoicez_db';
  const pool = await mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: +(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'resolver',
    password: process.env.DB_PASSWORD || process.env.DB_PASS || '',
    database: db,
    waitForConnections: true,
    connectionLimit: 2,
  });

  try {
    const [rows] = await pool.query(
      `SELECT ROUTINE_NAME FROM INFORMATION_SCHEMA.ROUTINES
       WHERE ROUTINE_SCHEMA = ? AND ROUTINE_TYPE = 'PROCEDURE'`,
      [db],
    );
    const existing = new Set(rows.map(r => r.ROUTINE_NAME));

    let missingTotal = 0;
    console.log(`Checking procedures in schema "${db}"...`);
    for (const [group, list] of Object.entries(required)) {
      const missing = list.filter(name => !existing.has(name));
      if (missing.length) {
        missingTotal += missing.length;
        console.log(`- ${group}: MISSING -> ${missing.join(', ')}`);
      } else {
        console.log(`- ${group}: OK (${list.length})`);
      }
    }

    // Try to show grants for current user (best-effort).
    try {
      const [grants] = await pool.query('SHOW GRANTS FOR CURRENT_USER()');
      console.log('\nGrants for current user:');
      grants.forEach(g => console.log(Object.values(g)[0]));
    } catch (e) {
      console.warn('\nCould not fetch grants (permission needed):', e.message);
    }

    if (missingTotal) {
      console.error(`\nMissing ${missingTotal} procedure(s).`);
      process.exitCode = 1;
    } else {
      console.log('\nAll required procedures are present.');
    }
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error('Check failed:', e.message);
  process.exitCode = 1;
});
