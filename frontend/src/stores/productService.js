// src/stores/productService.js
import { defineStore } from 'pinia';
import axios from 'axios';

const API_URL = 'http://localhost:3000/api/products-services'; // New dedicated API endpoint

export const useProductServiceStore = defineStore('productService', {
  state: () => ({
    productsServices: [],
    loading: false,
    error: null,
  }),
  actions: {
    async fetchProductsServices() {
      this.loading = true;
      this.error = null;
      try {
        const response = await axios.get(API_URL);
        this.productsServices = response.data;
      } catch (err) {
        this.error = err.message || 'Failed to fetch products/services.';
        console.error(err);
      } finally {
        this.loading = false;
      }
    },
    async addProductService(productData) {
      this.loading = true;
      this.error = null;
      try {
        const response = await axios.post(API_URL, productData);
        this.productsServices.push(response.data);
        return response.data;
      } catch (err) {
        this.error = err.message || 'Failed to add product/service.';
        console.error(err);
        throw err;
      } finally {
        this.loading = false;
      }
    },
    async updateProductService(id, productData) {
      this.loading = true;
      this.error = null;
      try {
        const response = await axios.put(`${API_URL}/${id}`, productData);
        const index = this.productsServices.findIndex(p => p.ID === id);
        if (index !== -1) {
          this.productsServices[index] = response.data;
        }
        return response.data;
      } catch (err) {
        this.error = err.message || 'Failed to update product/service.';
        console.error(err);
        throw err;
      } finally {
        this.loading = false;
      }
    },
    async deleteProductService(id) {
      this.loading = true;
      this.error = null;
      try {
        await axios.delete(`${API_URL}/${id}`);
        this.productsServices = this.productsServices.filter(p => p.ID !== id);
      } catch (err) {
        this.error = err.message || 'Failed to delete product/service.';
        console.error(err);
        throw err;
      } finally {
        this.loading = false;
      }
    },
  },
});