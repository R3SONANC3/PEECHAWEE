import { getSheetTitles, getValues, setValues, quoteSheet, colLetter } from './googleSheets';

const NON_TEAM_SHEET_NAMES = ['เช็คชื่อกิลวอร์'];

// Any tab that isn't the roster (first tab) or the attendance sheet counts as
// a team sheet — so adding a new War/Polarity-style tab to the spreadsheet
// makes it show up here automatically, no code change needed.
export async function listTeamSheetTitles() {
  const titles = await getSheetTitles();
  const sorted = [...titles].sort((a, b) => a.index - b.index);
  const rosterTitle = sorted[0]?.title;
  const attendanceTitle =
    sorted.find((t) => NON_TEAM_SHEET_NAMES.includes(t.title))?.title || sorted[1]?.title;

  return sorted
    .filter((t) => t.title !== rosterTitle && t.title !== attendanceTitle)
    .map((t) => t.title);
}

function normalizeTeamName(raw) {
  return raw.toString().trim().toUpperCase().replace(/\s+/g, '');
}

function findTeamHeaders(grid) {
  const headers = [];
  for (let r = 0; r < grid.length; r++) {
    const row = grid[r] || [];
    for (let c = 0; c < row.length; c++) {
      const cell = (row[c] ?? '').toString().trim();
      if (/^TEAM\s*\d+$/i.test(cell)) headers.push({ r, c, cell });
    }
  }
  return headers;
}

// A team's slot count is however many rows sit between its header and the
// next team header in the same column (or the end of the sheet) — so a
// block reserved for 5 members reads as 5, a block reserved for 8 reads as
// 8, and editing never writes past that boundary into another team's rows.
function blockSlotCount(headers, header, gridLength) {
  let blockEnd = gridLength;
  headers.forEach((other) => {
    if (other.c === header.c && other.r > header.r && other.r < blockEnd) blockEnd = other.r;
  });
  return Math.max(1, blockEnd - header.r - 1);
}

export async function readTeams(sheetTitle) {
  const grid = await getValues(quoteSheet(sheetTitle), 'UNFORMATTED_VALUE');
  const headers = findTeamHeaders(grid);

  const teams = headers.map((header) => {
    const slotCount = blockSlotCount(headers, header, grid.length);
    const members = [];
    for (let k = 1; k <= slotCount; k++) {
      const memberRow = grid[header.r + k];
      const name = memberRow ? (memberRow[header.c] ?? '').toString().trim() : '';
      if (!name) continue;
      const gearRaw = memberRow[header.c + 1];
      const gearNum = typeof gearRaw === 'number' ? gearRaw : Number(gearRaw);
      members.push({ name, gear: Number.isFinite(gearNum) ? gearNum : null, slot: k });
    }
    const gearValues = members.map((m) => m.gear).filter((g) => g !== null);
    const average = gearValues.length ? gearValues.reduce((a, b) => a + b, 0) / gearValues.length : null;
    return { name: normalizeTeamName(header.cell), members, average, slotCount };
  });

  teams.sort((a, b) => (parseInt(a.name.replace(/\D/g, ''), 10) || 0) - (parseInt(b.name.replace(/\D/g, ''), 10) || 0));
  return teams;
}

export async function updateTeamSlot(sheetTitle, teamName, slot, name, gear) {
  const grid = await getValues(quoteSheet(sheetTitle), 'UNFORMATTED_VALUE');
  const headers = findTeamHeaders(grid);
  const header = headers.find((h) => normalizeTeamName(h.cell) === teamName);
  if (!header) throw new Error('team not found');

  const slotCount = blockSlotCount(headers, header, grid.length);
  const slotNum = Number(slot);
  if (!Number.isInteger(slotNum) || slotNum < 1 || slotNum > slotCount) {
    throw new Error('slot out of range for this team');
  }

  const targetRow = header.r + slotNum + 1; // grid is 0-based; header row + slot offset
  const nameCol = colLetter(header.c + 1);
  const gearCol = colLetter(header.c + 2);
  const trimmedName = (name || '').toString().trim();
  const gearValue = gear === '' || gear === null || gear === undefined ? '' : Number(gear);

  await setValues(`${quoteSheet(sheetTitle)}!${nameCol}${targetRow}:${gearCol}${targetRow}`, [
    [trimmedName, gearValue === '' ? '' : gearValue],
  ]);

  return readTeams(sheetTitle);
}
