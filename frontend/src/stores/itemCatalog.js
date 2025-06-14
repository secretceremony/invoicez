// src/stores/itemCatalog.js
import { defineStore } from 'pinia';
import axios from 'axios';

// We will fetch all invoice items and derive the catalog from them
const API_URL = 'http://localhost:3000/api/invoices'; // To fetch all invoices and their items

export const useItemCatalogStore = defineStore('itemCatalog', {
  state: () => ({
    catalogItems: [], // This will store unique items: { Description, UnitPrice, Category }
    loading: false,
    error: null,
  }),
  actions: {
    async fetchCatalogItems() {
      this.loading = true;
      this.error = null;
      try {
        // Fetch all invoices to get all associated invoice items
        const response = await axios.get(API_URL);
        const allInvoices = response.data;

        let allInvoiceItems = [];
        // Since get /api/invoices only returns main invoice data, not nested items,
        // we need to get /api/invoices/:id for each to collect all items.
        // This is inefficient. A better backend endpoint for 'all items' would be ideal.
        // For now, let's just get all invoices and hope the backend's /api/invoices/:id
        // route correctly aggregates items.
        // If you need a true master list, you'd need an endpoint that specifically reads
        // ALL entries from the InvoiceItems sheet.

        // Re-reading ALL invoice items directly from the sheet via the backend for simplicity:
        // We'll simulate a separate backend endpoint for 'all invoice items' by directly calling it if available.
        // Since we don't have a direct backend endpoint for ALL invoice items,
        // we'll simulate fetching all invoice items from the backend using the /api/invoices endpoint
        // that fetches individual invoices (which include their items). This is inefficient
        // but works given current backend structure.
        // A more efficient backend would have a dedicated '/api/invoice-items' endpoint.

        // TEMPORARY: Assume backend has an endpoint to get all invoice items for simplicity.
        // If your backend does not have this, you will need to add it:
        // app.get('/api/all-invoice-items', async (req, res) => {
        //     try {
        //         const items = await readSheet('InvoiceItems');
        //         res.json(items);
        //     } catch (error) {
        //         res.status(500).json({ message: error.message || 'Failed to fetch all invoice items.' });
        //     }
        // });
        // Then uncomment the axios.get below.
        // For now, I'll put a dummy call to `readSheet('InvoiceItems')` assuming you add the backend endpoint.

        const allItemsResponse = await axios.get('http://localhost:3000/api/all-invoice-items'); // THIS ENDPOINT NEEDS TO BE ADDED IN BACKEND
        allInvoiceItems = allItemsResponse.data;

        // Deduplicate items based on Description and Category, taking the last UnitPrice encountered
        const uniqueItemsMap = new Map(); // Key: `${Description}-${Category}`
        allInvoiceItems.forEach(item => {
          const key = `${item.Description}-${item.Category}`;
          // Ensure UnitPrice is parsed to a number
          item.UnitPrice = parseFloat(item.UnitPrice || 0);
          uniqueItemsMap.set(key, {
            Description: item.Description,
            UnitPrice: item.UnitPrice,
            Category: item.Category,
            // Include other relevant fields if needed, e.g., Notes from the item
          });
        });

        this.catalogItems = Array.from(uniqueItemsMap.values());

      } catch (err) {
        this.error = err.message || 'Failed to fetch item catalog.';
        console.error(err);
        // If the /api/all-invoice-items endpoint doesn't exist, this error will fire.
        // Add the endpoint in your backend server.js file.
      } finally {
        this.loading = false;
      }
    },
  },
});