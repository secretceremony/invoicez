<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useClientStore } from '@/stores/client';
import { useStaffStore  } from '@/stores/staff';
import { useInvoiceStore } from '@/stores/invoice';
import { useProductServiceStore } from '@/stores/productService';
import { formatRupiah } from '@/utils/formatCurrency';

// --- Core Setup ---
const route = useRoute();
const router = useRouter();

// --- State Management (Pinia Stores) ---
const clientStore = useClientStore();
const staffStore  = useStaffStore();
const invoiceStore = useInvoiceStore();
const productServiceStore = useProductServiceStore();

// --- Component State ---
const invoiceFormData = ref({
  ID: '',
  InvoiceType: null,
  Date: new Date().toISOString().split('T')[0],
  ClientID: null,
  StaffID: null,
  Subtotal: 0,
  DownPaymentAmount: 0,
  Status: 'Draft',
  Notes: '',
  items: [],
});

let newItemIdCounter = 0; // For unique client-side item keys

// --- Static Data ---
const invoiceTypes = [
  { text: 'Artist Check/Invoice', value: 'Artist Check' },
  { text: 'Art Commission Invoice', value: 'Art Commission' },
  { text: 'Custom Merch Invoice', value: 'Custom Merch' },
  { text: 'Internal Expense (Staff)', value: 'Internal Expense' }
];
const statuses = ['Draft', 'Sent', 'Paid', 'Partially Paid', 'Cancelled'];

// --- Computed Properties ---
const isEditMode = computed(() => !!route.params.id);
const formTitle = computed(() => isEditMode.value ? 'Edit Invoice' : 'Create New Invoice');

// MODIFIED: Show items section for Internal Expense as well
const showItemsSection = computed(() =>
  ['Art Commission', 'Custom Merch', 'Internal Expense'].includes(invoiceFormData.value.InvoiceType)
);

const calculatedSubtotal = computed(() => {
  if (showItemsSection.value) {
    return invoiceFormData.value.items.reduce(
      (sum, item) => sum + (parseFloat(item.LineTotal) || 0),
      0
    );
  }
  return parseFloat(invoiceFormData.value.Subtotal) || 0;
});

const calculatedTotalDue = computed(() => {
  const subtotal = calculatedSubtotal.value;
  const downPayment = parseFloat(invoiceFormData.value.DownPaymentAmount) || 0;
  return subtotal - downPayment;
});

// --- Watchers ---
watch(() => invoiceFormData.value.InvoiceType, (newType, oldType) => {
  if (newType !== oldType) {
    // When switching away from an item-based type, reset items array
    if (!['Art Commission', 'Custom Merch', 'Internal Expense'].includes(newType)) {
      invoiceFormData.value.items = [];
    }
    // When switching to a type that doesn't need a client, reset ClientID
    if (!['Art Commission', 'Custom Merch'].includes(newType)) {
        invoiceFormData.value.ClientID = null;
    }
    // For Internal Expense, artist is not relevant. For Artist Check it's optional
    if (newType === 'Internal Expense') {
        invoiceFormData.value.StaffID = null;
    }
    // Reset amounts when type changes to avoid carrying over old values
    invoiceFormData.value.Subtotal = 0;
    invoiceFormData.value.DownPaymentAmount = 0;
  }
});

// --- Lifecycle Hooks ---
onMounted(async () => {
  await Promise.all([
    clientStore.fetchClients(),
    staffStore.fetchStaff(),
    productServiceStore.fetchProductsServices(),
  ]);

  if (isEditMode.value) {
    try {
      const invoiceToEdit = await invoiceStore.fetchInvoiceById(route.params.id);
      if (invoiceToEdit) {
        invoiceFormData.value = {
          ...invoiceToEdit,
          Subtotal: parseFloat(invoiceToEdit.Subtotal || 0),
          DownPaymentAmount: parseFloat(invoiceToEdit.DownPaymentAmount || 0),
          // MODIFIED: Ensure new fields are handled when loading data
          items: invoiceToEdit.items ? invoiceToEdit.items.map(item => ({
            ...item,
            id: item.ID || `new-item-${newItemIdCounter++}`,
            Quantity: parseFloat(item.Quantity || 0),
            UnitPrice: parseFloat(item.UnitPrice || 0),
            LineTotal: parseFloat(item.LineTotal || 0),
            PurchaseLocation: item.PurchaseLocation || '', // Handle new field
          })) : [],
        };
      }
    } catch (error) {
      console.error('Failed to load invoice for editing:', error);
    }
  }
});

// --- Methods ---
const updateLineTotal = (item) => {
  const qty = parseFloat(item.Quantity) || 0;
  const price = parseFloat(item.UnitPrice) || 0;
  item.LineTotal = qty * price;
};

// MODIFIED: Add `PurchaseLocation` to new items
const addItem = () => {
  invoiceFormData.value.items.push({
    id: `new-item-${newItemIdCounter++}`,
    Description: '',
    PurchaseLocation: '', // New field for internal expenses
    Quantity: 1,
    UnitPrice: 0,
    LineTotal: 0,
  });
};

const removeItem = (index) => {
  invoiceFormData.value.items.splice(index, 1);
};

const updateItemFromMaster = (selectedName, item) => {
  const selectedProduct = productServiceStore.productsServices.find(p => p.Name === selectedName);
  if (selectedProduct) {
    item.Description = selectedProduct.Name;
    item.UnitPrice = selectedProduct.UnitPrice;
  } else {
    item.Description = selectedName;
  }
  updateLineTotal(item);
};

async function saveInvoice() {
  const payload = {
    ...invoiceFormData.value,
    Subtotal: calculatedSubtotal.value,
    TotalDue: calculatedTotalDue.value,
    items: invoiceFormData.value.items.map(item => {
      // If the invoice type is not Internal Expense, don't save the PurchaseLocation
      if (invoiceFormData.value.InvoiceType !== 'Internal Expense') {
          delete item.PurchaseLocation;
      }
      const { id, ...itemToSave } = item;
      return itemToSave;
    }),
  };

  try {
    if (isEditMode.value) {
      await invoiceStore.updateInvoice(payload.ID, payload);
      alert('Invoice updated successfully!');
    } else {
      await invoiceStore.addInvoice(payload);
      alert('Invoice created successfully!');
    }
    router.push({ name: 'invoice-list' });
  } catch (error) {
    console.error('Error saving invoice:', error);
    alert('Failed to save invoice. Check console for details.');
  }
}
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
                required
              ></v-select>
            </v-col>
          </v-row>
          <v-row v-if="['Artist Check', 'Art Commission', 'Internal Expense'].includes(invoiceFormData.InvoiceType)">
            <v-col cols="12">
              <v-select
                v-model="invoiceFormData.StaffID"
                :items="staffStore.staff"
                item-title="Name"
                item-value="ID"
                :label="invoiceFormData.InvoiceType === 'Internal Expense' ? 'Staff Member' : 'Select Staff'"
                :loading="staffStore.loading"
                :required="invoiceFormData.InvoiceType !== 'Art Commission'"
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
                prepend-inner-icon="mdi-cash"
              ></v-text-field>
            </v-col>
          </v-row>


          <template v-if="showItemsSection">
            <h3 class="mt-4 mb-2">Invoice Items</h3>
            <v-divider class="mb-4"></v-divider>
            <div v-for="(item, index) in invoiceFormData.items" :key="item.id" class="mb-4">
              <v-row align="center">

                <v-col v-if="invoiceFormData.InvoiceType !== 'Internal Expense'" cols="12" md="5">
                  <v-autocomplete
                    v-model="item.Description"
                    :items="productServiceStore.productsServices.map(p => p.Name)"
                    label="Description"
                    density="compact"
                    hide-details
                    clearable
                    @update:model-value="selectedName => updateItemFromMaster(selectedName, item)"
                  ></v-autocomplete>
                </v-col>

                <v-col v-if="invoiceFormData.InvoiceType === 'Internal Expense'" cols="12" md="3">
                   <v-text-field
                      v-model="item.Description"
                      label="Item / Expense Description"
                      density="compact"
                      hide-details
                    ></v-text-field>
                </v-col>

                <v-col v-if="invoiceFormData.InvoiceType === 'Internal Expense'" cols="12" md="3">
                   <v-text-field
                      v-model="item.PurchaseLocation"
                      label="Place of Purchase"
                      density="compact"
                      hide-details
                    ></v-text-field>
                </v-col>

                <v-col cols="4" :md="invoiceFormData.InvoiceType === 'Internal Expense' ? '1' : '1'">
                  <v-text-field
                    v-model.number="item.Quantity"
                    label="Qty"
                    type="number"
                    min="1"
                    density="compact"
                    hide-details
                    @update:model-value="() => updateLineTotal(item)"
                  ></v-text-field>
                </v-col>
                <v-col cols="8" :md="invoiceFormData.InvoiceType === 'Internal Expense' ? '2' : '3'">
                  <v-text-field
                    v-model.number="item.UnitPrice"
                    label="Unit Price (IDR)"
                    type="number"
                    min="0"
                    density="compact"
                    hide-details
                    @update:model-value="() => updateLineTotal(item)"
                  ></v-text-field>
                </v-col>
                <v-col cols="10" md="2">
                   <v-text-field
                    :model-value="formatRupiah(item.LineTotal)"
                    label="Line Total"
                    readonly
                    density="compact"
                    hide-details
                    variant="plain"
                  ></v-text-field>
                </v-col>
                <v-col cols="2" md="1" class="text-right">
                  <v-btn icon="mdi-close-circle" color="error" variant="text" @click="removeItem(index)"></v-btn>
                </v-col>
              </v-row>
              <v-divider v-if="index < invoiceFormData.items.length - 1" class="my-3"></v-divider>
            </div>
            <v-btn color="secondary" @click="addItem" class="mb-4">
              <v-icon start>mdi-plus</v-icon> Add Item
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
                label="Down Payment (IDR)"
                type="number"
                min="0"
                :disabled="invoiceFormData.InvoiceType === 'Artist Check' || invoiceFormData.InvoiceType === 'Internal Expense'"
                prepend-inner-icon="mdi-cash"
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
              <v-textarea v-model="invoiceFormData.Notes" label="Notes" rows="3"></v-textarea>
            </v-col>
          </v-row>
          <v-btn type="submit" color="success" :loading="invoiceStore.loading" class="mr-4">
            <v-icon start>mdi-content-save</v-icon> Save Invoice
          </v-btn>
          <v-btn color="error" variant="text" @click="router.back()">
            <v-icon start>mdi-cancel</v-icon> Cancel
          </v-btn>
        </v-form>
      </v-card-text>
    </v-card>
  </v-container>
</template>