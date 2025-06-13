<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useInvoiceStore } from '@/stores/invoice';
import { useClientStore } from '@/stores/client';
import { useArtistStore } from '@/stores/artist';
import { formatRupiah } from '@/utils/formatCurrency';

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Import logos (assuming they are in src/assets)
import kmitkLogo from '@/assets/kmitk_logo.png';
import folksLogo from '@/assets/folks_logo.png';

console.log('InvoiceDetails.vue script setup started.');

const route = useRoute();
const router = useRouter();
const invoiceStore = useInvoiceStore();
const clientStore = useClientStore();
const artistStore = useArtistStore();

const invoice = ref(null);
const client = ref(null);
const artist = ref(null);
const loading = ref(true);
const error = ref(null);

const invoiceId = computed(() => route.params.id);

const editInvoice = (id) => {
  router.push({ name: 'edit-invoice', params: { id } });
};

onMounted(async () => {
  console.log('InvoiceDetails.vue onMounted hook fired.');
  console.log('Current invoiceId from route:', invoiceId.value);

  if (!invoiceId.value) {
    console.log('No invoice ID found in route params. Redirecting to invoice list.');
    router.push({ name: 'invoice-list' });
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    if (clientStore.clients.length === 0) {
      await clientStore.fetchClients();
    }
    if (artistStore.artists.length === 0) {
      await artistStore.fetchArtists();
    }

    console.log('Attempting to fetch invoice with ID:', invoiceId.value);

    const fetchedInvoice = await invoiceStore.fetchInvoiceById(invoiceId.value);
    
    console.log('Raw response from fetchInvoiceById:', fetchedInvoice);
    console.log('Type of fetchedInvoice:', typeof fetchedInvoice);
    console.log('Is fetchedInvoice a string?', typeof fetchedInvoice === 'string');
    
    if (typeof fetchedInvoice === 'string' || !fetchedInvoice) {
      const errorMessage = 'API returned invalid data (HTML or empty) instead of JSON. Check your API endpoint and ensure your backend server is running.';
      console.error(errorMessage, fetchedInvoice ? fetchedInvoice.substring(0, 200) + '...' : '');
      throw new Error(errorMessage);
    }
    
    if (typeof fetchedInvoice === 'object') {
      const processedInvoice = {
        ...fetchedInvoice,
        Subtotal: parseFloat(fetchedInvoice.Subtotal || 0),
        DownPaymentAmount: parseFloat(fetchedInvoice.DownPaymentAmount || 0),
        TotalDue: parseFloat(fetchedInvoice.TotalDue || 0),
      };

      if (fetchedInvoice.items && Array.isArray(fetchedInvoice.items)) {
        processedInvoice.items = fetchedInvoice.items.map(item => ({
          ...item,
          Quantity: parseFloat(item.Quantity || 0),
          UnitPrice: parseFloat(item.UnitPrice || 0),
          LineTotal: parseFloat(item.LineTotal || 0),
        }));
      } else {
        processedInvoice.items = [];
      }
      
      invoice.value = processedInvoice;

      client.value = clientStore.clients.find(c => c.ID === invoice.value.ClientID) || null;
      artist.value = artistStore.artists.find(a => a.ID === invoice.value.ArtistID) || null;

      console.log('--- Invoice Details Component State ---');
      console.log('Raw fetchedInvoice (before parseFloat):', fetchedInvoice);
      console.log('Processed invoice.value (after parseFloat):', invoice.value);
      console.log('Type of invoice.value.Subtotal:', typeof invoice.value.Subtotal, 'Value:', invoice.value.Subtotal);
      console.log('Type of invoice.value.TotalDue:', typeof invoice.value.TotalDue, 'Value:', invoice.value.TotalDue);
      if (invoice.value.items && invoice.value.items.length > 0) {
        console.log('Type of first item.LineTotal:', typeof invoice.value.items[0].LineTotal, 'Value:', invoice.value.items[0].LineTotal);
      }
      console.log('--- End Invoice Details Component State ---');

    } else {
      error.value = 'Invoice not found.';
      console.log('Invoice not found for ID:', invoiceId.value);
    }
  } catch (err) {
    error.value = err.message || 'Failed to load invoice details.';
    console.error('Error in InvoiceDetails onMounted:', err);
    
    if (err.message && err.message.includes('HTML instead of JSON')) {
      console.error('This usually means:');
      console.error('1. Your API server is not running');
      console.error('2. The API endpoint URL is incorrect');
      console.error('3. There\'s a CORS issue');
      console.error('4. Your API is returning an error page instead of JSON');
    }
  } finally {
    loading.value = false;
  }
});

const generatePdf = async () => {
  if (!invoice.value) {
    alert('Invoice data not loaded yet.');
    return;
  }

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
  invoice.value && ['Art Commission', 'Custom Merch'].includes(invoice.value.InvoiceType)
);

const maxItems = 10;
const emptyRowsCount = computed(() => {
    if (!invoice.value || !invoice.value.items) return maxItems;
    return Math.max(0, maxItems - invoice.value.items.length);
});

const formatInvoiceDate = (dateString) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
};

const dynamicNotesContent = computed(() => {
  if (!invoice.value) return '';

  if (invoice.value.InvoiceType === 'Artist Check') {
    return `
      Terima kasih atas kontribusinya dalam proyek ini.<br />
      Pembayaran telah diterima sesuai kesepakatan.<br />
      Harap simpan invoice ini sebagai bukti transaksi.
    `;
  } else {
    return `
      Silakan lakukan pembayaran melalui:<br />
      082255403036 (DANA) - ANSELLMA TITA P P<br />
      1807517027 (BNI) - ANSELLMA TITA P P
    `;
  }
});

const dynamicForLabel = computed(() => {
  if (!invoice.value) return '';

  if (invoice.value.InvoiceType === 'Artist Check') {
    return 'For artists';
  } else {
    return 'For Commissioner/Customer';
  }
});

// --- NEW: Computed properties for dynamic "BILL TO" section ---
const billToLabel = computed(() => {
  if (!invoice.value) return 'BILL TO';
  return invoice.value.InvoiceType === 'Artist Check' ? 'PAY TO' : 'BILL TO';
});

const billToName = computed(() => {
  if (!invoice.value) return 'N/A';
  if (invoice.value.InvoiceType === 'Artist Check' && artist.value) {
    return artist.value.Name;
  } else if (client.value) {
    return client.value.Name;
  }
  return 'N/A';
});

const billToContact = computed(() => {
  if (!invoice.value) return 'N/A';
  if (invoice.value.InvoiceType === 'Artist Check' && artist.value) {
    // Assuming artist 'Contact' field is available and contains relevant contact info
    // You might want to display NIM or Role here too if desired
    return artist.value.Contact || artist.value.NIM || artist.value.Role || 'No contact info';
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
            <div class="for-artists-label">{{ dynamicForLabel }}</div> </div>
        </div>

        <div class="invoice-details-bill-to">
          <div class="bill-to-section">
            <div class="bill-to-label">{{ billToLabel }}</div> <p class="client-name">{{ billToName }}</p> <p class="client-contact">{{ billToContact }}</p> </div>
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
              <th class="quantity-col">QUANTITY</th>
              <th class="total-col">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in invoice.items" :key="item.ID || index" class="item-row">
              <td class="item-col">{{ index + 1 }}</td>
              <td class="description-col">{{ item.Description }}</td>
              <td class="quantity-col">{{ item.Quantity }}</td>
              <td class="total-col">{{ formatRupiah(item.LineTotal) }}</td>
            </tr>
            <tr v-for="n in emptyRowsCount" :key="`empty-${n}`" class="item-row empty-row">
              <td class="item-col"></td>
              <td class="description-col"></td>
              <td class="quantity-col"></td>
              <td class="total-col"></td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td colspan="3" class="text-right total-label">Total</td>
              <td class="total-amount">{{ formatRupiah(invoice.TotalDue) }}</td>
            </tr>
          </tfoot>
        </table>

        <div class="notes-section">
          <p class="notes-label">Notes:</p>
          <p class="notes-content" v-html="dynamicNotesContent"></p> </div>

        <div class="contact-footer">
          <p class="contact-preset">
            Jika ada pertanyaan, silakan hubungi Ansel (Bendahara) via WhatsApp (082255403036)
          </p>
        </div>

      </v-card-text>
    </v-card>

    <v-alert v-else-if="error" type="error" class="mt-4">
      {{ error }}
      <div class="mt-2" style="font-size: 0.9em;">
        <strong>Troubleshooting:</strong><br>
        • Make sure your API server is running<br>
        • Check that the API endpoint URL is correct<br>
        • Verify the invoice ID exists in your database<br>
        • Check browser console for more details
      </div>
    </v-alert>
    <v-progress-linear v-else-if="loading" indeterminate color="primary" class="mt-4"></v-progress-linear>

    <v-btn class="mt-4" @click="router.back()">
      <v-icon left>mdi-arrow-left</v-icon> Back to Invoices
    </v-btn>
  </v-container>
</template>

<style scoped>
/* (Keep all your existing CSS styles from the previous code block here. No changes needed to CSS) */
.invoice-template {
  font-family: Arial, sans-serif;
  color: #333;
  line-height: 1.4;
  max-width: 800px;
  margin: 0 auto;
  box-sizing: border-box;
}

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
  margin-bottom: 2px;
  font-size: 1.1em;
}
.org-subtitle {
  font-weight: bold;
  margin-bottom: 2px;
  font-size: 1.2em;
}
.org-contact {
  font-size: 0.9em;
  line-height: 1.2;
}
.org-contact a {
    color: #333;
    text-decoration: none;
}
.org-contact a:hover {
    text-decoration: underline;
}

.header-right {
  display: flex;
  justify-content: flex-end;
}
.folks-logo {
  max-width: 80px;
  height: auto;
}

.header-divider {
  border-top: 2px solid #000;
  margin-bottom: 20px;
}

.main-titles {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 30px;
}
.main-title-left {
  flex: 1;
}
.foreign-title {
  font-size: 1.8em;
  font-weight: bold;
  color: #2196F3;
  margin: 0;
  padding: 0;
}

.main-title-right {
  text-align: right;
}
.invoice-label {
  font-size: 2.5em;
  font-weight: bold;
  color: #333;
}
.for-artists-label {
  font-size: 0.9em;
  color: #555;
  margin-top: -5px;
}

.invoice-details-bill-to {
  display: flex;
  justify-content: space-between;
  margin-bottom: 30px;
}

.bill-to-section {
  flex: 1;
  border: 1px solid #ddd;
  padding: 10px;
  min-height: 100px;
  box-sizing: border-box;
  margin-right: 20px;
}
.bill-to-label {
  font-weight: bold;
  background-color: #eee;
  padding: 5px 0;
  margin-bottom: 5px;
  text-align: center;
}
.client-name, .client-contact {
  margin: 0;
  padding: 2px 5px;
  font-size: 0.95em;
}

.invoice-info-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 10px;
  box-sizing: border-box;
  margin-left: 20px;
}
.invoice-info-section .info-row {
  display: flex;
  justify-content: space-between;
  padding: 5px 0;
  border-bottom: 1px dashed #eee;
}
.invoice-info-section .info-row:last-child {
  border-bottom: none;
}
.info-label {
  font-weight: bold;
}
.info-value {
  text-align: right;
}

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
  vertical-align: top;
  font-size: 0.9em;
}
.invoice-items-table th {
  background-color: #eee;
  font-weight: bold;
  text-transform: uppercase;
}
.invoice-items-table .item-col { width: 5%; text-align: center; }
.invoice-items-table .description-col { width: 60%; }
.invoice-items-table .quantity-col { width: 10%; text-align: right; }
.invoice-items-table .total-col { width: 25%; text-align: right; }

.invoice-items-table .empty-row {
  height: 30px;
}

.invoice-items-table tfoot .total-row {
  font-weight: bold;
}
.invoice-items-table tfoot .total-label {
  text-align: right;
  padding-right: 15px;
}
.invoice-items-table tfoot .total-amount {
  font-size: 1.1em;
  background-color: #eee;
}

.notes-section {
  margin-top: 20px;
  border: 1px solid #000;
  padding: 10px;
  min-height: 80px;
  box-sizing: border-box;
}
.notes-label {
  font-weight: bold;
  margin-bottom: 5px;
}
.notes-content, .notes-preset {
  margin: 0 0 5px 0;
  font-size: 0.9em;
  line-height: 1.3;
}

.contact-footer {
  text-align: center;
  margin-top: 30px;
  font-size: 0.9em;
}
</style>