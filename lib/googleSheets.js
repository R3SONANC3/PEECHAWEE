import { google } from 'googleapis';

// ponytail: module-level cache, good enough for a single warm serverless instance;
// add a TTL if sheet structure starts changing between requests
let cachedTitles = null;

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY;
  if (!email || !key) throw new Error('MISSING_GOOGLE_CREDENTIALS');
  return new google.auth.JWT({
    email,
    key: key.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

function getSheetId() {
  const id = process.env.GOOGLE_SHEET_ID;
  if (!id) throw new Error('MISSING_GOOGLE_CREDENTIALS');
  return id;
}

function getClient() {
  return google.sheets({ version: 'v4', auth: getAuth() });
}

export function quoteSheet(name) {
  return `'${name.replace(/'/g, "''")}'`;
}

export function colLetter(n) {
  let s = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export async function getSheetTitles() {
  if (cachedTitles) return cachedTitles;
  const sheets = getClient();
  const res = await sheets.spreadsheets.get({
    spreadsheetId: getSheetId(),
    fields: 'sheets.properties',
  });
  cachedTitles = res.data.sheets.map((s) => s.properties);
  return cachedTitles;
}

// Call after adding/removing a sheet tab so the next getSheetTitles() call
// re-fetches instead of returning a stale list for the rest of this instance.
export function invalidateSheetTitlesCache() {
  cachedTitles = null;
}

export async function getValues(rangeA1, valueRenderOption = 'FORMATTED_VALUE') {
  const sheets = getClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSheetId(),
    range: rangeA1,
    valueRenderOption,
  });
  return res.data.values || [];
}

export async function setValues(rangeA1, values) {
  const sheets = getClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId: getSheetId(),
    range: rangeA1,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  });
}

export async function clearValues(rangeA1) {
  const sheets = getClient();
  await sheets.spreadsheets.values.clear({
    spreadsheetId: getSheetId(),
    range: rangeA1,
  });
}

export async function batchUpdate(requests) {
  const sheets = getClient();
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: getSheetId(),
    requestBody: { requests },
  });
}
