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
    
    async fetchInvoiceById(id) {
      this.loading = true;
      this.error = null;
      try {
        const url = `${API_URL}/${id}`;
        console.log('🔄 Fetching invoice by ID from:', url);
        console.log('🔄 Invoice ID:', id, 'Type:', typeof id);
        
        const response = await axios.get(url);
        
        console.log('✅ Raw response status:', response.status);
        console.log('✅ Raw response headers:', response.headers);
        console.log('✅ Raw response data type:', typeof response.data);
        console.log('✅ Raw response data:', response.data);
        
        // Check if response.data is actually a string (HTML)
        if (typeof response.data === 'string') {
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
          this.error = `Server error: ${err.response.status} ${err.response.statusText}`;
        } else if (err.request) {
          console.error('❌ No response received:', err.request);
          this.error = 'No response from server. Check if your backend is running.';
        } else {
          console.error('❌ Request setup error:', err.message);
          this.error = err.message || `Failed to fetch invoice ${id}.`;
        }
        
        throw err;
      } finally {
        this.loading = false;
      }
    },
    
    async addInvoice(invoiceData) {
      this.loading = true;
      this.error = null;
      try {
        console.log('🔄 Adding invoice to:', API_URL);
        console.log('🔄 Invoice data:', invoiceData);
        
        // Ensure all currency values are numbers before sending
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
        this.invoices.push(response.data);
        return response.data;
      } catch (err) {
        console.error('❌ Error adding invoice:', err);
        this.error = err.message || 'Failed to add invoice.';
        throw err;
      } finally {
        this.loading = false;
      }
    },
    
    async updateInvoice(id, invoiceData) {
      this.loading = true;
      this.error = null;
      try {
        const url = `${API_URL}/${id}`;
        console.log('🔄 Updating invoice at:', url);
        console.log('🔄 Invoice data:', invoiceData);
        
        // Ensure all currency values are numbers before sending
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
    
    async deleteInvoice(id) {
      this.loading = true;
      this.error = null;
      try {
        const url = `${API_URL}/${id}`;
        console.log('🔄 Deleting invoice at:', url);
        
        await axios.delete(url);
        console.log('✅ Successfully deleted invoice:', id);
        
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