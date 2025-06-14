<script setup>
import { ref, onMounted, computed } from 'vue';
import { useProductServiceStore } from '@/stores/productService';
import { VDataTable } from 'vuetify/components';
import { formatRupiah } from '@/utils/formatCurrency';

const productServiceStore = useProductServiceStore();

const productFormData = ref({
  ID: '',
  Name: '',
  Description: '',
  UnitPrice: 0,
  Category: '',
});

const isEditing = ref(false);
const productDialog = ref(false);

const categories = ['Commission Base', 'Commission Add-on', 'Merch Item', 'Service Fee', 'Other']; // Define your categories

onMounted(() => {
  productServiceStore.fetchProductsServices();
});

const headers = ref([
  { title: 'ID', key: 'ID' },
  { title: 'Name', key: 'Name' },
  { title: 'Description', key: 'Description' },
  { title: 'Unit Price', key: 'UnitPrice' },
  { title: 'Category', key: 'Category' },
  { title: 'Actions', key: 'actions', sortable: false },
]);

async function addOrUpdateProduct() {
  try {
    // Ensure UnitPrice is a number when sending to store/backend
    productFormData.value.UnitPrice = parseFloat(productFormData.value.UnitPrice || 0);

    if (isEditing.value) {
      await productServiceStore.updateProductService(productFormData.value.ID, productFormData.value);
    } else {
      await productServiceStore.addProductService(productFormData.value);
    }
    productDialog.value = false;
    resetForm();
  } catch (error) {
    console.error("Error saving product/service:", error);
    alert("Failed to save product/service: " + (productServiceStore.error || "Unknown error"));
  }
}

function editItem(item) {
  // Ensure UnitPrice is number when loading for edit form
  productFormData.value = { ...item, UnitPrice: parseFloat(item.UnitPrice || 0) };
  isEditing.value = true;
  productDialog.value = true;
}

async function deleteItem(id) {
  if (confirm('Are you sure you want to delete this product/service?')) {
    try {
      await productServiceStore.deleteProductService(id);
    } catch (error) {
      console.error("Error deleting product/service:", error);
      alert("Failed to delete product/service: " + (productServiceStore.error || "Unknown error"));
    }
  }
}

function openAddDialog() {
  resetForm();
  isEditing.value = false;
  productDialog.value = true;
}

function resetForm() {
  productFormData.value = { ID: '', Name: '', Description: '', UnitPrice: 0, Category: '' };
}

const itemsForTable = computed(() => productServiceStore.productsServices);
</script>

<template>
  <v-container>
    <v-card>
      <v-card-title>
        Products & Services Management
        <v-spacer></v-spacer>
        <v-btn color="primary" @click="openAddDialog">Add New Product/Service</v-btn>
      </v-card-title>
      <v-card-text>
        <v-alert v-if="productServiceStore.error" type="error" dismissible class="mb-4">
          {{ productServiceStore.error }}
        </v-alert>
        <v-progress-linear
          v-if="productServiceStore.loading"
          indeterminate
          color="primary"
        ></v-progress-linear>

        <v-data-table
          :headers="headers"
          :items="itemsForTable"
          item-key="ID"
          class="elevation-1"
          :loading="productServiceStore.loading"
          no-data-text="No products or services found. Add some!"
        >
          <template v-slot:item.UnitPrice="{ item }">
            {{ formatRupiah(item.UnitPrice) }}
          </template>
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

    <v-dialog v-model="productDialog" max-width="600px">
      <v-card>
        <v-card-title class="text-h5">
          {{ isEditing ? 'Edit Product/Service' : 'Add New Product/Service' }}
        </v-card-title>
        <v-card-text>
          <v-container>
            <v-text-field
              v-model="productFormData.Name"
              label="Name"
            ></v-text-field>
            <v-text-field
              v-model="productFormData.Description"
              label="Description"
            ></v-text-field>
            <v-text-field
              v-model.number="productFormData.UnitPrice"
              label="Unit Price (IDR)"
              type="number"
              min="0"
            ></v-text-field>
            <v-select
              v-model="productFormData.Category"
              :items="categories"
              label="Category"
            ></v-select>
          </v-container>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="blue darken-1" text @click="productDialog = false">Cancel</v-btn>
          <v-btn color="blue darken-1" text @click="addOrUpdateProduct">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>