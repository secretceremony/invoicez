// invoice-backend/server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { google } = require('googleapis');
const { v4: uuidv4 } = require('uuid'); // Keep uuidv4 for item IDs
const path = require('path');

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
// Reads all rows, assumes first row is headers, returns array of objects
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

// --- Helper function to write/update data to a sheet (overwrites a specified range) ---
// Used for updates and deletes by re-writing the entire sheet content
async function writeSheet(sheetName, data) {
    try {
        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `${sheetName}!A1`, // Start from A1 to include headers if needed
            valueInputOption: 'RAW',
            resource: {
                values: data // data should be an array of arrays [[header1, header2], [row1val1, row1val2]]
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

// --- NEW: Helper function to generate custom invoice ID (FOLKS/TYPE/MONTH/NUMBER) ---
async function generateInvoiceId(invoiceType, invoiceDate) {
    // Determine type prefix based on InvoiceType
    let typePrefix;
    switch (invoiceType) {
        case 'Art Commission':
            typePrefix = 'COMM';
            break;
        case 'Custom Merch':
            typePrefix = 'CUSTOM';
            break;
        case 'Artist Check':
            typePrefix = 'ART'; // Using ART for Artist Check
            break;
        default:
            typePrefix = 'INV'; // Fallback for unexpected types
    }

    // Extract month and year from invoiceDate (e.g., '2025-06-13' -> '06', '2025')
    const date = new Date(invoiceDate);
    const month = String(date.getMonth() + 1).padStart(2, '0'); // getMonth() is 0-indexed, pad to 2 digits
    const yearShort = String(date.getFullYear()).slice(-2); // Get last two digits of year (e.g., 25)

    const basePrefix = `FOLKS/${typePrefix}/${month}`; // Removed year from basePrefix for shorter ID

    // Read all existing invoices to find the next sequential number for this type/month/year
    const allInvoices = await readSheet('Invoices');

    let maxNumber = 0;
    allInvoices.forEach(invoice => {
        // Parse existing IDs: FOLKS/TYPE/MM/NNN
        // We need to check if the invoice ID starts with the correct type and month prefix.
        // And if the year part matches the current year.
        if (invoice.ID && invoice.ID.startsWith(basePrefix)) {
            const parts = invoice.ID.split('/');
            if (parts.length === 4) { // Expecting 4 parts: FOLKS / TYPE / MONTH / NUMBER
                const numPart = parseInt(parts[3], 10); // The number part
                if (!isNaN(numPart)) {
                    maxNumber = Math.max(maxNumber, numPart);
                }
            }
        }
    });

    const nextNumber = String(maxNumber + 1).padStart(3, '0'); // Format as 001, 002, etc.

    return `${basePrefix}/${nextNumber}`;
}

// --- API Endpoints ---

// CLIENTS
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
        const clientHeaders = ['ID', 'Name', 'Contact'];
        const newClient = {
            ID: uuidv4(),
            Name: req.body.Name || '',
            Contact: req.body.Contact || '',
        };
        await appendSheetRow('Clients', clientHeaders.map(header => newClient[header]));
        res.status(201).json(newClient);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.put('/api/clients/:id', async (req, res) => {
    try {
        const clientId = req.params.id;
        let clients = await readSheet('Clients');
        const headers = ['ID', 'Name', 'Contact'];

        const clientIndex = clients.findIndex(c => c.ID === clientId);
        if (clientIndex === -1) {
            return res.status(404).json({ message: 'Client not found.' });
        }

        clients[clientIndex] = { ...clients[clientIndex], ...req.body, ID: clientId };

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
        const headers = ['ID', 'Name', 'Contact'];

        const initialLength = clients.length;
        clients = clients.filter(c => c.ID !== clientId);

        if (clients.length === initialLength) {
            return res.status(404).json({ message: 'Client not found.' });
        }

        const updatedRows = [headers, ...clients.map(client => headers.map(header => client[header]))];
        await writeSheet('Clients', updatedRows);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ARTISTS
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
        const artistHeaders = ['ID', 'Name', 'NIM', 'Role', 'Contact'];
        const newArtist = {
            ID: uuidv4(),
            Name: req.body.Name || '',
            NIM: req.body.NIM || '',
            Role: req.body.Role || '',
            Contact: req.body.Contact || '',
        };
        await appendSheetRow('Artists', artistHeaders.map(header => newArtist[header]));
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

// PRODUCTS & SERVICES (Master List)
app.get('/api/products-services', async (req, res) => {
    try {
        const productsServices = await readSheet('ProductsAndServices');
        // Ensure UnitPrice is parsed to number for cleaner frontend use,
        // even though it's stored as string in GS.
        const processedProducts = productsServices.map(p => ({
            ...p,
            UnitPrice: parseFloat(p.UnitPrice || 0)
        }));
        res.json(processedProducts);
    } catch (error) {
        res.status(500).json({ message: error.message || 'Failed to fetch products/services.' });
    }
});

app.post('/api/products-services', async (req, res) => {
    try {
        const productHeaders = ['ID', 'Name', 'Description', 'UnitPrice', 'Category'];
        const newProduct = {
            ID: uuidv4(),
            Name: req.body.Name || '',
            Description: req.body.Description || '',
            UnitPrice: String(req.body.UnitPrice || 0), // Store as string in GS
            Category: req.body.Category || '',
        };
        await appendSheetRow('ProductsAndServices', productHeaders.map(header => newProduct[header]));
        res.status(201).json(newProduct);
    } catch (error) {
        res.status(500).json({ message: error.message || 'Failed to add product/service.' });
    }
});

app.put('/api/products-services/:id', async (req, res) => {
    try {
        const productId = req.params.id;
        let productsServices = await readSheet('ProductsAndServices');
        const headers = ['ID', 'Name', 'Description', 'UnitPrice', 'Category'];

        const productIndex = productsServices.findIndex(p => p.ID === productId);
        if (productIndex === -1) {
            return res.status(404).json({ message: 'Product/Service not found.' });
        }

        const updatedProduct = { ...productsServices[productIndex], ...req.body, ID: productId };
        updatedProduct.UnitPrice = String(updatedProduct.UnitPrice || 0); // Store as string in GS

        productsServices[productIndex] = updatedProduct;

        const updatedRows = [headers, ...productsServices.map(p => headers.map(header => p[header]))];
        await writeSheet('ProductsAndServices', updatedRows);
        res.json(updatedProduct);
    } catch (error) {
        res.status(500).json({ message: error.message || 'Failed to update product/service.' });
    }
});

app.delete('/api/products-services/:id', async (req, res) => {
    try {
        const productId = req.params.id;
        let productsServices = await readSheet('ProductsAndServices');
        const headers = ['ID', 'Name', 'Description', 'UnitPrice', 'Category'];

        const initialLength = productsServices.length;
        productsServices = productsServices.filter(p => p.ID !== productId);

        if (productsServices.length === initialLength) {
            return res.status(404).json({ message: 'Product/Service not found.' });
        }

        const updatedRows = [headers, ...productsServices.map(p => headers.map(header => p[header]))];
        await writeSheet('ProductsAndServices', updatedRows);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: error.message || 'Failed to delete product/service.' });
    }
});

app.get('/api/invoices', async (req, res) => {
    try {
        const invoices = await readSheet('Invoices');
        res.json(invoices);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.get('/api/invoices/:id', async (req, res) => {
    try {
        const invoiceId = decodeURIComponent(req.params.id);
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


app.post('/api/invoices', async (req, res) => {
    try {
        // --- THIS IS THE CRITICAL LINE FOR CUSTOM ID GENERATION ---
        // Ensure InvoiceType and Date are passed correctly from frontend
        const invoiceDate = req.body.Date || new Date().toISOString().split('T')[0];
        const newInvoiceId = await generateInvoiceId(req.body.InvoiceType, invoiceDate);
        // --- END CUSTOM ID GENERATION ---

        const invoiceHeaders = ['ID', 'InvoiceType', 'Date', 'ClientID', 'ArtistID', 'Subtotal', 'DownPaymentAmount', 'TotalDue', 'Status', 'Notes'];
        const newInvoice = {
            ID: newInvoiceId, // Use the newly generated ID
            InvoiceType: req.body.InvoiceType || '',
            Date: invoiceDate, // Use the resolved date
            ClientID: req.body.ClientID || '',
            ArtistID: req.body.ArtistID || '',
            Subtotal: req.body.Subtotal, // Expecting number from frontend
            DownPaymentAmount: req.body.DownPaymentAmount, // Expecting number from frontend
            TotalDue: req.body.TotalDue, // Expecting number from frontend
            Status: req.body.Status || 'Draft',
            Notes: req.body.Notes || '',
        };

        // Convert numerical values to string before sending to Google Sheets
        const invoiceRowData = invoiceHeaders.map(header => {
            const value = newInvoice[header];
            if (typeof value === 'number') {
                return String(value); // Convert numbers to string
            }
            return value;
        });

        await appendSheetRow('Invoices', invoiceRowData);

        if (req.body.items && Array.isArray(req.body.items) && req.body.items.length > 0) {
            // itemHeaders no longer includes 'Category' as it's part of master product
            const itemHeaders = ['ID', 'InvoiceID', 'Description', 'Quantity', 'UnitPrice', 'LineTotal'];
            const itemRows = req.body.items.map(item => {
                const newItem = {
                    ID: uuidv4(), // Item ID can still be UUID
                    InvoiceID: newInvoice.ID, // Link to the new custom invoice ID
                    Description: item.Description || '',
                    Quantity: item.Quantity,
                    UnitPrice: item.UnitPrice,
                    LineTotal: item.LineTotal,
                };
                return itemHeaders.map(header => {
                    const value = newItem[header];
                    if (typeof value === 'number') {
                        return String(value);
                    }
                    return value;
                });
            });

            await sheets.spreadsheets.values.append({
                spreadsheetId: SPREADSHEET_ID,
                range: 'InvoiceItems!A1',
                valueInputOption: 'RAW',
                insertDataOption: 'INSERT_ROWS',
                resource: {
                    values: itemRows
                },
            });
        }

        res.status(201).json(newInvoice); // Send back the created invoice object
    } catch (error) {
        console.error("Error creating invoice:", error);
        res.status(500).json({ message: error.message || 'Failed to create invoice.' });
    }
});


app.put('/api/invoices/:id', async (req, res) => {
    try {
        const invoiceId = req.params.id; // ID is taken from the URL for updates, not regenerated
        let invoices = await readSheet('Invoices');
        const invoiceHeaders = ['ID', 'InvoiceType', 'Date', 'ClientID', 'ArtistID', 'Subtotal', 'DownPaymentAmount', 'TotalDue', 'Status', 'Notes'];

        const invoiceIndex = invoices.findIndex(inv => inv.ID === invoiceId);
        if (invoiceIndex === -1) {
            return res.status(404).json({ message: 'Invoice not found.' });
        }

        const updatedInvoice = { ...invoices[invoiceIndex], ...req.body, ID: invoiceId };
        const updatedInvoiceRowData = invoiceHeaders.map(header => {
            const value = updatedInvoice[header];
            if (typeof value === 'number') {
                return String(value);
            }
            return value;
        });

        invoices[invoiceIndex] = updatedInvoice; // Update in-memory for re-write
        const allInvoiceRows = [invoiceHeaders, ...invoices.map(inv => invoiceHeaders.map(header => {
            const value = inv[header];
            return typeof value === 'number' ? String(value) : value; // Convert to string again for final write
        }))];
        await writeSheet('Invoices', allInvoiceRows);


        let existingItems = await readSheet('InvoiceItems');
        const itemHeaders = ['ID', 'InvoiceID', 'Description', 'Quantity', 'UnitPrice', 'LineTotal'];

        const itemsToKeep = existingItems.filter(item => item.InvoiceID !== invoiceId);

        const newItemsForInvoice = req.body.items
            ? req.body.items.map(item => {
                const newItem = {
                    ID: item.ID && item.ID !== '' ? item.ID : uuidv4(),
                    InvoiceID: invoiceId,
                    Description: item.Description || '',
                    Quantity: item.Quantity,
                    UnitPrice: item.UnitPrice,
                    LineTotal: item.LineTotal,
                };
                return itemHeaders.map(header => {
                    const value = newItem[header];
                    if (typeof value === 'number') {
                        return String(value);
                    }
                    return value;
                });
            })
            : [];

        const allItemsRows = [itemHeaders, ...itemsToKeep.map(item => itemHeaders.map(header => item[header])), ...newItemsForInvoice];
        await writeSheet('InvoiceItems', allItemsRows);

        res.json(updatedInvoice);
    } catch (error) {
        console.error("Error updating invoice:", error);
        res.status(500).json({ message: error.message || 'Failed to update invoice.' });
    }
});

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

        let invoiceItems = await readSheet('InvoiceItems');
        const itemHeaders = ['ID', 'InvoiceID', 'Description', 'Quantity', 'UnitPrice', 'LineTotal'];
        invoiceItems = invoiceItems.filter(item => item.InvoiceID !== invoiceId);

        const updatedItemRows = [itemHeaders, ...invoiceItems.map(item => itemHeaders.map(header => item[header]))];
        await writeSheet('InvoiceItems', updatedItemRows);

        res.status(204).send();
    } catch (error) {
        console.error("Error deleting invoice:", error);
        res.status(500).json({ message: error.message || 'Failed to delete invoice.' });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
    console.log(`Access at http://localhost:${PORT}`);
});