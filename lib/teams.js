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

// Section labels (e.g. "TOP" / "MID" / "BOT") live in column A, spanning
// down over however many team blocks belong to that section. A team
// belongs to whichever label sits at or above its header row.
function findSectionLabels(grid) {
  const labels = [];
  for (let r = 0; r < grid.length; r++) {
    const cell = (grid[r]?.[0] ?? '').toString().trim();
    if (cell) labels.push({ r, label: cell });
  }
  return labels;
}

// A dedicated label column (like Main War's TOP/MID/BOT) never doubles as a
// team's own column. If some team's header sits in column A, column A is
// actually that team's data (header + member names), not a label gutter —
// treat the sheet as having no section labels rather than misreading a
// team/member name in that column as one.
function getSectionLabels(grid, headers) {
  if (headers.some((h) => h.c === 0)) return [];
  return findSectionLabels(grid);
}

function sectionForRow(labels, row) {
  let found = null;
  for (const l of labels) {
    if (l.r > row) break;
    found = l;
  }
  return found;
}

// Guild rule: no team has more than 5 members.
const MAX_TEAM_SIZE = 5;

// A team's slot count is however many rows sit between its header and the
// next team header in the same column (or the end of the sheet), capped at
// MAX_TEAM_SIZE. The cap matters because sections (TOP/MID/BOT-style groups)
// reuse the same columns stacked vertically with blank separator rows in
// between — without the cap, a team's block would be read as reaching all
// the way down to the next section's header, swallowing those blank rows.
function blockSlotCount(headers, header, gridLength) {
  let blockEnd = gridLength;
  headers.forEach((other) => {
    if (other.c === header.c && other.r > header.r && other.r < blockEnd) blockEnd = other.r;
  });
  return Math.min(MAX_TEAM_SIZE, Math.max(1, blockEnd - header.r - 1));
}

// Polarity has no column-A section labels. Instead it has a "star room"
// (teams 1-10, highlighted red in the sheet) followed by a "normal room"
// whose team numbering restarts at 1 and is split into groups of however
// many teams fit per sheet row. The star->normal boundary is exactly where
// the team numbering resets back to 1, so that reset is what we detect —
// `headers` is index-aligned with `teams` (both built from the same map).
function applyPolaritySections(teams, headers) {
  let blockRow = null;
  let inNormalRoom = false;
  let normalGroup = 0;
  let roomOrder = 0;
  let sawATeam = false;
  teams.forEach((team, i) => {
    const row = headers[i].r;
    const num = parseInt(team.name.replace(/\D/g, ''), 10) || 0;
    if (row !== blockRow) {
      blockRow = row;
      if (inNormalRoom) {
        normalGroup += 1;
        roomOrder += 1;
      } else if (num === 1 && sawATeam) {
        inNormalRoom = true;
        normalGroup = 1;
        roomOrder += 1;
      }
    }
    team.section = inNormalRoom ? `ห้องปกติ กลุ่มที่ ${normalGroup}` : 'ห้องดาว';
    team.sectionRow = roomOrder;
    sawATeam = true;
  });
}

// A section (e.g. "TOP"/"MID"/"BOT", or "ตี้1"/"ตี้2"/"ตี้3") whose block
// has no TEAM headers under it yet (an empty shift) still gets a label from
// findSectionLabels but produces no entries in readTeams' team list — so
// callers that want to show every labeled section, even empty ones, need
// this separately.
export async function listSections(sheetTitle) {
  const grid = await getValues(quoteSheet(sheetTitle), 'UNFORMATTED_VALUE');
  const headers = findTeamHeaders(grid);
  return getSectionLabels(grid, headers).map((l) => l.label);
}

export async function readTeams(sheetTitle) {
  const grid = await getValues(quoteSheet(sheetTitle), 'UNFORMATTED_VALUE');
  const headers = findTeamHeaders(grid);
  const sectionLabels = getSectionLabels(grid, headers);

  const teams = headers.map((header) => {
    const slotCount = blockSlotCount(headers, header, grid.length);
    const members = [];
    for (let k = 1; k <= slotCount; k++) {
      const memberRow = grid[header.r + k];
      const name = memberRow ? (memberRow[header.c] ?? '').toString().trim() : '';
      if (!name) continue;
      const gearRaw = memberRow[header.c + 1];
      const gearStr = gearRaw === undefined || gearRaw === null ? '' : String(gearRaw).trim();
      // Number('') is 0, not NaN — an actually-blank cell must not read as a real 0 GEAR value.
      const gearNum = typeof gearRaw === 'number' ? gearRaw : (gearStr === '' ? NaN : Number(gearStr));
      members.push({ name, gear: Number.isFinite(gearNum) ? gearNum : null, slot: k });
    }
    const gearValues = members.map((m) => m.gear).filter((g) => g !== null);
    const total = gearValues.length ? gearValues.reduce((a, b) => a + b, 0) : null;
    const average = gearValues.length ? total / gearValues.length : null;
    const section = sectionForRow(sectionLabels, header.r);
    return {
      name: normalizeTeamName(header.cell),
      members,
      total,
      average,
      slotCount,
      section: section ? section.label : null,
      sectionRow: section ? section.r : -1,
    };
  });

  if (sheetTitle === 'Polarity') applyPolaritySections(teams, headers);

  teams.sort((a, b) => {
    if (a.sectionRow !== b.sectionRow) return a.sectionRow - b.sectionRow;
    return (parseInt(a.name.replace(/\D/g, ''), 10) || 0) - (parseInt(b.name.replace(/\D/g, ''), 10) || 0);
  });
  return teams.map(({ sectionRow, ...t }) => t);
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
