<script setup>
import { ref, onMounted, computed } from 'vue';
import { useClientStore } from '@/stores/client';
import { VDataTable } from 'vuetify/components';

const clientStore = useClientStore();

const clientFormData = ref({
  ID: '',
  Name: '',
  Contact: '',
});

const isEditing = ref(false);
const clientDialog = ref(false);

onMounted(() => {
  clientStore.fetchClients();
});

const headers = ref([
  { title: 'ID', key: 'ID' },
  { title: 'Name', key: 'Name' },
  { title: 'Contact', key: 'Contact' },
  { title: 'Actions', key: 'actions', sortable: false },
]);

async function addOrUpdateClient() {
  try {
    if (isEditing.value) {
      await clientStore.updateClient(clientFormData.value.ID, clientFormData.value);
    } else {
      await clientStore.addClient(clientFormData.value);
    }
    clientDialog.value = false;
    resetForm();
  } catch (error) {
    console.error("Error saving client in component:", error);
  }
}

function editItem(item) {
  clientFormData.value = { ...item };
  isEditing.value = true;
  clientDialog.value = true;
}

async function deleteItem(id) {
  if (confirm('Are you sure you want to delete this client?')) {
    try {
      await clientStore.deleteClient(id);
    } catch (error) {
      console.error("Error deleting client in component:", error);
    }
  }
}

function openAddDialog() {
  resetForm();
  isEditing.value = false;
  clientDialog.value = true;
}

function resetForm() {
  clientFormData.value = { ID: '', Name: '', Contact: '' };
}

const itemsForTable = computed(() => clientStore.clients);
</script>

<template>
  <v-container>
    <v-card>
      <v-card-title>
        Client Management
        <v-spacer></v-spacer>
        <v-btn color="primary" @click="openAddDialog">Add New Client</v-btn>
      </v-card-title>
      <v-card-text>
        <v-alert v-if="clientStore.error" type="error" dismissible class="mb-4">
          {{ clientStore.error }}
        </v-alert>
        <v-progress-linear
          v-if="clientStore.loading"
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

    <v-dialog v-model="clientDialog" max-width="500px">
      <v-card>
        <v-card-title class="text-h5">
          {{ isEditing ? 'Edit Client' : 'Add New Client' }}
        </v-card-title>
        <v-card-text>
          <v-container>
            <v-text-field
              v-model="clientFormData.Name"
              label="Name"
            ></v-text-field>
            <v-text-field
              v-model="clientFormData.Contact"
              label="Contact"
            ></v-text-field>
          </v-container>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="blue darken-1" text @click="clientDialog = false">Cancel</v-btn>
          <v-btn color="blue darken-1" text @click="addOrUpdateClient">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>