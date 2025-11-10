import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { pool, callProc } from '../src/db.js';

function readCsv(file) {
  return parse(fs.readFileSync(file), { columns: true, skip_empty_lines: true, trim: true });
}

async function loadClients(file) {
  const rows = readCsv(file);
  for (const r of rows) await callProc('CreateClientTx', [r.Name || '', r.Contact || null]);
  console.log('Clients:', rows.length);
}

async function loadStaff(file) {
  const rows = readCsv(file);
  for (const r of rows) {
    await callProc('CreateStaffTx', [
      r.Name || '',
      r.NIM || null,
      r.Role || null,
      r.Type || 'Lainnya',
      r.Contact || null
    ]);
  }
  console.log('Staff:', rows.length);
}

async function loadProducts(file) {
  const rows = readCsv(file);
  for (const r of rows) {
    await callProc('CreateProductTx', [
      r.Name || '',
      r.Description || null,
      r.UnitPrice ? Number(r.UnitPrice) : 0,
      r.Category || null
    ]);
  }
  console.log('Products:', rows.length);
}

async function resolveClientID(name, contact) {
  const list = JSON.stringify([{ Name: name || null, Contact: contact || null }]);
  const rows = await callProc('GetClientIDsByExactTx', [list]);
  return rows?.[0]?.ClientID || null;
}

async function resolveStaffID(nim) {
  if (!nim) return null;
  const list = JSON.stringify([nim]);
  const rows = await callProc('GetStaffIDsByNIMsTx', [list]);
  return rows?.[0]?.StaffID || null;
}

async function loadInvoicesWithItems(file) {
  const rows = readCsv(file);
  // group by header fields
  const groups = {};
  for (const r of rows) {
    const key = [
      r.InvoiceType, r.InvoiceDate, r.ClientName||'', r.ClientContact||'',
      r.StaffNIM||'', r.DownPayment||'', r.Status||'', r.Notes||''
    ].join('|');
    (groups[key] ||= []).push(r);
  }

  let created = 0;
  for (const key of Object.keys(groups)) {
    const list = groups[key];
    const h = list[0];

    const clientID = await resolveClientID(h.ClientName, h.ClientContact);
    const staffID  = await resolveStaffID(h.StaffNIM);
    const dp       = h.DownPayment ? Number(h.DownPayment) : 0;
    const items = list.map(x => ({
      Description: x.ItemDescription,
      Quantity: Number(x.Quantity || 0),
      UnitPrice: Number(x.UnitPrice || 0),
      PurchaseLocation: x.PurchaseLocation || null
    }));

    const out = await callProc('CreateInvoiceWithItems', [
      h.InvoiceType,
      new Date(h.InvoiceDate),
      clientID,
      staffID,
      dp,
      h.Status || 'Sent',
      h.Notes || null,
      JSON.stringify(items)
    ]);

    const invCode = out?.[0]?.InvoiceCode;

    // optional immediate receipt
    if (h.PaymentAmount && Number(h.PaymentAmount) > 0) {
      try {
        await callProc('CreateReceiptByCodeSafe', [
          invCode,
          Number(h.PaymentAmount),
          h.PaymentMethod || 'Transfer',
          h.PaymentNotes || 'Migrated'
        ]);
      } catch (e) {
        console.warn(`Receipt skip for ${invCode}:`, e?.sqlMessage || e.message);
      }
    }
    created++;
  }
  console.log('Invoices created:', created);
}

(async function main() {
  try {
    const base = process.argv[2] || './data';
    await loadClients(path.join(base, 'clients.csv'));
    await loadStaff(path.join(base, 'staff.csv'));
    await loadProducts(path.join(base, 'products.csv'));
    await loadInvoicesWithItems(path.join(base, 'invoices_items.csv'));
  } finally {
    await pool.end();
  }
})();
