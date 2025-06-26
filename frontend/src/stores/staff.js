// frontend/src/stores/staff.js
import { defineStore } from 'pinia';
import axios from 'axios';

// IMPORTANT: Replace with your actual Google Apps Script Web App URL
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxYCYA5IIy2gQphU_oiAoGR1DOU6J99gEPBD3xpPXaUI5AgBY6Kd6LVQVD4TRgL11x7xQ/exec';

export const useStaffStore = defineStore('staff', {
  state: () => ({
    staff: [],
    loading: false,
    error: null,
  }),
  actions: {
    async fetchStaff() {
      this.loading = true;
      this.error = null;
      try {
        const response = await axios.get(`${WEB_APP_URL}?path=staff`);
        this.staff = response.data;
      } catch (err) {
        this.error = err.message || 'Failed to fetch staff.';
        console.error(err);
      } finally {
        this.loading = false;
      }
    },
    async addStaff(staffData) {
      this.loading = true;
      this.error = null;
      try {
        const response = await axios.post(WEB_APP_URL, {
          path: 'staff',
          method: 'POST',
          body: staffData,
        });
        this.staff.push(response.data);
        return response.data;
      } catch (err) {
        this.error = err.message || 'Failed to add staff member.';
        console.error(err);
        throw err;
      } finally {
        this.loading = false;
      }
    },
    async updateStaff(id, staffData) {
      this.loading = true;
      this.error = null;
      try {
        const response = await axios.post(WEB_APP_URL, {
          path: 'staff',
          method: 'PUT',
          id: id,
          body: staffData,
        });
        const index = this.staff.findIndex(s => s.ID === id);
        if (index !== -1) {
          this.staff[index] = response.data;
        }
        return response.data;
      } catch (err) {
        this.error = err.message || 'Failed to update staff member.';
        console.error(err);
        throw err;
      } finally {
        this.loading = false;
      }
    },
    async deleteStaff(id) {
      this.loading = true;
      this.error = null;
      try {
        await axios.post(WEB_APP_URL, {
          path: 'staff',
          method: 'DELETE',
          id: id,
        });
        this.staff = this.staff.filter(s => s.ID !== id);
      } catch (err) {
        this.error = err.message || 'Failed to delete staff member.';
        console.error(err);
        throw err;
      } finally {
        this.loading = false;
      }
    },
  },
});
