<script setup>
import { ref, onMounted, computed } from 'vue';
import { useArtistStore } from '@/stores/artist';
import { VDataTable } from 'vuetify/components';

const artistStore = useArtistStore();

const artistFormData = ref({
  ID: '',
  Name: '',
  NIM: '',
  Role: '',
  Contact: '',
});

const isEditing = ref(false);
const artistDialog = ref(false);

onMounted(() => {
  artistStore.fetchArtists();
});

const headers = ref([
  { title: 'ID', key: 'ID' },
  { title: 'Name', key: 'Name' },
  { title: 'NIM', key: 'NIM' },
  { title: 'Role', key: 'Role' },
  { title: 'Contact', key: 'Contact' },
  { title: 'Actions', key: 'actions', sortable: false },
]);

async function addOrUpdateArtist() {
  try {
    if (isEditing.value) {
      await artistStore.updateArtist(artistFormData.value.ID, artistFormData.value);
    } else {
      await artistStore.addArtist(artistFormData.value);
    }
    artistDialog.value = false;
    resetForm();
  } catch (error) {
    console.error("Error saving artist in component:", error);
  }
}

function editItem(item) {
  artistFormData.value = { ...item };
  isEditing.value = true;
  artistDialog.value = true;
}

async function deleteItem(id) {
  if (confirm('Are you sure you want to delete this artist?')) {
    try {
      await artistStore.deleteArtist(id);
    } catch (error) {
      console.error("Error deleting artist in component:", error);
    }
  }
}

function openAddDialog() {
  resetForm();
  isEditing.value = false;
  artistDialog.value = true;
}

function resetForm() {
  artistFormData.value = { ID: '', Name: '', NIM: '', Role: '', Contact: '' };
}

const itemsForTable = computed(() => artistStore.artists);
</script>

<template>
  <v-container>
    <v-card>
      <v-card-title>
        Artist Management
        <v-spacer></v-spacer>
        <v-btn color="primary" @click="openAddDialog">Add New Artist</v-btn>
      </v-card-title>
      <v-card-text>
        <v-alert v-if="artistStore.error" type="error" dismissible class="mb-4">
          {{ artistStore.error }}
        </v-alert>
        <v-progress-linear
          v-if="artistStore.loading"
          indeterminate
          color="primary"
        ></v-progress-linear>

        <v-data-table
          :headers="headers"
          :items="itemsForTable"
          item-key="ID"
          class="elevation-1"
        >
          <template v-slot:item.actions="{ item }">
            <v-icon small class="mr-2" @click="editItem(item)">
              mdi-pencil
            </v-icon>
            <v-icon small @click="deleteItem(item.ID)">
              mdi-delete
            </v-icon>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

    <v-dialog v-model="artistDialog" max-width="500px">
      <v-card>
        <v-card-title class="text-h5">
          {{ isEditing ? 'Edit Artist' : 'Add New Artist' }}
        </v-card-title>
        <v-card-text>
          <v-container>
            <v-text-field
              v-model="artistFormData.Name"
              label="Name"
            ></v-text-field>
            <v-text-field
              v-model="artistFormData.NIM"
              label="NIM"
            ></v-text-field>
            <v-text-field
              v-model="artistFormData.Role"
              label="Role"
            ></v-text-field>
            <v-text-field
              v-model="artistFormData.Contact"
              label="Contact"
            ></v-text-field>
          </v-container>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="blue darken-1" text @click="artistDialog = false">Cancel</v-btn>
          <v-btn color="blue darken-1" text @click="addOrUpdateArtist">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>