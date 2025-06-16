// app.js

const express = require('express');
const { google } = require('googleapis');

const app = express();
app.use(express.json());

const SPREADSHEET_ID = '1Re-vEcecRoKX0iHvGKkm5g1nl4CXdcZaqST2t214-f0';

// A helper function for authentication to keep the code clean
async function getAuthClient() {
  // Vercel-Specific Authentication
  const credentials = JSON.parse(process.env.GCP_CREDENTIALS_JSON);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return await auth.getClient();
}

/**
 * Reads all data from and appends a new row to every sheet in the spreadsheet.
 */
async function processAllSheets() {
  const authClient = await getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth: authClient });

  // 1. DISCOVER: Get metadata about the spreadsheet, including all its sheets (tabs)
  console.log('Fetching all sheet names...');
  const spreadsheetInfo = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
  });

  const allSheets = spreadsheetInfo.data.sheets;
  if (!allSheets || allSheets.length === 0) {
    console.log('No sheets found in this spreadsheet.');
    return [];
  }

  const processingSummary = [];

  // 2. LOOP & PROCESS: Go through each sheet one by one
  for (const sheet of allSheets) {
    const sheetName = sheet.properties.title;
    console.log(`--- Processing sheet: "${sheetName}" ---`);

    // --- READING ---
    // To read all data from a sheet, you just use its name as the range!
    const readResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: sheetName,
    });
    const data = readResponse.data.values || []; // Use empty array if sheet is empty
    console.log(`Found ${data.length} rows of data.`);


    // --- WRITING (Appending a new row) ---
    const timestamp = new Date().toLocaleString('en-US', { timeZone: 'Asia/Makassar' }); // Current time in your location
    const newRow = [[`Processed on ${timestamp}`, 'OK']];
    
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: sheetName, // Append to the current sheet in the loop
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: newRow,
      },
    });
    console.log('Appended a new log row.');

    processingSummary.push({ sheet: sheetName, rowsFound: data.length });
  }

  return processingSummary;
}


// --- New API Endpoint ---
app.get('/process-all', async (req, res) => {
  try {
    const summary = await processAllSheets();
    res.status(200).json({
      message: 'Successfully processed all sheets.',
      summary: summary,
    });
  } catch (error) {
    console.error('Error processing all sheets:', error.message);
    res.status(500).send('Internal Server Error');
  }
});


// Your previous endpoint can also be here
// app.post('/add-invoice', ...);


// Export the app for Vercel
module.exports = app;