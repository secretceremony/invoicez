# Invoicez - Invoice Management System

**Important Note on Usage:** This repository and its contents are intended for personal use only. If you find this project useful and wish to adapt or be inspired by its concepts, design, or code for your own work, you must credit the original author, `secretceremony`, and create your own implementation from scratch. Direct copying or unauthorized distribution is not permitted.

## Features

* **Client Management:** Add, view, edit, and delete client information.
* **Artist Management:** Add, view, edit, and delete artist profiles.
* **Product & Service Catalog:** Maintain a master list of products and services with descriptions, unit prices, and categories, which can be used to populate invoice items.
* **Invoice Creation & Management:**
    * Create new invoices for "Artist Check," "Art Commission," or "Custom Merch."
    * Automatically generate unique invoice IDs (e.g., `FOLKS/COMM/06/001`) based on type, month, and a sequential number.
    * Add multiple items to "Art Commission" and "Custom Merch" invoices with quantity, unit price, and calculated line totals.
    * Track subtotal, down payment, and total due amounts.
    * Manage invoice statuses (Draft, Sent, Paid, Partially Paid, Cancelled).
    * Add notes to invoices.
* **Invoice Details & PDF Export:**
    * View detailed information for individual invoices.
    * Generate and download professional PDF invoices using `html2canvas` and `jspdf`.
* **Responsive User Interface:** Built with Vuetify for a consistent and responsive design.

## Technologies Used

### Frontend

* **Vue.js 3:** Progressive JavaScript framework for building user interfaces.
* **Pinia:** Intuitive state management library for Vue.js.
* **Vue Router 4:** Official router for Vue.js.
* **Vuetify 3:** Vue UI Library with a Material Design component framework.
* **Vite:** Fast development build tool.
* **html2canvas:** Library to take screenshots of web pages or parts of them.
* **jsPDF:** Library to generate PDFs in JavaScript.
* **Axios:** Promise-based HTTP client for the browser and Node.js.

### Backend

* **Node.js:** JavaScript runtime environment.
* **Express.js:** Fast, unopinionated, minimalist web framework for Node.js.
* **Google Sheets API (`googleapis`, `google-auth-library`):** Used for reading, writing, and updating data in Google Sheets, which serves as the database for the application.
* **`dotenv`:** Loads environment variables from a `.env` file.
* **`cors`:** Middleware to enable Cross-Origin Resource Sharing.
* **`uuid`:** For generating unique IDs (e.g., for clients, artists, and individual invoice items).

### Database

* **Google Sheets:** Utilized as a simple, accessible database for storing application data (Clients, Artists, Products and Services, Invoices, and Invoice Items).

## Project Structure

The repository is divided into two main directories:

* **`backend/`**: Contains the Node.js Express server that interacts with the Google Sheets API.
* **`frontend/`**: Contains the Vue.js 3 application that provides the user interface.

## Setup Instructions

### Notes!
Before starting the setup, you must install these first
* **`Git`**: https://git-scm.com/downloads
* **`Node.JS`**: https://nodejs.org/en (when install, don't check the additional stuff such as chocolatey!)

To get the Invoicez application up and running on your local machine, follow these steps:

### 1. Clone the Repository

```bash
git clone https://github.com/secretceremony/invoicez
cd invoicez
```

### 2. Google Sheets API Setup

The backend uses a Google Service Account to access your Google Sheet.

1.  **Create a Google Service Account:**
    * Go to the [Google Cloud Console](https://console.cloud.google.com/).
    * Create a new project or select an existing one.
    * Navigate to "APIs & Services" > "Credentials."
    * Click "Create Credentials" > "Service account."
    * Follow the steps to create a new service account. Grant it the "Google Sheets API Editor" role or a custom role with equivalent permissions to read and write to Google Sheets.
    * After creation, click on the service account email, then go to the "Keys" tab, click "Add Key" > "Create new key," and select "JSON." This will download a JSON key file.
    * **Place this JSON file** in the `backend/` directory of your project.

2.  **Share your Google Sheet with the Service Account:**
    * Create a new Google Sheet that will store your invoice data. You'll need separate tabs (sheets) named `Clients`, `Artists`, `ProductsAndServices`, `Invoices`, and `InvoiceItems`.
    * The first row of each sheet should contain the headers as expected by the backend:
        * **Clients**: `ID`, `Name`, `Contact`
        * **Artists**: `ID`, `Name`, `NIM`, `Role`, `Contact`
        * **ProductsAndServices**: `ID`, `Name`, `Description`, `UnitPrice`, `Category`
        * **Invoices**: `ID`, `InvoiceType`, `Date`, `ClientID`, `ArtistID`, `Subtotal`, `DownPaymentAmount`, `TotalDue`, `Status`, `Notes`
        * **InvoiceItems**: `ID`, `InvoiceID`, `Description`, `Quantity`, `UnitPrice`, `LineTotal`, `PurchaseLocation` 
    * **Share this Google Sheet** with the email address of your newly created service account (e.g., `your-service-account-email@your-project-id.iam.gserviceaccount.com`). Grant it "Editor" access.

3.  **Configure Environment Variables:**
    * In the `backend/` directory, create a file named `.env`.
    * Add the following variables to it, replacing the placeholders with your actual Spreadsheet ID and service account key file path:

    ```env
    PORT=3000
    SPREADSHEET_ID=YOUR_GOOGLE_SHEET_ID_HERE
    SERVICE_ACCOUNT_KEY_PATH=./thermal-origin-462809-t2-3ab93a986931.json
    ```
    * **Note:** The `SERVICE_ACCOUNT_KEY_PATH` should be relative to the `backend/` directory.

### 3. Install Dependencies

Navigate to both the `backend/` and `frontend/` directories and install their respective dependencies:

```bash
# For the backend
cd backend
npm install

# For the frontend
cd frontend
npm install
```

### 4. Run the Application

#### Start the Backend Server

Navigate back to the `backend/` directory and start the server:

```bash
cd backend/
node server.js
# You should see: Backend server running on port 3000
# Access at http://localhost:3000
```

The backend server will listen on `http://localhost:3000`.

#### Start the Frontend Application

Open a new terminal, navigate to the `frontend/` directory, and start the development server:

```bash
cd frontend/
npm run dev
# You should see output similar to:
# VITE v6.x.x ready in Xms
# ➜ Local: http://localhost:5173/
```

The frontend application will typically run on `http://localhost:5173`.

### 5. Access the Application

Open your web browser and go to `http://localhost:5173` to access the Invoice Manager.

### (Optional) Access both applications at the same time

you can use `.bat` file for local developing. you only need these files with this code onto your folder and you can make a shortcut to the main `.bat` file

main.bat
```bash
@echo off
start frontend.bat
start backend.bat
```

frontend.bat
```bash
cd C:\Users\(your PC username)\invoicez\frontend
npm run dev
```

backend.bat
```bash
cd C:\Users\(your PC username)\invoicez\backend
node server.js
```

## Important Notes & Troubleshooting

* **CORS Issues:** If you encounter CORS (Cross-Origin Resource Sharing) errors, ensure your backend's `cors` middleware is correctly configured to allow requests from your frontend's origin (`http://localhost:5173`).
* **Google Sheets API Errors:** If the application fails to fetch or save data, check the backend console for errors related to the Google Sheets API. Common issues include incorrect `SPREADSHEET_ID`, `SERVICE_ACCOUNT_KEY_PATH`, or the service account not having sufficient permissions or not being shared with the Google Sheet.
* **Invoice Item Catalog:** The current `itemCatalog.js` in the frontend attempts to derive a master list of items from existing invoices, which can be inefficient. For a large number of invoice items, it is recommended to add a dedicated backend endpoint (e.g., `/api/all-invoice-items`) that directly reads all entries from the `InvoiceItems` sheet.
* **Security:** The `SERVICE_ACCOUNT_KEY_PATH` in the `.env` file and the JSON key file itself should be kept strictly confidential and never committed to public repositories. ~~The `.gitignore` files are configured to prevent this.~~ for now we are still figuring out how to use the key without uploading `.json` file. the best way is by using Github Actions Workflow, OICD, and GCP Workload Identity Federation (read here: https://github.com/google-github-actions/auth)
* **PDF Generation:** The PDF generation relies on `html2canvas` and `jspdf`. Complex CSS layouts might sometimes render imperfectly in the PDF. Adjustments to CSS or `html2canvas` options (like `scale`) might be necessary for optimal output.

## Reporting Issues or Suggestions:

If you encounter any errors, bugs, or have suggestions for improvements, please feel free to contact `secretceremony` and `ShiroTenma` or submit a fork suggestion.
