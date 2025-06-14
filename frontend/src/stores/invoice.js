import { defineStore } from 'pinia'
import axios from 'axios'

const API_URL = 'http://localhost:3000/api/invoices';

export const useInvoiceStore = defineStore('invoice', {
  state: () => ({
    invoices: [],
    loading: false,
    error: null,
  }),
  actions: {
    /**
     * Fetches all invoices from the API.
     */
    async fetchInvoices() {
      this.loading = true;
      this.error = null;
      try {
        console.log('🔄 Fetching all invoices from:', API_URL);
        const response = await axios.get(API_URL);
        console.log('✅ Successfully fetched invoices:', response.data);
        this.invoices = response.data;
      } catch (err) {
        console.error('❌ Error fetching invoices:', err);
        console.error('❌ Error details:', {
          message: err.message,
          status: err.response?.status,
          statusText: err.response?.statusText,
          data: err.response?.data
        });
        this.error = err.message || 'Failed to fetch invoices.';
      } finally {
        this.loading = false;
      }
    },
    
    /**
     * Fetches a single invoice by its ID.
     * @param {string} id - The ID of the invoice to fetch.
     * @returns {Promise<Object>} The fetched invoice data.
     */
    async fetchInvoiceById(id) {
      this.loading = true;
      this.error = null;
      try {
        // Ensure the ID is properly encoded for the URL.
        // Axios typically handles basic URI encoding for path segments,
        // but for safety, especially if IDs might contain special characters,
        // encodeURIComponent can be used explicitly.
        const encodedId = encodeURIComponent(id);
        const url = `${API_URL}/${encodedId}`;
        console.log('🔄 Fetching invoice by ID from:', url);
        console.log('🔄 Invoice ID:', id, 'Type:', typeof id);
        
        const response = await axios.get(url);
        
        console.log('✅ Raw response status:', response.status);
        console.log('✅ Raw response headers:', response.headers);
        console.log('✅ Raw response data type:', typeof response.data);
        console.log('✅ Raw response data:', response.data);
        
        // Check if response.data is actually a string (HTML) indicating a server error
        if (typeof response.data === 'string' && !response.headers['content-type']?.includes('application/json')) {
          console.error('❌ Received string instead of object:', response.data.substring(0, 200) + '...');
          throw new Error('API returned HTML instead of JSON. Check if your backend server is running on port 3000.');
        }
        
        return response.data;
      } catch (err) {
        console.error('❌ Error fetching invoice by ID:', err);
        
        if (err.code === 'ECONNREFUSED') {
          console.error('❌ Connection refused - is your backend server running on port 3000?');
          this.error = 'Cannot connect to server. Make sure your backend is running on port 3000.';
        } else if (err.response) {
          console.error('❌ Server responded with error:', {
            status: err.response.status,
            statusText: err.response.statusText,
            data: err.response.data
          });
          // Specific check for 404 Not Found error
          if (err.response.status === 404) {
            this.error = `Invoice with ID '${id}' not found. Please check the ID.`;
          } else {
            this.error = `Server error: ${err.response.status} ${err.response.statusText}`;
          }
        } else if (err.request) {
          console.error('❌ No response received:', err.request);
          this.error = 'No response from server. Check if your backend is running.';
        } else {
          console.error('❌ Request setup error:', err.message);
          this.error = err.message || `Failed to fetch invoice ${id}.`;
        }
        
        throw err; // Re-throw to allow component to handle specific errors if needed
      } finally {
        this.loading = false;
      }
    },
    
    /**
     * Adds a new invoice to the API.
     * @param {Object} invoiceData - The data for the new invoice.
     * @returns {Promise<Object>} The newly created invoice data from the API.
     */
    async addInvoice(invoiceData) {
      this.loading = true;
      this.error = null;
      try {
        console.log('🔄 Adding invoice to:', API_URL);
        console.log('🔄 Invoice data:', invoiceData);
        
        // Ensure all currency and quantity values are numbers before sending
        const dataToSend = { ...invoiceData };
        dataToSend.Subtotal = parseFloat(dataToSend.Subtotal);
        dataToSend.DownPaymentAmount = parseFloat(dataToSend.DownPaymentAmount);
        dataToSend.TotalDue = parseFloat(dataToSend.TotalDue);
        if (dataToSend.items) {
          dataToSend.items = dataToSend.items.map(item => ({
            ...item,
            Quantity: parseFloat(item.Quantity),
            UnitPrice: parseFloat(item.UnitPrice),
            LineTotal: parseFloat(item.LineTotal)
          }));
        }

        const response = await axios.post(API_URL, dataToSend);
        console.log('✅ Successfully added invoice:', response.data);
        this.invoices.push(response.data); // Add the new invoice to the state
        return response.data;
      } catch (err) {
        console.error('❌ Error adding invoice:', err);
        this.error = err.message || 'Failed to add invoice.';
        throw err;
      } finally {
        this.loading = false;
      }
    },
    
    /**
     * Updates an existing invoice in the API.
     * @param {string} id - The ID of the invoice to update.
     * @param {Object} invoiceData - The updated data for the invoice.
     * @returns {Promise<Object>} The updated invoice data from the API.
     */
    async updateInvoice(id, invoiceData) {
      this.loading = true;
      this.error = null;
      try {
        const encodedId = encodeURIComponent(id);
        const url = `${API_URL}/${encodedId}`;
        console.log('🔄 Updating invoice at:', url);
        console.log('🔄 Invoice data:', invoiceData);
        
        // Ensure all currency and quantity values are numbers before sending
        const dataToSend = { ...invoiceData };
        dataToSend.Subtotal = parseFloat(dataToSend.Subtotal);
        dataToSend.DownPaymentAmount = parseFloat(dataToSend.DownPaymentAmount);
        dataToSend.TotalDue = parseFloat(dataToSend.TotalDue);
        if (dataToSend.items) {
          dataToSend.items = dataToSend.items.map(item => ({
            ...item,
            Quantity: parseFloat(item.Quantity),
            UnitPrice: parseFloat(item.UnitPrice),
            LineTotal: parseFloat(item.LineTotal)
          }));
        }

        const response = await axios.put(url, dataToSend);
        console.log('✅ Successfully updated invoice:', response.data);
        
        // Update the invoice in the store's state
        const index = this.invoices.findIndex(inv => inv.ID === id);
        if (index !== -1) {
          this.invoices[index] = response.data;
        }
        return response.data;
      } catch (err) {
        console.error('❌ Error updating invoice:', err);
        this.error = err.message || 'Failed to update invoice.';
        throw err;
      } finally {
        this.loading = false;
      }
    },
    
    /**
     * Deletes an invoice from the API.
     * @param {string} id - The ID of the invoice to delete.
     */
    async deleteInvoice(id) {
      this.loading = true;
      this.error = null;
      try {
        const encodedId = encodeURIComponent(id);
        const url = `${API_URL}/${encodedId}`;
        console.log('🔄 Deleting invoice at:', url);
        
        await axios.delete(url);
        console.log('✅ Successfully deleted invoice:', id);
        
        // Remove the deleted invoice from the store's state
        this.invoices = this.invoices.filter(inv => inv.ID !== id);
      } catch (err) {
        console.error('❌ Error deleting invoice:', err);
        this.error = err.message || 'Failed to delete invoice.';
        throw err;
      } finally {
        this.loading = false;
      }
    },
  },
});