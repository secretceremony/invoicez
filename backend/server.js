// invoice-backend/server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { google } = require('googleapis');
const { v4: uuidv4 } = require('uuid'); // For generating unique IDs
const path = require('path'); // For resolving service account key path

dotenv.config(); // Load environment variables from .env file

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Allow cross-origin requests from your Vue.js app
app.use(express.json()); // Parse JSON request bodies

// --- Google Sheets API Setup ---
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SERVICE_ACCOUNT_KEY_PATH = path.resolve(__dirname, process.env.SERVICE_ACCOUNT_KEY_PATH); // Resolve absolute path

// Configure a JWT client for authentication
const auth = new google.auth.GoogleAuth({
    keyFile: SERVICE_ACCOUNT_KEY_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'], // Scope for accessing Google Sheets
});

// Initialize Google Sheets API
const sheets = google.sheets({ version: 'v4', auth });

// --- Helper function to read data from a sheet ---
async function readSheet(sheetName) {
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${sheetName}!A:Z`, // Read all columns (adjust Z if you have more)
        });
        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            return []; // No data found
        }
        const headers = rows[0]; // First row is headers
        return rows.slice(1).map(row => {
            const obj = {};
            headers.forEach((header, index) => {
                obj[header] = row[index] || ''; // Map values to header keys
            });
            return obj;
        });
    } catch (error) {
        console.error(`Error reading from sheet ${sheetName}:`, error.message);
        throw new Error(`Failed to read data from ${sheetName}.`);
    }
}

// --- Helper function to write/update data to a sheet ---
async function writeSheet(sheetName, data) {
    try {
        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `${sheetName}!A1`, // Start from A1 to include headers if needed
            valueInputOption: 'RAW',
            resource: {
                values: data
            },
        });
    } catch (error) {
        console.error(`Error writing to sheet ${sheetName}:`, error.message);
        throw new Error(`Failed to write data to ${sheetName}.`);
    }
}

// --- Helper function to append a new row to a sheet ---
async function appendSheetRow(sheetName, rowData) {
    try {
        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: `${sheetName}!A1`, // Append to the first available row
            valueInputOption: 'RAW',
            resource: {
                values: [rowData] // rowData should be an array matching column order
            },
        });
    } catch (error) {
        console.error(`Error appending to sheet ${sheetName}:`, error.message);
        throw new Error(`Failed to append data to ${sheetName}.`);
    }
}

// --- API Endpoints ---

// --- Clients API ---
app.get('/api/clients', async (req, res) => {
    try {
        const clients = await readSheet('Clients');
        res.json(clients);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/clients', async (req, res) => {
    try {
        const clients = await readSheet('Clients');
        const newClient = {
            ID: uuidv4(), // Generate unique ID
            Name: req.body.Name || '',
            Contact: req.body.Contact || '',
        };

        // Append new client data
        await appendSheetRow('Clients', Object.values(newClient));
        res.status(201).json(newClient);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.put('/api/clients/:id', async (req, res) => {
    try {
        const clientId = req.params.id;
        let clients = await readSheet('Clients');
        const headers = ['ID', 'Name', 'Contact']; // Ensure correct order

        const clientIndex = clients.findIndex(c => c.ID === clientId);
        if (clientIndex === -1) {
            return res.status(404).json({ message: 'Client not found.' });
        }

        // Update client data
        clients[clientIndex] = { ...clients[clientIndex], ...req.body, ID: clientId }; // Ensure ID isn't changed

        // Convert updated clients array back to array of arrays including headers
        const updatedRows = [headers, ...clients.map(client => headers.map(header => client[header]))];

        await writeSheet('Clients', updatedRows);
        res.json(clients[clientIndex]);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.delete('/api/clients/:id', async (req, res) => {
    try {
        const clientId = req.params.id;
        let clients = await readSheet('Clients');
        const headers = ['ID', 'Name', 'Contact']; // Ensure correct order

        const initialLength = clients.length;
        clients = clients.filter(c => c.ID !== clientId);

        if (clients.length === initialLength) {
            return res.status(404).json({ message: 'Client not found.' });
        }

        // Convert remaining clients back to array of arrays including headers
        const updatedRows = [headers, ...clients.map(client => headers.map(header => client[header]))];

        await writeSheet('Clients', updatedRows);
        res.status(204).send(); // No content to send back for successful delete
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


// --- Artists API ---
app.get('/api/artists', async (req, res) => {
    try {
        const artists = await readSheet('Artists');
        res.json(artists);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/artists', async (req, res) => {
    try {
        const newArtist = {
            ID: uuidv4(),
            Name: req.body.Name || '',
            NIM: req.body.NIM || '',
            Role: req.body.Role || '',
            Contact: req.body.Contact || '',
        };
        await appendSheetRow('Artists', Object.values(newArtist));
        res.status(201).json(newArtist);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.put('/api/artists/:id', async (req, res) => {
    try {
        const artistId = req.params.id;
        let artists = await readSheet('Artists');
        const headers = ['ID', 'Name', 'NIM', 'Role', 'Contact'];

        const artistIndex = artists.findIndex(a => a.ID === artistId);
        if (artistIndex === -1) {
            return res.status(404).json({ message: 'Artist not found.' });
        }

        artists[artistIndex] = { ...artists[artistIndex], ...req.body, ID: artistId };

        const updatedRows = [headers, ...artists.map(artist => headers.map(header => artist[header]))];
        await writeSheet('Artists', updatedRows);
        res.json(artists[artistIndex]);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.delete('/api/artists/:id', async (req, res) => {
    try {
        const artistId = req.params.id;
        let artists = await readSheet('Artists');
        const headers = ['ID', 'Name', 'NIM', 'Role', 'Contact'];

        const initialLength = artists.length;
        artists = artists.filter(a => a.ID !== artistId);

        if (artists.length === initialLength) {
            return res.status(404).json({ message: 'Artist not found.' });
        }

        const updatedRows = [headers, ...artists.map(artist => headers.map(header => artist[header]))];
        await writeSheet('Artists', updatedRows);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// --- Invoices API ---
// Note: Invoices and InvoiceItems CRUD will be more complex due to their relationship.
// This is a basic implementation.
app.get('/api/invoices', async (req, res) => {
    try {
        const invoices = await readSheet('Invoices');
        res.json(invoices);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/invoices', async (req, res) => {
    try {
        const newInvoice = {
            ID: uuidv4(),
            InvoiceType: req.body.InvoiceType || '',
            Date: req.body.Date || new Date().toISOString().split('T')[0], // YYYY-MM-DD
            ClientID: req.body.ClientID || '',
            ArtistID: req.body.ArtistID || '',
            Subtotal: req.body.Subtotal || 0,
            DownPaymentAmount: req.body.DownPaymentAmount || 0,
            TotalDue: req.body.TotalDue || 0,
            Status: req.body.Status || 'Draft',
            Notes: req.body.Notes || '',
        };
        await appendSheetRow('Invoices', Object.values(newInvoice));

        // If there are items, append them to InvoiceItems sheet
        if (req.body.items && Array.isArray(req.body.items)) {
            const invoiceItemsData = req.body.items.map(item => ({
                ID: uuidv4(),
                InvoiceID: newInvoice.ID, // Link to the new invoice
                Description: item.Description || '',
                Quantity: item.Quantity || 0,
                UnitPrice: item.UnitPrice || 0,
                LineTotal: item.LineTotal || 0,
            }));
            const itemHeaders = ['ID', 'InvoiceID', 'Description', 'Quantity', 'UnitPrice', 'LineTotal'];
            const itemRows = invoiceItemsData.map(item => itemHeaders.map(header => item[header]));
            // We need to append multiple rows. appendSheetRow only does one.
            // For multiple, we'd need to use batchUpdate or multiple appends.
            // For simplicity in this example, we will just loop and append for now.
            // A more robust solution would use sheets.spreadsheets.values.batchUpdate or a single larger append.
            for (const itemRow of itemRows) {
                await appendSheetRow('InvoiceItems', itemRow);
            }
        }

        res.status(201).json(newInvoice);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


// GET Invoices with their items (more complex)
app.get('/api/invoices/:id', async (req, res) => {
    try {
        const invoiceId = req.params.id;
        const invoices = await readSheet('Invoices');
        const invoice = invoices.find(inv => inv.ID === invoiceId);

        if (!invoice) {
            return res.status(404).json({ message: 'Invoice not found.' });
        }

        const invoiceItems = await readSheet('InvoiceItems');
        const itemsForInvoice = invoiceItems.filter(item => item.InvoiceID === invoiceId);

        res.json({ ...invoice, items: itemsForInvoice });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


// UPDATE Invoice (complex, will only update main invoice details, not items for simplicity)
// Updating items requires more sophisticated logic (delete all for invoice, then re-add, or find/update)
app.put('/api/invoices/:id', async (req, res) => {
    try {
        const invoiceId = req.params.id;
        let invoices = await readSheet('Invoices');
        const headers = ['ID', 'InvoiceType', 'Date', 'ClientID', 'ArtistID', 'Subtotal', 'DownPaymentAmount', 'TotalDue', 'Status', 'Notes'];

        const invoiceIndex = invoices.findIndex(inv => inv.ID === invoiceId);
        if (invoiceIndex === -1) {
            return res.status(404).json({ message: 'Invoice not found.' });
        }

        invoices[invoiceIndex] = { ...invoices[invoiceIndex], ...req.body, ID: invoiceId };

        const updatedRows = [headers, ...invoices.map(inv => headers.map(header => inv[header]))];
        await writeSheet('Invoices', updatedRows);

        // --- Handling InvoiceItems Update ---
        // This is a simplified approach: delete all existing items for this invoice and re-add.
        // A more robust solution would involve comparing existing items with new items to do partial updates.
        if (req.body.items && Array.isArray(req.body.items)) {
            let existingItems = await readSheet('InvoiceItems');
            const itemHeaders = ['ID', 'InvoiceID', 'Description', 'Quantity', 'UnitPrice', 'LineTotal'];

            // Filter out existing items for this invoice
            const itemsToKeep = existingItems.filter(item => item.InvoiceID !== invoiceId);

            // Add new/updated items
            const newItemsForInvoice = req.body.items.map(item => ({
                ID: item.ID && item.ID !== '' ? item.ID : uuidv4(), // Keep existing ID if present, else generate new
                InvoiceID: invoiceId,
                Description: item.Description || '',
                Quantity: item.Quantity || 0,
                UnitPrice: item.UnitPrice || 0,
                LineTotal: item.LineTotal || 0,
            }));

            const allItems = [...itemsToKeep, ...newItemsForInvoice];
            const updatedItemRows = [itemHeaders, ...allItems.map(item => itemHeaders.map(header => item[header]))];
            await writeSheet('InvoiceItems', updatedItemRows); // Overwrite the InvoiceItems sheet
        }


        res.json(invoices[invoiceIndex]);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// DELETE Invoice (complex, also deletes related invoice items)
app.delete('/api/invoices/:id', async (req, res) => {
    try {
        const invoiceId = req.params.id;
        let invoices = await readSheet('Invoices');
        const invoiceHeaders = ['ID', 'InvoiceType', 'Date', 'ClientID', 'ArtistID', 'Subtotal', 'DownPaymentAmount', 'TotalDue', 'Status', 'Notes'];

        const initialInvoiceLength = invoices.length;
        invoices = invoices.filter(inv => inv.ID !== invoiceId);

        if (invoices.length === initialInvoiceLength) {
            return res.status(404).json({ message: 'Invoice not found.' });
        }

        const updatedInvoiceRows = [invoiceHeaders, ...invoices.map(inv => invoiceHeaders.map(header => inv[header]))];
        await writeSheet('Invoices', updatedInvoiceRows);

        // Delete associated invoice items
        let invoiceItems = await readSheet('InvoiceItems');
        const itemHeaders = ['ID', 'InvoiceID', 'Description', 'Quantity', 'UnitPrice', 'LineTotal'];
        invoiceItems = invoiceItems.filter(item => item.InvoiceID !== invoiceId);

        const updatedItemRows = [itemHeaders, ...invoiceItems.map(item => itemHeaders.map(header => item[header]))];
        await writeSheet('InvoiceItems', updatedItemRows); // Overwrite InvoiceItems sheet

        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
    console.log(`Access at http://localhost:${PORT}`);
});