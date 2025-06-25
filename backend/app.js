// backend/app.js

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { google } = require('googleapis');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

// Load environment variables from a .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware Setup ---
// Enable Cross-Origin Resource Sharing for your frontend
app.use(cors());
// Parse incoming JSON requests
app.use(express.json());

// --- Google Sheets API Setup ---
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

/**
 * Creates an authenticated Google Auth client.
 * It detects whether it's running in a Vercel environment (using environment variables)
 * or locally (using a key file path).
 * @returns {Promise<import('google-auth-library').GoogleAuth>} An authenticated GoogleAuth client.
 */
async function getAuthClient() {
  if (process.env.GCP_CREDENTIALS_JSON) {
    // For Vercel or other environments where credentials are set as an environment variable
    const credentials = JSON.parse(process.env.GCP_CREDENTIALS_JSON);
    return new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
  } else {
    // For local development, using a service account key file
    const keyFilePath = path.resolve(__dirname, process.env.SERVICE_ACCOUNT_KEY_PATH);
    return new google.auth.GoogleAuth({
      keyFile: keyFilePath,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
  }
}

// Initialize the Google Sheets API client globally
let sheets;
(async () => {
    try {
        const auth = await getAuthClient();
        sheets = google.sheets({ version: 'v4', auth });
        console.log("Google Sheets API initialized successfully.");
    } catch (error) {
        console.error("Failed to initialize Google Sheets API:", error);
    }
})();


// --- Helper Functions for Google Sheets Interaction ---

/**
 * Reads all data from a specified sheet and converts it into an array of objects.
 * @param {string} sheetName The name of the sheet to read.
 * @returns {Promise<Array<Object>>} An array of objects representing the rows.
 */
async function readSheet(sheetName) {
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${sheetName}!A:Z`, // Read all potential columns
        });
        const rows = response.data.values;
        if (!rows || rows.length < 1) return []; // Return empty if no rows or only headers
        const headers = rows[0];
        return rows.slice(1).map(row => {
            const obj = {};
            headers.forEach((header, index) => {
                obj[header] = row[index] || '';
            });
            return obj;
        });
    } catch (error) {
        console.error(`Error reading from sheet ${sheetName}:`, error.message);
        throw new Error(`Failed to read data from ${sheetName}.`);
    }
}

/**
 * Overwrites a sheet with new data.
 * @param {string} sheetName The name of the sheet to write to.
 * @param {Array<Array<string>>} data The data to write, as an array of arrays.
 */
async function writeSheet(sheetName, data) {
    try {
        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `${sheetName}!A1`,
            valueInputOption: 'RAW',
            resource: { values: data },
        });
    } catch (error) {
        console.error(`Error writing to sheet ${sheetName}:`, error.message);
        throw new Error(`Failed to write data to ${sheetName}.`);
    }
}

/**
 * Appends a single new row to a sheet.
 * @param {string} sheetName The name of the sheet to append to.
 * @param {Array<string>} rowData The row data to append.
 */
async function appendSheetRow(sheetName, rowData) {
    try {
        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: `${sheetName}!A1`,
            valueInputOption: 'RAW',
            resource: { values: [rowData] },
        });
    } catch (error) {
        console.error(`Error appending to sheet ${sheetName}:`, error.message);
        throw new Error(`Failed to append data to ${sheetName}.`);
    }
}

/**
 * Generates a unique invoice ID based on type and date.
 * @param {string} invoiceType The type of the invoice.
 * @param {string} invoiceDate The date of the invoice.
 * @returns {Promise<string>} The generated unique invoice ID.
 */
async function generateInvoiceId(invoiceType, invoiceDate) {
    let typePrefix;
    switch (invoiceType) {
        case 'Art Commission': typePrefix = 'COMM'; break;
        case 'Custom Merch': typePrefix = 'CUSTOM'; break;
        case 'Artist Check': typePrefix = 'ART'; break; // Still using ART for backward compatibility if needed
        case 'Internal Expense': typePrefix = 'EXP'; break;
        default: typePrefix = 'INV';
    }
    const date = new Date(invoiceDate);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const basePrefix = `FOLKS/${typePrefix}/${month}`;
    const allInvoices = await readSheet('Invoices');
    let maxNumber = 0;
    allInvoices.forEach(invoice => {
        if (invoice.ID && invoice.ID.startsWith(basePrefix)) {
            const parts = invoice.ID.split('/');
            if (parts.length === 4) {
                const numPart = parseInt(parts[3], 10);
                if (!isNaN(numPart)) maxNumber = Math.max(maxNumber, numPart);
            }
        }
    });
    const nextNumber = String(maxNumber + 1).padStart(3, '0');
    return `${basePrefix}/${nextNumber}`;
}

// --- API Endpoints ---

// ====== CLIENTS ======
app.get('/api/clients', async (req, res) => {
    try {
        const clients = await readSheet('Clients');
        res.json(clients);
    } catch (error) { res.status(500).json({ message: error.message }); }
});

app.post('/api/clients', async (req, res) => {
    try {
        const headers = ['ID', 'Name', 'Contact'];
        const newClient = { ID: uuidv4(), Name: req.body.Name || '', Contact: req.body.Contact || '' };
        await appendSheetRow('Clients', headers.map(h => newClient[h]));
        res.status(201).json(newClient);
    } catch (error) { res.status(500).json({ message: error.message }); }
});

app.put('/api/clients/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const data = await readSheet('Clients');
        const headers = ['ID', 'Name', 'Contact'];
        const index = data.findIndex(item => item.ID === id);
        if (index === -1) return res.status(404).json({ message: 'Client not found' });
        data[index] = { ...data[index], ...req.body, ID: id };
        await writeSheet('Clients', [headers, ...data.map(item => headers.map(h => item[h]))]);
        res.json(data[index]);
    } catch (error) { res.status(500).json({ message: error.message }); }
});

app.delete('/api/clients/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const data = await readSheet('Clients');
        const headers = ['ID', 'Name', 'Contact'];
        const newData = data.filter(item => item.ID !== id);
        if (data.length === newData.length) return res.status(404).json({ message: 'Client not found' });
        await writeSheet('Clients', [headers, ...newData.map(item => headers.map(h => item[h]))]);
        res.status(204).send();
    } catch (error) { res.status(500).json({ message: error.message }); }
});

// ====== STAFF ======
app.get('/api/staff', async (req, res) => {
    try {
        const staff = await readSheet('Staff');
        res.json(staff);
    } catch (error) { res.status(500).json({ message: error.message }); }
});

app.post('/api/staff', async (req, res) => {
    try {
        const headers = ['ID', 'Name', 'NIM', 'Role', 'Contact'];
        const newStaffMember = { ID: uuidv4(), ...req.body };
        await appendSheetRow('Staff', headers.map(h => newStaffMember[h] || ''));
        res.status(201).json(newStaffMember);
    } catch (error) { res.status(500).json({ message: error.message }); }
});

app.put('/api/staff/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const data = await readSheet('Staff');
        const headers = ['ID', 'Name', 'NIM', 'Role', 'Contact'];
        const index = data.findIndex(item => item.ID === id);
        if (index === -1) return res.status(404).json({ message: 'Staff member not found' });
        data[index] = { ...data[index], ...req.body, ID: id };
        await writeSheet('Staff', [headers, ...data.map(item => headers.map(h => item[h] || ''))]);
        res.json(data[index]);
    } catch (error) { res.status(500).json({ message: error.message }); }
});

app.delete('/api/staff/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const data = await readSheet('Staff');
        const headers = ['ID', 'Name', 'NIM', 'Role', 'Contact'];
        const newData = data.filter(item => item.ID !== id);
        if (data.length === newData.length) return res.status(404).json({ message: 'Staff member not found' });
        await writeSheet('Staff', [headers, ...newData.map(item => headers.map(h => item[h] || ''))]);
        res.status(204).send();
    } catch (error) { res.status(500).json({ message: error.message }); }
});

// ====== PRODUCTS & SERVICES ======
app.get('/api/products-services', async (req, res) => {
    try {
        const products = await readSheet('ProductsAndServices');
        res.json(products.map(p => ({ ...p, UnitPrice: parseFloat(p.UnitPrice || 0) })));
    } catch (error) { res.status(500).json({ message: error.message }); }
});

app.post('/api/products-services', async (req, res) => {
    try {
        const headers = ['ID', 'Name', 'Description', 'UnitPrice', 'Category'];
        const newProduct = { ID: uuidv4(), ...req.body };
        await appendSheetRow('ProductsAndServices', headers.map(h => newProduct[h] || ''));
        res.status(201).json(newProduct);
    } catch (error) { res.status(500).json({ message: error.message }); }
});

app.put('/api/products-services/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const data = await readSheet('ProductsAndServices');
        const headers = ['ID', 'Name', 'Description', 'UnitPrice', 'Category'];
        const index = data.findIndex(item => item.ID === id);
        if (index === -1) return res.status(404).json({ message: 'Product/Service not found' });
        data[index] = { ...data[index], ...req.body, ID: id };
        await writeSheet('ProductsAndServices', [headers, ...data.map(item => headers.map(h => item[h] || ''))]);
        res.json(data[index]);
    } catch (error) { res.status(500).json({ message: error.message }); }
});

app.delete('/api/products-services/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const data = await readSheet('ProductsAndServices');
        const headers = ['ID', 'Name', 'Description', 'UnitPrice', 'Category'];
        const newData = data.filter(item => item.ID !== id);
        if (data.length === newData.length) return res.status(404).json({ message: 'Product/Service not found' });
        await writeSheet('ProductsAndServices', [headers, ...newData.map(item => headers.map(h => item[h] || ''))]);
        res.status(204).send();
    } catch (error) { res.status(500).json({ message: error.message }); }
});

// ====== INVOICES ======
app.get('/api/invoices', async (req, res) => {
    try {
        const invoices = await readSheet('Invoices');
        res.json(invoices);
    } catch (error) { res.status(500).json({ message: error.message }); }
});

app.get('/api/invoices/:id', async (req, res) => {
    try {
        const invoiceId = decodeURIComponent(req.params.id);
        const invoices = await readSheet('Invoices');
        let invoice = invoices.find(inv => inv.ID === invoiceId);
        if (!invoice) return res.status(404).json({ message: 'Invoice not found.' });
        
        const invoiceItems = await readSheet('InvoiceItems');
        invoice.items = invoiceItems.filter(item => item.InvoiceID === invoiceId);
        res.json(invoice);
    } catch (error) { res.status(500).json({ message: error.message }); }
});

app.post('/api/invoices', async (req, res) => {
    try {
        const invoiceDate = req.body.Date || new Date().toISOString().split('T')[0];
        const newInvoiceId = await generateInvoiceId(req.body.InvoiceType, invoiceDate);
        const invoiceHeaders = ['ID', 'InvoiceType', 'Date', 'ClientID', 'StaffID', 'Subtotal', 'DownPaymentAmount', 'TotalDue', 'Status', 'Notes'];
        
        const invoiceForSheet = { ...req.body, ID: newInvoiceId, Date: invoiceDate };
        
        await appendSheetRow('Invoices', invoiceHeaders.map(h => String(invoiceForSheet[h] ?? '')));

        if (req.body.items && req.body.items.length > 0) {
            const itemHeaders = ['ID', 'InvoiceID', 'Description', 'Quantity', 'UnitPrice', 'LineTotal', 'PurchaseLocation'];
            const itemRows = req.body.items.map(item => {
                const newItem = { ID: uuidv4(), InvoiceID: newInvoiceId, ...item };
                return itemHeaders.map(h => String(newItem[h] ?? ''));
            });
            await sheets.spreadsheets.values.append({
                spreadsheetId: SPREADSHEET_ID, range: 'InvoiceItems!A1', valueInputOption: 'RAW', resource: { values: itemRows },
            });
        }
        res.status(201).json({ ...req.body, ID: newInvoiceId }); // Send back original body with new ID
    } catch (error) { res.status(500).json({ message: error.message }); }
});

app.put('/api/invoices/:id', async (req, res) => {
    try {
        const invoiceId = req.params.id;
        const invoices = await readSheet('Invoices');
        const invoiceHeaders = ['ID', 'InvoiceType', 'Date', 'ClientID', 'StaffID', 'Subtotal', 'DownPaymentAmount', 'TotalDue', 'Status', 'Notes'];
        const invoiceIndex = invoices.findIndex(inv => inv.ID === invoiceId);
        if (invoiceIndex === -1) return res.status(404).json({ message: 'Invoice not found.' });
        
        invoices[invoiceIndex] = { ...invoices[invoiceIndex], ...req.body, ID: invoiceId };

        await writeSheet('Invoices', [invoiceHeaders, ...invoices.map(inv => invoiceHeaders.map(h => String(inv[h] ?? '')))]);

        const existingItems = await readSheet('InvoiceItems');
        const itemHeaders = ['ID', 'InvoiceID', 'Description', 'Quantity', 'UnitPrice', 'LineTotal', 'PurchaseLocation'];
        const itemsToKeep = existingItems.filter(item => item.InvoiceID !== invoiceId);
        const newItemsForInvoice = (req.body.items || []).map(item => {
            return { ID: item.ID || uuidv4(), InvoiceID: invoiceId, ...item };
        });
        const allItems = [...itemsToKeep, ...newItemsForInvoice];
        await writeSheet('InvoiceItems', [itemHeaders, ...allItems.map(item => itemHeaders.map(h => String(item[h] ?? '')))]);

        res.json(req.body);
    } catch (error) { res.status(500).json({ message: error.message }); }
});

app.delete('/api/invoices/:id', async (req, res) => {
    try {
        const invoiceId = req.params.id;
        const invoices = await readSheet('Invoices');
        const invoiceHeaders = ['ID', 'InvoiceType', 'Date', 'ClientID', 'StaffID', 'Subtotal', 'DownPaymentAmount', 'TotalDue', 'Status', 'Notes'];
        const newInvoices = invoices.filter(inv => inv.ID !== invoiceId);
        if (invoices.length === newInvoices.length) return res.status(404).json({ message: 'Invoice not found.' });
        await writeSheet('Invoices', [invoiceHeaders, ...newInvoices.map(inv => invoiceHeaders.map(h => String(inv[h] ?? '')))]);

        const invoiceItems = await readSheet('InvoiceItems');
        const itemHeaders = ['ID', 'InvoiceID', 'Description', 'Quantity', 'UnitPrice', 'LineTotal', 'PurchaseLocation'];
        const newItems = invoiceItems.filter(item => item.InvoiceID !== invoiceId);
        await writeSheet('InvoiceItems', [itemHeaders, ...newItems.map(item => itemHeaders.map(h => String(item[h] ?? '')))]);
        
        res.status(204).send();
    } catch (error) { res.status(500).json({ message: error.message }); }
});

// --- Server Start ---
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Backend server running on http://localhost:${PORT}`);
    });
} else {
    // Export for Vercel
    module.exports = app;
}