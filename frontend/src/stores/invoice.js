// frontend/src/stores/invoice.js
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
        const response = await axios.get(API_URL);
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
        const url = `${API_URL}/${encodeURIComponent(id)}`;
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
        const response = await axios.post(API_URL, invoiceData);
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
        const url = `${API_URL}/${encodeURIComponent(id)}`;
        const response = await axios.put(url, invoiceData);

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
        const url = `${API_URL}/${encodeURIComponent(id)}`;
        await axios.delete(url);
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