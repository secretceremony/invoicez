<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useInvoiceStore } from '@/stores/invoice';
import { useClientStore } from '@/stores/client';
import { useArtistStore } from '@/stores/artist';
import { formatRupiah } from '@/utils/formatCurrency';

// PDF generation libraries
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Import logos (assuming they are in src/assets)
// You need to place your actual logo files here, e.g., src/assets/kmitk_logo.png
// Make sure these paths are correct for your project!
import kmitkLogo from '@/assets/kmitk_logo.png';
import folksLogo from '@/assets/folks_logo.png';

// --- CONSOLE LOG FOR DEBUGGING (can remove in production) ---
console.log('InvoiceDetails.vue script setup started.');
// --- END CONSOLE LOG ---

const route = useRoute();
const router = useRouter();
const invoiceStore = useInvoiceStore();
const clientStore = useClientStore();
const artistStore = useArtistStore();

const invoice = ref(null);
const client = ref(null); // Will store the full client object
const artist = ref(null); // Will store the full artist object
const loading = ref(true);
const error = ref(null);

const invoiceId = computed(() => route.params.id);

// Function to navigate to the edit invoice page
const editInvoice = (id) => {
  router.push({ name: 'edit-invoice', params: { id } });
};

// --- onMounted: Fetches data when component loads ---
onMounted(async () => {
  // --- CONSOLE LOG FOR DEBUGGING ---
  console.log('InvoiceDetails.vue onMounted hook fired.');
  console.log('Current invoiceId from route:', invoiceId.value);
  // --- END CONSOLE LOG ---

  if (!invoiceId.value) {
    console.log('No invoice ID found in route params. Redirecting to invoice list.');
    router.push({ name: 'invoice-list' });
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    // Ensure clients and artists are loaded for lookup
    // Only fetch if stores are empty to avoid unnecessary API calls
    if (clientStore.clients.length === 0) {
      await clientStore.fetchClients();
    }
    if (artistStore.artists.length === 0) {
      await artistStore.fetchArtists();
    }

    // --- CONSOLE LOG FOR DEBUGGING ---
    console.log('Attempting to fetch invoice with ID:', invoiceId.value);
    // --- END CONSOLE LOG ---

    const fetchedInvoice = await invoiceStore.fetchInvoiceById(invoiceId.value);
    
    // --- DEBUGGING: Check what we actually received ---
    console.log('Raw response from fetchInvoiceById:', fetchedInvoice);
    console.log('Type of fetchedInvoice:', typeof fetchedInvoice);
    console.log('Is fetchedInvoice a string?', typeof fetchedInvoice === 'string');
    
    // Validate fetched data: If it's a string (likely HTML error) or null/undefined
    if (typeof fetchedInvoice === 'string' || !fetchedInvoice) {
      const errorMessage = 'API returned invalid data (HTML or empty) instead of JSON. Check your API endpoint and ensure your backend server is running.';
      console.error(errorMessage, fetchedInvoice ? fetchedInvoice.substring(0, 200) + '...' : '');
      throw new Error(errorMessage);
    }
    
    // If data is a valid object, process it
    if (typeof fetchedInvoice === 'object') {
      // Safely parse numeric fields from potential strings into numbers
      const processedInvoice = {
        ...fetchedInvoice,
        Subtotal: parseFloat(fetchedInvoice.Subtotal || 0),
        DownPaymentAmount: parseFloat(fetchedInvoice.DownPaymentAmount || 0),
        TotalDue: parseFloat(fetchedInvoice.TotalDue || 0),
      };

      // Process invoice items similarly (Category is NOT expected here anymore)
      if (fetchedInvoice.items && Array.isArray(fetchedInvoice.items)) {
        processedInvoice.items = fetchedInvoice.items.map(item => ({
          ...item,
          Quantity: parseFloat(item.Quantity || 0),
          UnitPrice: parseFloat(item.UnitPrice || 0),
          LineTotal: parseFloat(item.LineTotal || 0),
          // Category is removed from invoice item properties
        }));
      } else {
        processedInvoice.items = []; // Ensure items is an array even if not present
      }
      
      invoice.value = processedInvoice;

      // Lookup client and artist full objects by their IDs
      client.value = clientStore.clients.find(c => c.ID === invoice.value.ClientID) || null;
      artist.value = artistStore.artists.find(a => a.ID === invoice.value.ArtistID) || null;

      // --- CONSOLE LOGS FOR DEBUGGING ---
      console.log('--- Invoice Details Component State ---');
      console.log('Raw fetchedInvoice (before parseFloat):', fetchedInvoice); // What was received from the store
      console.log('Processed invoice.value (after parseFloat):', invoice.value); // What's now in component state
      console.log('Type of invoice.value.Subtotal:', typeof invoice.value.Subtotal, 'Value:', invoice.value.Subtotal);
      console.log('Type of invoice.value.TotalDue:', typeof invoice.value.TotalDue, 'Value:', invoice.value.TotalDue);
      
      // ******* NEW DEBUGGING LOGS FOR ITEMS AND DESCRIPTION *******
      console.log('Invoice items array:', invoice.value.items);
      if (invoice.value.items && invoice.value.items.length > 0) {
        invoice.value.items.forEach((item, idx) => {
          console.log(`Item ${idx + 1}:`);
          console.log(`  Description: '${item.Description}' (Type: ${typeof item.Description})`);
          console.log(`  Quantity: ${item.Quantity} (Type: ${typeof item.Quantity})`);
          console.log(`  UnitPrice: ${item.UnitPrice} (Type: ${typeof item.UnitPrice})`);
          console.log(`  LineTotal: ${item.LineTotal} (Type: ${typeof item.LineTotal})`);
        });
      }
      // ******* END NEW DEBUGGING LOGS *******

      console.log('--- End Invoice Details Component State ---');
      // --- END CONSOLE LOGS ---

    } else {
      // If fetchedInvoice is not an object (e.g., empty array or non-truthy)
      error.value = 'Invoice not found.';
      console.log('Invoice not found for ID:', invoiceId.value);
    }
  } catch (err) {
    // Catch any errors during fetching or processing
    error.value = err.message || 'Failed to load invoice details.';
    console.error('Error in InvoiceDetails onMounted:', err);
    
    // Provide specific troubleshooting tips for API issues
    if (err.message && err.message.includes('HTML instead of JSON')) {
      console.error('This usually means:');
      console.error('1. Your API server is not running');
      console.error('2. The API endpoint URL is incorrect');
      console.error('3. There\'s a CORS issue');
      console.error('4. Your API is returning an error page instead of JSON');
    }
  } finally {
    loading.value = false; // Always set loading to false in finally block
  }
});

// --- PDF Generation Logic ---
const generatePdf = async () => {
  // Ensure invoice data is loaded before attempting PDF generation
  if (!invoice.value) {
    // Replaced alert with console log and return, as alerts are discouraged in Canvas
    console.error('Invoice data not loaded yet. Cannot generate PDF.');
    return;
  }

  // Target the specific HTML element to be converted to PDF
  const invoiceContent = document.getElementById('invoice-content-printable');

  // Temporarily apply styles for consistent PDF appearance
  const originalBackground = invoiceContent.style.background;
  const originalPadding = invoiceContent.style.padding;
  invoiceContent.style.background = 'white';
  invoiceContent.style.padding = '20mm'; // Use millimeters for precise PDF padding


  const canvas = await html2canvas(invoiceContent, {
    scale: 2, // Increase scale for better resolution in the PDF
    useCORS: true, // Important if your logos are from external sources
    logging: true, // Enable logging for debugging html2canvas issues
    backgroundColor: '#FFFFFF' // Ensure a white background
  });

  // Reset original styles after canvas capture
  invoiceContent.style.background = originalBackground;
  invoiceContent.style.padding = originalPadding;


  const imgData = canvas.toDataURL('image/png');
  // Initialize jsPDF with portrait orientation, millimeters unit, and A4 size
  const pdf = new jsPDF('p', 'mm', 'a4');
  const imgWidth = 210; // A4 width in mm
  const pageHeight = 297; // A4 height in mm
  const imgHeight = (canvas.height * imgWidth) / canvas.width; // Calculate image height to maintain aspect ratio
  let heightLeft = imgHeight; // Remaining height to be added to PDF

  let position = 0; // Y-position on the PDF page

  // Add the first page
  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  // Add more pages if content overflows
  while (heightLeft >= -10) { // -10 provides a small buffer for residual content
    position = heightLeft - imgHeight; // Calculate position for the next page
    pdf.addPage(); // Add a new page
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight); // Add the image
    heightLeft -= pageHeight; // Subtract page height from remaining content
  }

  // Save the generated PDF file
  pdf.save(`invoice_${invoice.value.ID}.pdf`);
};

// --- Computed properties for dynamic content in template ---

// Determines if the items section should be displayed (for Art Commission/Custom Merch)
const showItemsSection = computed(() =>
  invoice.value && ['Art Commission', 'Custom Merch'].includes(invoice.value.InvoiceType)
);

// Calculates the number of empty rows needed to fill the invoice table visually
const maxItems = 10; // As seen in the design template
const emptyRowsCount = computed(() => {
    if (!invoice.value || !invoice.value.items) return maxItems;
    return Math.max(0, maxItems - invoice.value.items.length);
});

// Formats the invoice date to DD/MM/YYYY
const formatInvoiceDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        console.warn('Invalid date string provided to formatInvoiceDate:', dateString);
        return 'Invalid Date';
      }
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (e) {
      console.error('Error formatting date:', e);
      return 'Error Date';
    }
};

// Determines the content of the "Notes" section based on invoice type
const dynamicNotesContent = computed(() => {
  if (!invoice.value) return '';

  if (invoice.value.InvoiceType === 'Artist Check') {
    return `
      Terima kasih atas kontribusinya dalam proyek ini.<br />
      Pembayaran telah diterima sesuai kesepakatan.<br />
      Harap simpan invoice ini sebagai bukti transaksi.
    `;
  } else {
    // For 'Art Commission' and 'Custom Merch'
    return `
      Silakan lakukan pembayaran melalui:<br />
      082255403036 (DANA) - ANSELLMA TITA P P<br />
      1807517027 (BNI) - ANSELLMA TITA P P
    `;
  }
});

// Determines the label for the 'For artists'/'For Commissioner/Customer' section
const dynamicForLabel = computed(() => {
  if (!invoice.value) return '';

  if (invoice.value.InvoiceType === 'Artist Check') {
    return 'For artists';
  } else {
    return 'For Commissioner/Customer';
  }
});

// Determines the label for the "BILL TO" / "PAY TO" section
const billToLabel = computed(() => {
  if (!invoice.value) return 'BILL TO';
  return invoice.value.InvoiceType === 'Artist Check' ? 'PAY TO' : 'BILL TO';
});

// Determines the name to display in the "BILL TO" / "PAY TO" section
const billToName = computed(() => {
  if (!invoice.value) return 'N/A';
  if (invoice.value.InvoiceType === 'Artist Check' && artist.value) {
    return artist.value.Name;
  } else if (client.value) { // For other invoice types, use client name
    return client.value.Name;
  }
  return 'N/A'; // Fallback if no matching client/artist found
});

// Determines the contact information to display in the "BILL TO" / "PAY TO" section
const billToContact = computed(() => {
  if (!invoice.value) return 'N/A';
  if (invoice.value.InvoiceType === 'Artist Check' && artist.value) {
    // Display artist's contact or other relevant info (NIM, Role)
    return artist.value.Contact || artist.value.NIM || artist.value.Role || 'No contact info provided';
  } else if (client.value) { // For other invoice types, use client contact
    return client.value.Contact;
  }
  return 'N/A'; // Fallback
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
              <!-- Updated line with nullish coalescing operator for robustness -->
              <td class="description-col">{{ item.Description ?? '' }}</td>
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
              <td colspan="3" class="text-right total-label">Total</td> <td class="total-amount">{{ formatRupiah(invoice.TotalDue) }}</td>
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
/* GENERAL STYLES FOR INVOICE TEMPLATE */
.invoice-template {
  font-family: Arial, sans-serif;
  color: #333;
  line-height: 1.4;
  max-width: 800px;
  margin: 0 auto;
  box-sizing: border-box;
}

/* HEADER SECTION */
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

/* MAIN TITLES SECTION */
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

/* INVOICE DETAILS & BILL TO SECTION */
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

/* ITEMS TABLE SECTION */
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
/* Adjust column widths in CSS for the removed Category column */
.invoice-items-table .item-col { width: 5%; text-align: center; }
.invoice-items-table .description-col { width: 60%; }
.invoice-items-table .quantity-col { width: 10%; text-align: right; }
/* .invoice-items-table .category-col { width: 15%; text-align: left; } REMOVED */
.invoice-items-table .total-col { width: 25%; text-align: right; }


/* Styling for empty rows in table */
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

/* NOTES SECTION */
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

/* CONTACT/FOOTER SECTION */
.contact-footer {
  text-align: center;
  margin-top: 30px;
  font-size: 0.9em;
}
</style>