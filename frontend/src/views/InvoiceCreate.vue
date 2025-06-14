<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useClientStore } from '@/stores/client';
import { useArtistStore } from '@/stores/artist';
import { useInvoiceStore } from '@/stores/invoice';
import { useProductServiceStore } from '@/stores/productService';
import { formatRupiah } from '@/utils/formatCurrency';

const route = useRoute();
const router = useRouter();
const clientStore = useClientStore();
const artistStore = useArtistStore();
const invoiceStore = useInvoiceStore();
const productServiceStore = useProductServiceStore();

const invoiceFormData = ref({
  ID: '',
  InvoiceType: null,
  Date: new Date().toISOString().split('T')[0],
  ClientID: null,
  ArtistID: null,
  Subtotal: 0,
  DownPaymentAmount: 0,
  TotalDue: 0,
  Status: 'Draft',
  Notes: '',
  items: [],
});

const invoiceTypes = [
  { text: 'Artist Check/Invoice', value: 'Artist Check' },
  { text: 'Art Commission Invoice', value: 'Art Commission' },
  { text: 'Custom Merch Invoice', value: 'Custom Merch' },
];

const statuses = ['Draft', 'Sent', 'Paid', 'Partially Paid', 'Cancelled'];

const formTitle = computed(() =>
  route.params.id ? 'Edit Invoice' : 'Create New Invoice'
);

onMounted(async () => {
  await clientStore.fetchClients();
  await artistStore.fetchArtists();
  await productServiceStore.fetchProductsServices();

  if (route.params.id) {
    try {
      const invoiceToEdit = await invoiceStore.fetchInvoiceById(route.params.id);
      if (invoiceToEdit) {
        invoiceFormData.value = {
          ...invoiceToEdit,
          Subtotal: parseFloat(invoiceToEdit.Subtotal || 0),
          DownPaymentAmount: parseFloat(invoiceToEdit.DownPaymentAmount || 0),
          TotalDue: parseFloat(invoiceToEdit.TotalDue || 0),
          items: invoiceToEdit.items
            ? invoiceToEdit.items.map(item => ({
                // Ensure existing items also have an 'id' for consistent keying,
                // though usually fetched items would have a proper backend ID.
                // Using the backend ID is highly recommended if available.
                id: item.ID || Date.now() + Math.random(), // Fallback if no backend ID
                ...item,
                Quantity: parseFloat(item.Quantity || 0),
                UnitPrice: parseFloat(item.UnitPrice || 0),
                LineTotal: parseFloat(item.LineTotal || 0),
              }))
            : [],
        };
      }
    } catch (error) {
      console.error('Failed to load invoice for editing:', error);
    }
  }
});

const showItemsSection = computed(() =>
  ['Art Commission', 'Custom Merch'].includes(invoiceFormData.value.InvoiceType)
);

const addItem = () => {
  invoiceFormData.value.items.push({
    // IMPORTANT: Use a truly unique key for each item, especially when adding/removing from a list.
    // Date.now() + Math.random() is a simple client-side way to generate a unique ID.
    // If your backend assigns IDs, use those once the item is saved.
    id: Date.now() + Math.random(),
    Description: '',
    Quantity: 1,
    UnitPrice: 0,
    LineTotal: 0,
  });
};

const removeItem = (index) => {
  invoiceFormData.value.items.splice(index, 1);
};

const calculatedSubtotal = computed(() => {
  if (!showItemsSection.value) return parseFloat(invoiceFormData.value.Subtotal || 0);
  return invoiceFormData.value.items.reduce(
    (sum, item) => sum + (parseFloat(item.LineTotal) || 0),
    0
  );
});

watch(
  calculatedSubtotal,
  (newVal) => {
    if (showItemsSection.value) {
      invoiceFormData.value.Subtotal = newVal;
    }
  },
  { immediate: true }
);


const calculatedTotalDue = computed(() => {
  const sub = calculatedSubtotal.value;
  const downPayment = parseFloat(invoiceFormData.value.DownPaymentAmount) || 0;
  return sub - downPayment;
});

watch(calculatedTotalDue, (newVal) => {
  invoiceFormData.value.TotalDue = newVal;
});


async function saveInvoice() {
  try {
    if (route.params.id) {
      await invoiceStore.updateInvoice(invoiceFormData.value.ID, invoiceFormData.value);
      alert('Invoice updated successfully!');
    } else {
      await invoiceStore.addInvoice(invoiceFormData.value);
      alert('Invoice created successfully!');
    }
    router.push({ name: 'invoice-list' });
  } catch (error) {
    console.error('Error saving invoice:', error);
    alert('Failed to save invoice. Check console for details.');
  }
}

// Autocomplete logic for items from master list
const updateItemFromMaster = (selectedName, itemIndex) => {
  // Find the full product object based on the selected name
  const selectedProduct = productServiceStore.productsServices.find(
    (product) => product.Name === selectedName
  );

  if (selectedProduct) {
    invoiceFormData.value.items[itemIndex].Description = selectedProduct.Name;
    invoiceFormData.value.items[itemIndex].UnitPrice = selectedProduct.UnitPrice;
  } else {
    // If user types something not in the master list, keep the typed value
    invoiceFormData.value.items[itemIndex].Description = selectedName;
    // Optionally, reset UnitPrice if the description doesn't match a master product
    // invoiceFormData.value.items[itemIndex].UnitPrice = 0;
  }
};
</script>

<template>
  <v-container>
    <v-card class="pa-4">
      <v-card-title class="text-h5 mb-4">{{ formTitle }}</v-card-title>
      <v-card-text>
        <v-form @submit.prevent="saveInvoice">
          <v-row>
            <v-col cols="12" md="6">
              <v-select
                v-model="invoiceFormData.InvoiceType"
                :items="invoiceTypes"
                item-title="text"
                item-value="value"
                label="Invoice Type"
                required
              ></v-select>
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="invoiceFormData.Date"
                label="Invoice Date"
                type="date"
                required
              ></v-text-field>
            </v-col>
          </v-row>

          <v-row v-if="['Art Commission', 'Custom Merch'].includes(invoiceFormData.InvoiceType)">
            <v-col cols="12">
              <v-select
                v-model="invoiceFormData.ClientID"
                :items="clientStore.clients"
                item-title="Name"
                item-value="ID"
                label="Select Client"
                :loading="clientStore.loading"
                :disabled="clientStore.loading"
                required
              ></v-select>
            </v-col>
          </v-row>

          <v-row v-if="['Artist Check', 'Art Commission'].includes(invoiceFormData.InvoiceType)">
            <v-col cols="12">
              <v-select
                v-model="invoiceFormData.ArtistID"
                :items="artistStore.artists"
                item-title="Name"
                item-value="ID"
                label="Select Artist"
                :loading="artistStore.loading"
                :disabled="artistStore.loading"
                :required="invoiceFormData.InvoiceType === 'Artist Check'"
              ></v-select>
            </v-col>
          </v-row>

          <v-row v-if="invoiceFormData.InvoiceType === 'Artist Check'">
            <v-col cols="12">
              <v-text-field
                v-model.number="invoiceFormData.Subtotal"
                label="Amount (IDR)"
                type="number"
                min="0"
                required
                prepend-inner-icon="mdi-currency-usd"
              ></v-text-field>
            </v-col>
          </v-row>

          <template v-if="showItemsSection">
            <h3 class="mt-4 mb-2">Invoice Items</h3>
            <v-divider class="mb-4"></v-divider>
            <div v-for="(item, index) in invoiceFormData.items" :key="item.id" class="mb-4">
              <v-row align="center">
                <v-col cols="12" sm="6">
                  <v-autocomplete
                    v-model="item.Description"
                    :items="productServiceStore.productsServices"
                    item-title="Name"
                    item-value="Name"
                    label="Description"
                    density="compact"
                    hide-details
                    @update:model-value="selectedName => updateItemFromMaster(selectedName, index)"
                    :loading="productServiceStore.loading"
                    :disabled="productServiceStore.loading"
                    clearable
                  ></v-autocomplete>
                </v-col>
                <v-col cols="4" sm="2">
                  <v-text-field
                    v-model.number="item.Quantity"
                    label="Qty"
                    type="number"
                    min="1"
                    density="compact"
                    hide-details
                    @update:model-value="() => {
                        const qty = parseFloat(item.Quantity) || 0;
                        const price = parseFloat(item.UnitPrice) || 0;
                        item.LineTotal = qty * price;
                    }"
                  ></v-text-field>
                </v-col>
                <v-col cols="4" sm="2">
                  <v-text-field
                    v-model.number="item.UnitPrice"
                    label="Unit Price (IDR)"
                    type="number"
                    min="0"
                    density="compact"
                    hide-details
                    @update:model-value="() => {
                        const qty = parseFloat(item.Quantity) || 0;
                        const price = parseFloat(item.UnitPrice) || 0;
                        item.LineTotal = qty * price;
                    }"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" sm="1">
                  <v-text-field
                    :model-value="item.LineTotal"
                    label="Line Total (IDR)"
                    readonly
                    density="compact"
                    hide-details
                  ></v-text-field>
                </v-col>
                <v-col cols="12" sm="1" class="d-flex justify-end">
                  <v-btn icon color="error" size="small" @click="removeItem(index)">
                    <v-icon>mdi-close-circle</v-icon>
                  </v-btn>
                </v-col>
              </v-row>
              <v-divider v-if="index < invoiceFormData.items.length - 1" class="my-2"></v-divider>
            </div>
            <v-btn color="secondary" @click="addItem" class="mb-4">
              <v-icon left>mdi-plus</v-icon> Add Item
            </v-btn>
          </template>

          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                :model-value="formatRupiah(calculatedSubtotal)"
                label="Subtotal"
                readonly
                variant="outlined"
                class="font-weight-bold"
              ></v-text-field>
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model.number="invoiceFormData.DownPaymentAmount"
                label="Down Payment Amount (IDR)"
                type="number"
                min="0"
                :disabled="invoiceFormData.InvoiceType === 'Artist Check'"
                prepend-inner-icon="mdi-currency-usd"
              ></v-text-field>
            </v-col>
          </v-row>

          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                :model-value="formatRupiah(calculatedTotalDue)"
                label="Total Due"
                readonly
                variant="outlined"
                class="font-weight-bold text-h6"
              ></v-text-field>
            </v-col>
            <v-col cols="12" md="6">
              <v-select
                v-model="invoiceFormData.Status"
                :items="statuses"
                label="Status"
                required
              ></v-select>
            </v-col>
          </v-row>

          <v-row>
            <v-col cols="12">
              <v-textarea
                v-model="invoiceFormData.Notes"
                label="Notes"
                rows="3"
              ></v-textarea>
            </v-col>
          </v-row>

          <v-btn type="submit" color="success" :loading="invoiceStore.loading" class="mr-4">
            <v-icon left>mdi-content-save</v-icon>
            Save Invoice
          </v-btn>
          <v-btn color="error" @click="router.back()">
            <v-icon left>mdi-cancel</v-icon>
            Cancel
          </v-btn>
        </v-form>
      </v-card-text>
    </v-card>
  </v-container>
</template>