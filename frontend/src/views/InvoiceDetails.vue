<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useInvoiceStore } from '@/stores/invoice';
import { useClientStore } from '@/stores/client';
import { useStaffStore } from '@/stores/staff';
import { formatRupiah } from '@/utils/formatCurrency';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import kmitkLogo from '@/assets/kmitk_logo.png';
import folksLogo from '@/assets/folks_logo.png';

const route = useRoute();
const router = useRouter();
const invoiceStore = useInvoiceStore();
const clientStore = useClientStore();
const staffStore = useStaffStore();

const invoice = ref(null);
const client = ref(null);
const staff = ref(null);
const loading = ref(true);
const error = ref(null);

const invoiceId = computed(() => route.params.id);

const editInvoice = (id) => {
  router.push({ name: 'edit-invoice', params: { id } });
};

onMounted(async () => {
  if (!invoiceId.value) {
    router.push({ name: 'invoice-list' });
    return;
  }
  loading.value = true;
  error.value = null;
  try {
    if (clientStore.clients.length === 0) await clientStore.fetchClients();
    if (staffStore.staff.length === 0) await staffStore.fetchStaff();

    const fetchedInvoice = await invoiceStore.fetchInvoiceById(invoiceId.value);

    if (typeof fetchedInvoice === 'object' && fetchedInvoice) {
      invoice.value = {
        ...fetchedInvoice,
        Subtotal: parseFloat(fetchedInvoice.Subtotal || 0),
        DownPaymentAmount: parseFloat(fetchedInvoice.DownPaymentAmount || 0),
        TotalDue: parseFloat(fetchedInvoice.TotalDue || 0),
        items: fetchedInvoice.items ? fetchedInvoice.items.map(item => ({
          ...item,
          Quantity: parseFloat(item.Quantity || 0),
          UnitPrice: parseFloat(item.UnitPrice || 0),
          LineTotal: parseFloat(item.LineTotal || 0),
        })) : [],
      };
      client.value = clientStore.clients.find(c => c.ID === invoice.value.ClientID) || null;
      staff.value = staffStore.staff.find(a => a.ID === invoice.value.StaffID) || null;
    } else {
      throw new Error('Invoice not found or invalid data received.');
    }
  } catch (err) {
    error.value = err.message || 'Failed to load invoice details.';
    console.error('Error in InvoiceDetails onMounted:', err);
  } finally {
    loading.value = false;
  }
});

const generatePdf = async () => {
  if (!invoice.value) return;

  const invoiceContent = document.getElementById('invoice-content-printable');
  const originalBackground = invoiceContent.style.background;
  const originalPadding = invoiceContent.style.padding;
  invoiceContent.style.background = 'white';
  invoiceContent.style.padding = '20mm';

  const canvas = await html2canvas(invoiceContent, {
    scale: 2,
    useCORS: true,
    logging: true,
    backgroundColor: '#FFFFFF'
  });

  invoiceContent.style.background = originalBackground;
  invoiceContent.style.padding = originalPadding;

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const imgWidth = 210;
  const pageHeight = 297;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft >= -10) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  pdf.save(`invoice_${invoice.value.ID}.pdf`);
};

const showItemsSection = computed(() =>
  invoice.value && ['Art Commission', 'Custom Merch', 'Internal Expense'].includes(invoice.value.InvoiceType)
);

const maxItems = 10;
const emptyRowsCount = computed(() => {
    if (!invoice.value || !invoice.value.items) return maxItems;
    return Math.max(0, maxItems - invoice.value.items.length);
});

const formatInvoiceDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const dynamicNotesContent = computed(() => {
  if (!invoice.value) return '';
  switch (invoice.value.InvoiceType) {
    case 'Staff Check':
      return `Terima kasih atas kontribusinya dalam proyek ini.<br />Pembayaran telah diterima sesuai kesepakatan.`;
    case 'Internal Expense':
      return `Pengeluaran internal untuk keperluan operasional. Harap simpan sebagai arsip.`;
    default:
      return `Silakan lakukan pembayaran melalui:<br />082255403036 (DANA) - ANSELLMA TITA P P<br />1807517027 (BNI) - ANSELLMA TITA P P`;
  }
});

const dynamicForLabel = computed(() => {
  if (!invoice.value) return '';
  switch (invoice.value.InvoiceType) {
    case 'Staff Check':
      return 'For Staffs';
    case 'Internal Expense':
      return 'For Internal/Staff';
    default:
      return 'For Commissioner/Customer';
  }
});

const billToLabel = computed(() => {
  if (!invoice.value) return 'BILL TO';
  return ['Artist Check', 'Internal Expense'].includes(invoice.value.InvoiceType) ? 'PAY TO' : 'BILL TO';
});

const billToName = computed(() => {
  if (!invoice.value) return 'N/A';
  if (['Artist Check', 'Internal Expense'].includes(invoice.value.InvoiceType) && staff.value) {
    return staff.value.Name;
  } else if (client.value) {
    return client.value.Name;
  }
  return 'N/A';
});

const billToContact = computed(() => {
  if (!invoice.value) return 'N/A';
  if (['Artist Check', 'Internal Expense'].includes(invoice.value.InvoiceType) && staff.value) {
    return staff.value.Contact || staff.value.NIM || staff.value.Role || 'No contact info';
  } else if (client.value) {
    return client.value.Contact;
  }
  return 'N/A';
});
</script>

<template>
  <v-container>
    <v-card class="pa-4" v-if="!loading && invoice">
      <v-card-title class="d-flex justify-end align-center mb-4">
        <div>
          <v-btn color="primary" class="mr-2" @click="editInvoice(invoice.ID)">
            <v-icon left>mdi-pencil</v-icon> Edit
          </v-btn>
          <v-btn color="secondary" @click="generatePdf">
            <v-icon left>mdi-file-download</v-icon> Download PDF
          </v-btn>
        </div>
      </v-card-title>

      <v-card-text id="invoice-content-printable" class="invoice-template">
        <div class="invoice-header">
          <div class="header-left">
            <img :src="kmitkLogo" alt="KMITK Logo" class="kmitk-logo" />
            <div class="org-details">
              <p class="org-title">UNIT KEGIATAN MAHASISWA</p>
              <p class="org-subtitle">FOREIGN LANGUAGE ITK SOCIETY (FOLKS)</p>
              <p class="org-contact">
                Kampus ITK (Karang Joang, Balikpapan-Kalimantan Timur 76127)<br />
                Telepon (Ozaky) +62 882-4784-1994<br />
                Email: <a href="mailto:folks@itk.ac.id">folks@itk.ac.id</a>, Media Sosial (Instagram): @folksitk
              </p>
            </div>
          </div>
          <div class="header-right">
            <img :src="folksLogo" alt="FOLKS Logo" class="folks-logo" />
          </div>
        </div>
        <v-divider class="header-divider"></v-divider>

        <div class="main-titles">
          <div class="main-title-left">
            <h1 class="foreign-title">FOREIGN ITK LANGUAGE SOCIETY</h1>
          </div>
          <div class="main-title-right">
            <div class="invoice-label">INVOICE</div>
            <div class="for-staff-label">{{ dynamicForLabel }}</div>
          </div>
        </div>

        <div class="invoice-details-bill-to">
          <div class="bill-to-section">
            <div class="bill-to-label">{{ billToLabel }}</div>
            <p class="client-name">{{ billToName }}</p>
            <p class="client-contact">{{ billToContact }}</p>
          </div>
          <div class="invoice-info-section">
            <div class="info-row">
              <span class="info-label">Invoice No:</span>
              <span class="info-value">{{ invoice.ID }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Invoice Date:</span>
              <span class="info-value">{{ formatInvoiceDate(invoice.Date) }}</span>
            </div>
          </div>
        </div>

        <table class="invoice-items-table">
          <thead>
            <tr>
              <th class="item-col">ITEMS</th>
              <th class="description-col">DESCRIPTION</th>
              <th v-if="invoice.InvoiceType === 'Internal Expense'" class="purchase-location-col">PLACE OF PURCHASE</th>
              <th class="quantity-col">QUANTITY</th>
              <th class="total-col">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in invoice.items" :key="item.ID || index" class="item-row">
              <td class="item-col">{{ index + 1 }}</td>
              <td class="description-col">{{ item.Description ?? '' }}</td>
              <td v-if="invoice.InvoiceType === 'Internal Expense'" class="purchase-location-col">{{ item.PurchaseLocation ?? '' }}</td>
              <td class="quantity-col">{{ item.Quantity }}</td>
              <td class="total-col">{{ formatRupiah(item.LineTotal) }}</td>
            </tr>
            <tr v-for="n in emptyRowsCount" :key="`empty-${n}`" class="item-row empty-row">
              <td class="item-col">&nbsp;</td>
              <td class="description-col"></td>
              <td v-if="invoice.InvoiceType === 'Internal Expense'" class="purchase-location-col"></td>
              <td class="quantity-col"></td>
              <td class="total-col"></td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td :colspan="invoice.InvoiceType === 'Internal Expense' ? 4 : 3" class="text-right total-label">Total</td>
              <td class="total-amount">{{ formatRupiah(invoice.TotalDue) }}</td>
            </tr>
          </tfoot>
        </table>

        <div class="notes-section">
          <p class="notes-label">Notes:</p>
          <p class="notes-content" v-html="dynamicNotesContent"></p>
        </div>

        <div class="contact-footer">
          <p class="contact-preset">
            Jika ada pertanyaan, silakan hubungi Ansel (Bendahara) via WhatsApp (082255403036)
          </p>
        </div>
      </v-card-text>
    </v-card>

    <v-alert v-else-if="error" type="error" class="mt-4">
      {{ error }}
    </v-alert>
    <v-progress-linear v-else-if="loading" indeterminate color="primary" class="mt-4"></v-progress-linear>

    <v-btn class="mt-4" @click="router.back()">
      <v-icon left>mdi-arrow-left</v-icon> Back to Invoices
    </v-btn>
  </v-container>
</template>

<style scoped>
/* GENERAL STYLES */
.invoice-template {
  font-family: Arial, sans-serif;
  color: #333;
  line-height: 1.4;
  max-width: 800px;
  margin: 0 auto;
  box-sizing: border-box;
}

/* HEADER */
.invoice-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
}
.header-left {
  display: flex;
  align-items: center;
  flex: 1;
}
.kmitk-logo {
  max-width: 60px;
  height: auto;
  margin-right: 15px;
}
.org-details {
  font-size: 0.8em;
}
.org-title {
  font-weight: bold;
  font-size: 1.1em;
}
.org-subtitle {
  font-weight: bold;
  font-size: 1.2em;
}
.header-right {
  display: flex;
  justify-content: flex-end;
}
.folks-logo {
  max-width: 80px;
}
.header-divider {
  border-top: 2px solid #000;
  margin-bottom: 20px;
}

/* MAIN TITLES */
.main-titles {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 30px;
}
.foreign-title {
  font-size: 1.8em;
  font-weight: bold;
  color: #2196F3;
}
.main-title-right {
  text-align: right;
}
.invoice-label {
  font-size: 2.5em;
  font-weight: bold;
}
.for-staff-label {
  font-size: 0.9em;
  color: #555;
  margin-top: -5px;
}

/* BILL TO & INVOICE INFO */
.invoice-details-bill-to {
  display: flex;
  justify-content: space-between;
  margin-bottom: 30px;
}
.bill-to-section {
  flex: 1;
  border: 1px solid #ddd;
  padding: 10px;
}
.bill-to-label {
  font-weight: bold;
  background-color: #eee;
  padding: 5px 0;
  margin-bottom: 5px;
  text-align: center;
}
.invoice-info-section {
  flex: 1;
  padding: 10px;
  margin-left: 20px;
}
.info-row {
  display: flex;
  justify-content: space-between;
  padding: 5px 0;
  border-bottom: 1px dashed #eee;
}

/* ITEMS TABLE */
.invoice-items-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;
}
.invoice-items-table th,
.invoice-items-table td {
  border: 1px solid #000;
  padding: 8px;
  text-align: left;
  font-size: 0.9em;
}
.invoice-items-table th {
  background-color: #eee;
}
.item-col { width: 5%; text-align: center; }
.description-col { width: auto; }
.purchase-location-col { width: 25%; }
.quantity-col { width: 10%; text-align: right; }
.total-col { width: 25%; text-align: right; }

.item-row.empty-row {
  height: 35px; /* Increase height for better spacing */
}

tfoot .total-row {
  font-weight: bold;
}
tfoot .total-label {
  text-align: right;
  padding-right: 15px;
}
tfoot .total-amount {
  font-size: 1.1em;
  background-color: #eee;
}

/* NOTES & FOOTER */
.notes-section {
  margin-top: 20px;
  border: 1px solid #000;
  padding: 10px;
  min-height: 80px;
}
.contact-footer {
  text-align: center;
  margin-top: 30px;
  font-size: 0.9em;
}
</style>