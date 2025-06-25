<script setup>
import { ref, onMounted, computed } from 'vue';
import { useStaffStore } from '@/stores/staff';
import { VDataTable } from 'vuetify/components';

const staffStore = useStaffStore();

const staffFormData = ref({
  ID: '',
  Name: '',
  NIM: '',
  Role: '',
  Contact: '',
});

const isEditing = ref(false);
const staffDialog = ref(false);

onMounted(() => {
  staffStore.fetchStaff();
});

const headers = ref([
  { title: 'ID', key: 'ID' },
  { title: 'Name', key: 'Name' },
  { title: 'NIM', key: 'NIM' },
  { title: 'Role', key: 'Role' },
  { title: 'Contact', key: 'Contact' },
  { title: 'Actions', key: 'actions', sortable: false },
]);

async function addOrUpdateStaff() {
  try {
    if (isEditing.value) {
      await staffStore.updateStaff(staffFormData.value.ID, staffFormData.value);
    } else {
      await staffStore.addStaff(staffFormData.value);
    }
    staffDialog.value = false;
    resetForm();
  } catch (error) {
    console.error("Error saving staff member:", error);
    // Optionally, show an alert to the user
    alert("Failed to save staff member. Please check the console for details.");
  }
}

function editItem(item) {
  staffFormData.value = { ...item };
  isEditing.value = true;
  staffDialog.value = true;
}

async function deleteItem(id) {
  if (confirm('Are you sure you want to delete this staff member?')) {
    try {
      await staffStore.deleteStaff(id);
    } catch (error) {
      console.error("Error deleting staff member:", error);
      alert("Failed to delete staff member. Please check the console for details.");
    }
  }
}

function openAddDialog() {
  resetForm();
  isEditing.value = false;
  staffDialog.value = true;
}

function resetForm() {
  staffFormData.value = { ID: '', Name: '', NIM: '', Role: '', Contact: '' };
}

const itemsForTable = computed(() => staffStore.staff);
</script>

<template>
  <v-container>
    <v-card>
      <v-card-title>
        Staff Management
        <v-spacer></v-spacer>
        <v-btn color="primary" @click="openAddDialog">Add New Staff Member</v-btn>
      </v-card-title>
      <v-card-text>
        <v-alert v-if="staffStore.error" type="error" dismissible class="mb-4">
          {{ staffStore.error }}
        </v-alert>
        <v-progress-linear
          v-if="staffStore.loading"
          indeterminate
          color="primary"
        ></v-progress-linear>

        <v-data-table
          :headers="headers"
          :items="itemsForTable"
          item-key="ID"
          class="elevation-1"
          :loading="staffStore.loading"
          no-data-text="No staff members found."
        >
          <template v-slot:item.actions="{ item }">
            <v-icon small class="mr-2" @click="editItem(item)" title="Edit Staff Member">
              mdi-pencil
            </v-icon>
            <v-icon small @click="deleteItem(item.ID)" title="Delete Staff Member">
              mdi-delete
            </v-icon>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

    <v-dialog v-model="staffDialog" max-width="500px">
      <v-card>
        <v-card-title class="text-h5">
          {{ isEditing ? 'Edit Staff Member' : 'Add New Staff Member' }}
        </v-card-title>
        <v-card-text>
          <v-container>
            <v-text-field
              v-model="staffFormData.Name"
              label="Name"
              required
            ></v-text-field>
            <v-text-field
              v-model="staffFormData.NIM"
              label="NIM"
            ></v-text-field>
            <v-text-field
              v-model="staffFormData.Role"
              label="Role"
            ></v-text-field>
            <v-text-field
              v-model="staffFormData.Contact"
              label="Contact"
            ></v-text-field>
          </v-container>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="blue darken-1" text @click="staffDialog = false">Cancel</v-btn>
          <v-btn color="blue darken-1" text @click="addOrUpdateStaff">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>