// src/stores/itemCatalog.js
import { defineStore } from 'pinia';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001';
const PRODUCTS_URL = `${API_BASE}/api/products`; // use products as catalog source

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
        // Derive catalog from products endpoint (backend ready)
        const response = await axios.get(PRODUCTS_URL);
        const products = response.data || [];
        this.catalogItems = products.map(p => ({
          Description: p.Name,
          UnitPrice: parseFloat(p.UnitPrice || 0),
          Category: p.Category || p.Type || '',
        }));
      } catch (err) {
        this.error = err.message || 'Failed to fetch item catalog.';
        console.error(err);
      } finally {
        this.loading = false;
      }
    },
  },
});
