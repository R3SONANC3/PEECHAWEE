import { getSheetTitles, getValues, setValues, clearValues, batchUpdate, quoteSheet, colLetter } from './googleSheets';
import { readRoster } from './roster';

const ATTENDANCE_SHEET_NAME = 'เช็คชื่อกิลวอร์';

async function getAttendanceSheetProps() {
  const titles = await getSheetTitles();
  const found = titles.find((t) => t.title === ATTENDANCE_SHEET_NAME);
  const props = found || titles[1];
  if (!props) throw new Error('attendance sheet not found');
  return props;
}

async function readNames(title) {
  const rows = await getValues(`${quoteSheet(title)}!A2:A`);
  return rows.map((r) => (r[0] ?? '').toString().trim()).filter(Boolean);
}

// The name list (column A) is not maintained by hand here — it mirrors the
// Players roster. Names added to the roster show up on the next load; names
// removed from the roster (and their recorded attendance) are dropped.
async function syncNamesFromRoster(title) {
  const rosterMap = await readRoster();
  const rosterNames = Object.values(rosterMap).flat();
  const existingNames = await readNames(title);
  if (rosterNames.length === existingNames.length && rosterNames.every((n, i) => n === existingNames[i])) {
    return;
  }

  const header = await readDateHeaderRow(title);
  const numDateCols = Math.max(0, header.length - 1);
  const lastCol = colLetter(1 + numDateCols);

  const existingRows = existingNames.length
    ? await getValues(`${quoteSheet(title)}!A2:${lastCol}${existingNames.length + 1}`, 'UNFORMATTED_VALUE')
    : [];
  const rowByName = new Map(existingRows.map((row, i) => [existingNames[i], row.slice(1)]));

  const newRows = rosterNames.map((name) => [name, ...(rowByName.get(name) || Array(numDateCols).fill(''))]);

  const clearRowCount = Math.max(existingNames.length, rosterNames.length);
  if (clearRowCount) await clearValues(`${quoteSheet(title)}!A2:${lastCol}${clearRowCount + 1}`);
  if (newRows.length) await setValues(`${quoteSheet(title)}!A2:${lastCol}${newRows.length + 1}`, newRows);
}

async function readDateHeaderRow(title) {
  const rows = await getValues(`${quoteSheet(title)}!A1:ZZ1`);
  return rows[0] || [];
}

async function readDates(title) {
  const header = await readDateHeaderRow(title);
  return header.slice(1).map((v) => (v ?? '').toString().trim()).filter(Boolean);
}

async function findDateColumn(title, dateLabel) {
  const header = await readDateHeaderRow(title);
  for (let i = 1; i < header.length; i++) {
    if ((header[i] ?? '').toString().trim() === dateLabel) return i + 1; // 1-based column number
  }
  return -1;
}

export async function getAttendanceForDate(dateLabel) {
  const { title } = await getAttendanceSheetProps();
  await syncNamesFromRoster(title);
  const names = await readNames(title);
  const dates = await readDates(title);
  const attendance = {};

  const colIdx = dateLabel ? await findDateColumn(title, dateLabel) : -1;
  if (colIdx > -1 && names.length) {
    const col = colLetter(colIdx);
    const rows = await getValues(`${quoteSheet(title)}!${col}2:${col}${names.length + 1}`, 'UNFORMATTED_VALUE');
    names.forEach((name, i) => {
      const raw = rows[i] ? rows[i][0] : '';
      attendance[name] = raw === true ? 'present' : null;
    });
  } else {
    names.forEach((name) => { attendance[name] = null; });
  }

  return { names, dates, date: dateLabel || '', attendance };
}

export async function saveAttendance(dateLabel, records) {
  const { title, sheetId } = await getAttendanceSheetProps();
  await syncNamesFromRoster(title);
  const names = await readNames(title);
  let colIdx = await findDateColumn(title, dateLabel);

  if (colIdx === -1) {
    const header = await readDateHeaderRow(title);
    colIdx = Math.max(header.length + 1, 2);
    const col = colLetter(colIdx);
    await setValues(`${quoteSheet(title)}!${col}1`, [[dateLabel]]);
    // ponytail: sets number format + bold only, doesn't copy the previous date
    // column's full cell style (fill/borders) like the old Apps Script version did —
    // upgrade to a copyTo-style batchUpdate if header styling needs to match exactly
    await batchUpdate([
      {
        repeatCell: {
          range: {
            sheetId,
            startRowIndex: 0,
            endRowIndex: 1,
            startColumnIndex: colIdx - 1,
            endColumnIndex: colIdx,
          },
          cell: {
            userEnteredFormat: {
              numberFormat: { type: 'DATE', pattern: 'M/d/yyyy' },
              textFormat: { bold: true },
            },
          },
          fields: 'userEnteredFormat(numberFormat,textFormat)',
        },
      },
    ]);
  }

  if (names.length) {
    await batchUpdate([
      {
        setDataValidation: {
          range: {
            sheetId,
            startRowIndex: 1,
            endRowIndex: 1 + names.length,
            startColumnIndex: colIdx - 1,
            endColumnIndex: colIdx,
          },
          rule: { condition: { type: 'BOOLEAN' }, strict: true },
        },
      },
    ]);
    const col = colLetter(colIdx);
    const out = names.map((name) => [Boolean(records && records[name] === 'present')]);
    await setValues(`${quoteSheet(title)}!${col}2:${col}${names.length + 1}`, out);
  }

  return getAttendanceForDate(dateLabel);
}
