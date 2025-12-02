<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useInvoiceStore } from '@/stores/invoice';
import { formatRupiah } from '@/utils/formatCurrency';

const router = useRouter();
const invoiceStore = useInvoiceStore();

const searchTerm = ref('');
const sortBy = ref('date-desc');

onMounted(() => {
  invoiceStore.fetchInvoices();
});

const headers = ref([
  { title: 'Invoice ID', key: 'ID' },
  { title: 'Type', key: 'InvoiceType' },
  { title: 'Date', key: 'Date' },
  { title: 'Client ID', key: 'ClientID' },
  { title: 'Staff ID', key: 'StaffID' },
  { title: 'Subtotal', key: 'Subtotal' },
  { title: 'Down Payment', key: 'DownPaymentAmount' },
  { title: 'Total Due', key: 'TotalDue' },
  { title: 'Status', key: 'Status' },
  { title: 'Actions', key: 'actions', sortable: false },
]);

const invoices = computed(() => {
  const term = searchTerm.value.trim().toLowerCase();
  const filtered = (invoiceStore.invoices || []).filter((inv) => {
    if (!term) return true;
    return [
      inv.ID,
      inv.InvoiceType,
      inv.Status,
      inv.ClientID,
      inv.StaffID,
    ]
      .filter(Boolean)
      .some((v) => v.toString().toLowerCase().includes(term));
  });

  const sorted = [...filtered];
  sorted.sort((a, b) => {
    const dateA = new Date(a.Date || a.InvoiceDate || 0).getTime();
    const dateB = new Date(b.Date || b.InvoiceDate || 0).getTime();
    const totalA = Number(a.TotalDue || 0);
    const totalB = Number(b.TotalDue || 0);
    switch (sortBy.value) {
      case 'date-asc': return dateA - dateB;
      case 'total-asc': return totalA - totalB;
      case 'total-desc': return totalB - totalA;
      case 'id-asc': return (a.ID || '').localeCompare(b.ID || '');
      case 'id-desc': return (b.ID || '').localeCompare(a.ID || '');
      default: return dateB - dateA; // date-desc
    }
  });
  return sorted;
});

function viewInvoice(id) {
  router.push({ name: 'invoice-details', params: { id } });
}

function editInvoice(id) {
  router.push({ name: 'edit-invoice', params: { id } });
}

async function deleteInvoice(id) {
  if (confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
    try {
      await invoiceStore.deleteInvoice(id);
      alert('Invoice deleted successfully!');
    } catch (error) {
      console.error('Error deleting invoice:', error);
      alert('Failed to delete invoice. Check console for details.');
    }
  }
}
</script>

<template>
  <v-container>
    <v-card>
      <v-card-title>
        All Invoices
        <v-spacer></v-spacer>
        <v-text-field
          v-model="searchTerm"
          label="Search"
          density="comfortable"
          prepend-inner-icon="mdi-magnify"
          hide-details
          class="mr-4"
          style="max-width: 260px"
        />
        <v-select
          v-model="sortBy"
          :items="[
            { title: 'Date (Newest)', value: 'date-desc' },
            { title: 'Date (Oldest)', value: 'date-asc' },
            { title: 'Total Due (High-Low)', value: 'total-desc' },
            { title: 'Total Due (Low-High)', value: 'total-asc' },
            { title: 'ID (A-Z)', value: 'id-asc' },
            { title: 'ID (Z-A)', value: 'id-desc' },
          ]"
          label="Sort"
          density="comfortable"
          hide-details
          class="mr-4"
          style="max-width: 200px"
        />
        <v-btn color="primary" :to="{ name: 'create-invoice' }">
          <v-icon left>mdi-file-document-plus</v-icon>
          Create New Invoice
        </v-btn>
      </v-card-title>
      <v-card-text>
        <v-alert v-if="invoiceStore.error" type="error" dismissible class="mb-4">
          {{ invoiceStore.error }}
        </v-alert>
        <v-progress-linear
          v-if="invoiceStore.loading"
          indeterminate
          color="primary"
        ></v-progress-linear>

        <v-data-table
          :headers="headers"
          :items="invoices"
          item-key="ID"
          class="elevation-1"
          :loading="invoiceStore.loading"
          no-data-text="No invoices found."
        >
          <template v-slot:item.Subtotal="{ item }">
            {{ formatRupiah(item.Subtotal) }}
          </template>
          <template v-slot:item.DownPaymentAmount="{ item }">
            {{ formatRupiah(item.DownPaymentAmount) }}
          </template>
          <template v-slot:item.TotalDue="{ item }">
            {{ formatRupiah(item.TotalDue) }}
          </template>

          <template v-slot:item.actions="{ item }">
            <v-icon small class="mr-2" @click="viewInvoice(item.ID)" title="View Details">
              mdi-eye
            </v-icon>
            <v-icon small class="mr-2" @click="editInvoice(item.ID)" title="Edit Invoice">
              mdi-pencil
            </v-icon>
            <v-icon small @click="deleteInvoice(item.ID)" title="Delete Invoice">
              mdi-delete
            </v-icon>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>
  </v-container>
</template>
