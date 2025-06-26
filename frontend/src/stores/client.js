// frontend/src/stores/client.js
import { defineStore } from 'pinia';
import axios from 'axios';

// IMPORTANT: Replace with your actual Google Apps Script Web App URL
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxYCYA5IIy2gQphU_oiAoGR1DOU6J99gEPBD3xpPXaUI5AgBY6Kd6LVQVD4TRgL11x7xQ/exec';

export const useClientStore = defineStore('client', {
  state: () => ({
    clients: [],
    loading: false,
    error: null,
  }),
  actions: {
    async fetchClients() {
      this.loading = true;
      this.error = null;
      try {
        // GET requests are sent with URL parameters
        const response = await axios.get(`${WEB_APP_URL}?path=clients`);
        this.clients = response.data;
      } catch (err) {
        this.error = err.message || 'Failed to fetch clients.';
        console.error('Error fetching clients:', err);
      } finally {
        this.loading = false;
      }
    },
    async addClient(clientData) {
      this.loading = true;
      this.error = null;
      try {
        // All mutations (POST, PUT, DELETE) are sent as POST requests
        const response = await axios.post(WEB_APP_URL, {
          path: 'clients',
          method: 'POST',
          body: clientData,
        });
        this.clients.push(response.data);
        return response.data;
      } catch (err) {
        this.error = err.message || 'Failed to add client.';
        console.error(err);
        throw err;
      } finally {
        this.loading = false;
      }
    },
    async updateClient(id, clientData) {
      this.loading = true;
      this.error = null;
      try {
        const response = await axios.post(WEB_APP_URL, {
          path: 'clients',
          method: 'PUT',
          id: id,
          body: clientData,
        });
        const index = this.clients.findIndex(c => c.ID === id);
        if (index !== -1) {
          this.clients[index] = response.data;
        }
        return response.data;
      } catch (err) {
        this.error = err.message || 'Failed to update client.';
        console.error(err);
        throw err;
      } finally {
        this.loading = false;
      }
    },
    async deleteClient(id) {
      this.loading = true;
      this.error = null;
      try {
        await axios.post(WEB_APP_URL, {
          path: 'clients',
          method: 'DELETE',
          id: id,
        });
        this.clients = this.clients.filter(c => c.ID !== id);
      } catch (err) {
        this.error = err.message || 'Failed to delete client.';
        console.error(err);
        throw err;
      } finally {
        this.loading = false;
      }
    },
  },
});
