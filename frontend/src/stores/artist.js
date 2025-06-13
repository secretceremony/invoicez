import { defineStore } from 'pinia'
import axios from 'axios'

const API_URL = 'http://localhost:3000/api/artists';

export const useArtistStore = defineStore('artist', {
  state: () => ({
    artists: [],
    loading: false,
    error: null,
  }),
  actions: {
    async fetchArtists() {
      this.loading = true;
      this.error = null;
      try {
        const response = await axios.get(API_URL);
        this.artists = response.data;
      } catch (err) {
        this.error = err.message || 'Failed to fetch artists.';
        console.error(err);
      } finally {
        this.loading = false;
      }
    },
    async addArtist(artistData) {
      this.loading = true;
      this.error = null;
      try {
        const response = await axios.post(API_URL, artistData);
        this.artists.push(response.data);
        return response.data;
      } catch (err) {
        this.error = err.message || 'Failed to add artist.';
        console.error(err);
        throw err;
      } finally {
        this.loading = false;
      }
    },
    async updateArtist(id, artistData) {
      this.loading = true;
      this.error = null;
      try {
        const response = await axios.put(`<span class="math-inline">\{API\_URL\}/</span>{id}`, artistData);
        const index = this.artists.findIndex(a => a.ID === id);
        if (index !== -1) {
          this.artists[index] = response.data;
        }
        return response.data;
      } catch (err) {
        this.error = err.message || 'Failed to update artist.';
        console.error(err);
        throw err;
      } finally {
        this.loading = false;
      }
    },
    async deleteArtist(id) {
      this.loading = true;
      this.error = null;
      try {
        await axios.delete(`<span class="math-inline">\{API\_URL\}/</span>{id}`);
        this.artists = this.artists.filter(a => a.ID !== id);
      } catch (err) {
        this.error = err.message || 'Failed to delete artist.';
        console.error(err);
        throw err;
      } finally {
        this.loading = false;
      }
    },
  },
});