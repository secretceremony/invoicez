import { defineStore } from 'pinia'
import axios from 'axios'

const API_URL = 'http://localhost:3000/api/clients';

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
        const response = await axios.get(API_URL);
        this.clients = response.data;
      } catch (err) {
        this.error = err.message || 'Failed to fetch clients.';
        console.error(err);
      } finally {
        this.loading = false;
      }
    },
    async addClient(clientData) {
      this.loading = true;
      this.error = null;
      try {
        const response = await axios.post(API_URL, clientData);
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
        const response = await axios.put(`<span class="math-inline">\{API\_URL\}/</span>{id}`, clientData);
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
        await axios.delete(`<span class="math-inline">\{API\_URL\}/</span>{id}`);
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