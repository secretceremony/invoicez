// frontend/src/stores/invoice.js
import { defineStore } from 'pinia';
import axios from 'axios';

// IMPORTANT: Replace with your actual Google Apps Script Web App URL
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxYCYA5IIy2gQphU_oiAoGR1DOU6J99gEPBD3xpPXaUI5AgBY6Kd6LVQVD4TRgL11x7xQ/exec';

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
        const response = await axios.get(`${WEB_APP_URL}?path=invoices`);
        this.invoices = response.data;
      } catch (err) {
        this.error = err.message || 'Failed to fetch invoices.';
        console.error('Error fetching invoices:', err);
      } finally {
        this.loading = false;
      }
    },

    async fetchInvoiceById(id) {
      this.loading = true;
      this.error = null;
      try {
        const url = `${WEB_APP_URL}?path=invoices&id=${encodeURIComponent(id)}`;
        const response = await axios.get(url);
        return response.data;
      } catch (err) {
        this.error = `Failed to fetch invoice ${id}. ${err.message}`;
        console.error('Error fetching invoice by ID:', err);
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async addInvoice(invoiceData) {
      this.loading = true;
      this.error = null;
      try {
        const response = await axios.post(WEB_APP_URL, {
          path: 'invoices',
          method: 'POST',
          body: invoiceData,
        });
        this.invoices.push(response.data);
        return response.data;
      } catch (err) {
        this.error = err.message || 'Failed to add invoice.';
        console.error('Error adding invoice:', err);
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async updateInvoice(id, invoiceData) {
      this.loading = true;
      this.error = null;
      try {
        const response = await axios.post(WEB_APP_URL, {
          path: 'invoices',
          method: 'PUT',
          id: id,
          body: invoiceData,
        });

        const index = this.invoices.findIndex(inv => inv.ID === id);
        if (index !== -1) {
          this.invoices[index] = response.data;
        }
        return response.data;
      } catch (err) {
        this.error = err.message || 'Failed to update invoice.';
        console.error('Error updating invoice:', err);
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async deleteInvoice(id) {
      this.loading = true;
      this.error = null;
      try {
        await axios.post(WEB_APP_URL, {
          path: 'invoices',
          method: 'DELETE',
          id: id,
        });
        this.invoices = this.invoices.filter(inv => inv.ID !== id);
      } catch (err) {
        this.error = err.message || 'Failed to delete invoice.';
        console.error('Error deleting invoice:', err);
        throw err;
      } finally {
        this.loading = false;
      }
    },
  },
});
