// frontend/src/stores/productService.js
import { defineStore } from 'pinia';
import axios from 'axios';

// IMPORTANT: Replace with your actual Google Apps Script Web App URL
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxYCYA5IIy2gQphU_oiAoGR1DOU6J99gEPBD3xpPXaUI5AgBY6Kd6LVQVD4TRgL11x7xQ/exec';

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
        const response = await axios.get(`${WEB_APP_URL}?path=products-services`);
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
        const response = await axios.post(WEB_APP_URL, {
          path: 'products-services',
          method: 'POST',
          body: productData,
        });
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
        const response = await axios.post(WEB_APP_URL, {
          path: 'products-services',
          method: 'PUT',
          id: id,
          body: productData,
        });
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
        await axios.post(WEB_APP_URL, {
          path: 'products-services',
          method: 'DELETE',
          id: id,
        });
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
