// src/stores/staff.js
import { defineStore } from 'pinia'
import axios from 'axios'

const API_URL = 'http://localhost:3000/api/staff';

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
        const response = await axios.get(API_URL);
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
        const response = await axios.post(API_URL, staffData);
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
        const response = await axios.put(`${API_URL}/${id}`, staffData);
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
        await axios.delete(`${API_URL}/${id}`);
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