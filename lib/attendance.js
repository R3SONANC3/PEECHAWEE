import { getSheetTitles, getValues, setValues, clearValues, batchUpdate, quoteSheet, colLetter, invalidateSheetTitlesCache } from './googleSheets';
import { readTeams } from './teams';
import { withWriteLock } from './writeLock';

// Attendance used to be one combined sheet; now it's split into a tab per
// war so Main War and Sub War check-ins don't mix.
const LEGACY_ATTENDANCE_SHEET_NAME = 'เช็คชื่อกิลวอร์';
const WAR_SHEETS = {
  main: 'เช็คชื่อ MAIN WAR',
  sub: 'เช็คชื่อ SUB WAR',
};
// Each war's attendance list mirrors that war's own team-assignment sheet
// (only people actually playing that war), not the full guild roster.
const TEAM_SHEET_FOR_WAR = {
  main: 'Main-War',
  sub: 'SUB-WAR',
};

function sheetTitleForWar(war) {
  const title = WAR_SHEETS[war];
  if (!title) throw new Error('invalid war');
  return title;
}

// Auto-creates a war's attendance sheet the first time it's needed. The
// first "main" request migrates the old single combined sheet (from before
// attendance was split into tabs) by renaming it in place, so existing
// attendance history isn't silently orphaned — "sub" always starts fresh
// since it never had a sheet of its own before.
async function ensureAttendanceSheet(war, title) {
  const titles = await getSheetTitles();
  if (titles.some((t) => t.title === title)) return;

  const legacy = war === 'main' ? titles.find((t) => t.title === LEGACY_ATTENDANCE_SHEET_NAME) : null;
  if (legacy) {
    await batchUpdate([{ updateSheetProperties: { properties: { sheetId: legacy.sheetId, title }, fields: 'title' } }]);
  } else {
    await batchUpdate([{ addSheet: { properties: { title } } }]);
    await setValues(`${quoteSheet(title)}!A1`, [['ชื่อ']]);
  }
  invalidateSheetTitlesCache();
}

async function getAttendanceSheetProps(war) {
  const title = sheetTitleForWar(war);
  await ensureAttendanceSheet(war, title);
  const titles = await getSheetTitles();
  const props = titles.find((t) => t.title === title);
  if (!props) throw new Error('attendance sheet not found');
  return props;
}

async function readNames(title) {
  const rows = await getValues(`${quoteSheet(title)}!A2:A`);
  return rows.map((r) => (r[0] ?? '').toString().trim()).filter(Boolean);
}

// The name list (column A) is not maintained by hand here — it mirrors
// whoever's actually assigned to a team on that war's own team sheet (not
// the full guild roster, and not the other war's sheet). Names newly
// assigned to a team show up on the next load; names no longer assigned
// (and their recorded attendance) are dropped.
async function syncNamesFromTeamSheet(title, war) {
  const teams = await readTeams(TEAM_SHEET_FOR_WAR[war]);
  const seen = new Set();
  const teamNames = [];
  teams.forEach((team) => team.members.forEach((m) => {
    if (!seen.has(m.name)) { seen.add(m.name); teamNames.push(m.name); }
  }));

  const existingNames = await readNames(title);
  if (teamNames.length === existingNames.length && teamNames.every((n, i) => n === existingNames[i])) {
    return;
  }

  const header = await readDateHeaderRow(title);
  const numDateCols = Math.max(0, header.length - 1);
  const lastCol = colLetter(1 + numDateCols);

  const existingRows = existingNames.length
    ? await getValues(`${quoteSheet(title)}!A2:${lastCol}${existingNames.length + 1}`, 'UNFORMATTED_VALUE')
    : [];
  const rowByName = new Map(existingRows.map((row, i) => [existingNames[i], row.slice(1)]));

  const newRows = teamNames.map((name) => [name, ...(rowByName.get(name) || Array(numDateCols).fill(''))]);

  const clearRowCount = Math.max(existingNames.length, teamNames.length);
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

// Sheet cells store the Thai label directly (a dropdown via data
// validation, not a checkbox) so "absent" survives a reload — a plain
// boolean checkbox can only represent present/not-present and silently
// collapsed "absent" into "unmarked" on every reload.
const PRESENT_LABEL = 'มา';
const ABSENT_LABEL = 'ขาด';

function statusToCell(status) {
  if (status === 'present') return PRESENT_LABEL;
  if (status === 'absent') return ABSENT_LABEL;
  return '';
}
function cellToStatus(raw) {
  if (raw === PRESENT_LABEL) return 'present';
  if (raw === ABSENT_LABEL) return 'absent';
  // Backward-compat: date columns saved before this fix are still boolean
  // checkboxes (TRUE/FALSE) until the next time that date gets re-saved,
  // which upgrades the column's validation + values automatically.
  if (raw === true) return 'present';
  return null;
}

// Unlocked core — callers that already hold the 'attendance:<war>' write
// lock (saveAttendance) call this directly instead of the exported, locked
// getAttendanceForDate, to avoid deadlocking on their own lock.
async function readAttendance(war, dateLabel) {
  const { title } = await getAttendanceSheetProps(war);
  await syncNamesFromTeamSheet(title, war);
  const names = await readNames(title);
  const dates = await readDates(title);
  const attendance = {};

  const colIdx = dateLabel ? await findDateColumn(title, dateLabel) : -1;
  if (colIdx > -1 && names.length) {
    const col = colLetter(colIdx);
    const rows = await getValues(`${quoteSheet(title)}!${col}2:${col}${names.length + 1}`, 'UNFORMATTED_VALUE');
    names.forEach((name, i) => {
      const raw = rows[i] ? rows[i][0] : '';
      attendance[name] = cellToStatus(raw);
    });
  } else {
    names.forEach((name) => { attendance[name] = null; });
  }

  return { war, names, dates, date: dateLabel || '', attendance };
}

// Locked per war: syncNamesFromTeamSheet can itself clear+rewrite the whole
// sheet when the roster changed, so even this "read" can race a concurrent
// save — but Main War and Sub War sheets are independent, so they don't
// need to wait on each other's lock.
export async function getAttendanceForDate(war, dateLabel) {
  return withWriteLock(`attendance:${war}`, () => readAttendance(war, dateLabel));
}

export async function saveAttendance(war, dateLabel, records) {
  return withWriteLock(`attendance:${war}`, () => doSaveAttendance(war, dateLabel, records));
}

async function doSaveAttendance(war, dateLabel, records) {
  const { title, sheetId } = await getAttendanceSheetProps(war);
  await syncNamesFromTeamSheet(title, war);
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
          rule: {
            condition: { type: 'ONE_OF_LIST', values: [{ userEnteredValue: PRESENT_LABEL }, { userEnteredValue: ABSENT_LABEL }] },
            strict: true,
            showCustomUi: true,
          },
        },
      },
    ]);
    const col = colLetter(colIdx);
    const out = names.map((name) => [statusToCell(records && records[name])]);
    await setValues(`${quoteSheet(title)}!${col}2:${col}${names.length + 1}`, out);
  }

  return readAttendance(war, dateLabel);
}
