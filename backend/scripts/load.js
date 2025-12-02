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
    try {
      await callProc('CreateStaffTx', [
        r.Name || '',
        r.NIM || null,
        r.Role || null,
        r.Type || 'Lainnya',
        r.Contact || null
      ]);
    } catch (e) {
      const msg = e?.sqlMessage || e?.message || '';
      if (msg.includes('NIM already exists')) {
        console.warn(`Skip staff (duplicate NIM): ${r.NIM || '(null)'}`);
        continue;
      }
      throw e;
    }
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
      r.Category || null,
      r.Type || null
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

function toNum(v, fallback = 0) {
  if (v === undefined || v === null || v === '') return fallback;
  const n = Number(v);
  return Number.isNaN(n) ? fallback : n;
}

async function loadInvoicesWithItems(base) {
  const invoicesFile = path.join(base, 'invoices.csv');
  const itemsFile = path.join(base, 'invoice_items.csv'); // file name in repo

  if (!fs.existsSync(invoicesFile)) {
    console.warn(`Skip invoices: file not found ${invoicesFile}`);
    return;
  }
  if (!fs.existsSync(itemsFile)) {
    console.warn(`Skip invoice items: file not found ${itemsFile}`);
    return;
  }

  const invoices = readCsv(invoicesFile); // expects ID,InvoiceType,Date,ClientID,StaffID,DownPaymentAmount,Status,Notes
  const itemRows = readCsv(itemsFile);    // expects InvoiceID,Description,Quantity,UnitPrice,PurchaseLocation

  // group items by InvoiceID
  const itemsByInvoice = {};
  for (const r of itemRows) {
    const key = r.InvoiceID;
    if (!key) continue;
    (itemsByInvoice[key] ||= []).push({
      Description: r.Description || '',
      Quantity: toNum(r.Quantity, 0),
      UnitPrice: toNum(r.UnitPrice, 0),
      PurchaseLocation: r.PurchaseLocation || null
    });
  }

  let created = 0;
  for (const inv of invoices) {
    const invCode = inv.ID || inv.InvoiceCode;
    const invoiceType = inv.InvoiceType || inv.Type;
    const invoiceDate = inv.Date || inv.InvoiceDate;
    if (!invoiceType || !invoiceDate) {
      console.warn(`Skip invoice (missing type/date): ${invCode || '(no code)'}`);
      continue;
    }
    const items = itemsByInvoice[invCode] || [];
    try {
      await callProc('CreateInvoiceWithItems', [
        invoiceType,
        new Date(invoiceDate),
        inv.ClientID || null,
        inv.StaffID || null,
        toNum(inv.DownPaymentAmount, 0),
        inv.Status || 'Sent',
        inv.Notes || null,
        JSON.stringify(items)
      ]);
      created++;
    } catch (e) {
      console.error(`Invoice failed (${invCode || invoiceDate}):`, e?.sqlMessage || e.message);
    }
  }
  console.log('Invoices created:', created);
}

(async function main() {
  try {
    const base = process.argv[2] || './data';
    await loadClients(path.join(base, 'clients.csv'));
    await loadStaff(path.join(base, 'staff.csv'));
    await loadProducts(path.join(base, 'products.csv'));
    await loadInvoicesWithItems(base);
  } finally {
    await pool.end();
  }
})();
