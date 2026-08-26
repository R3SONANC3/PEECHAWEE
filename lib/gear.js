import { getSheetTitles, getValues, setValues, batchUpdate, quoteSheet, invalidateSheetTitlesCache } from './googleSheets';
import { listTeamSheetTitles, readTeams } from './teams';

const GEAR_SHEET_NAME = 'Gear';

// One-time bootstrap: a player's GEAR used to be typed separately into every
// team sheet they were assigned to, so the same name could carry different
// values in different sheets. Scanning sheets in nav order (top to bottom
// within each) and letting later values win gives one value per name.
async function migrateFromTeamSheets() {
  const titles = await listTeamSheetTitles();
  const map = {};
  for (const title of titles) {
    const teams = await readTeams(title);
    teams.forEach((team) => {
      team.members.forEach((m) => {
        if (m.gear !== null) map[m.name] = m.gear;
      });
    });
  }
  return map;
}

// ponytail: no lock around sheet creation — a rare double-click on the very
// first request after deploy could race and error; retrying fixes it.
async function ensureGearSheet() {
  const titles = await getSheetTitles();
  if (titles.some((t) => t.title === GEAR_SHEET_NAME)) return;

  await batchUpdate([{ addSheet: { properties: { title: GEAR_SHEET_NAME } } }]);
  invalidateSheetTitlesCache();

  const migrated = await migrateFromTeamSheets();
  const values = [['ชื่อ', 'GEAR'], ...Object.entries(migrated)];
  await setValues(`${quoteSheet(GEAR_SHEET_NAME)}!A1:B${values.length}`, values);
}

export async function readGearMap() {
  await ensureGearSheet();
  const rows = await getValues(`${quoteSheet(GEAR_SHEET_NAME)}!A2:B`);
  const map = {};
  rows.forEach((row) => {
    const name = (row[0] ?? '').toString().trim();
    const gearNum = Number(row[1]);
    if (name && Number.isFinite(gearNum)) map[name] = gearNum;
  });
  return map;
}

export async function setGear(name, gear) {
  const trimmed = (name || '').toString().trim();
  if (!trimmed) return;
  await ensureGearSheet();

  const rows = await getValues(`${quoteSheet(GEAR_SHEET_NAME)}!A2:A`);
  const idx = rows.findIndex((row) => (row[0] ?? '').toString().trim() === trimmed);
  const row = idx === -1 ? rows.length + 2 : idx + 2;
  const gearValue = gear === '' || gear === null || gear === undefined ? '' : Number(gear);
  await setValues(`${quoteSheet(GEAR_SHEET_NAME)}!A${row}:B${row}`, [[trimmed, gearValue]]);
}

// Overlays each member's GEAR from the central map (recomputing team totals)
// so every page shows the same value for a given name, regardless of which
// team sheet it's rendering.
export function applyGearMap(teams, gearMap) {
  return teams.map((team) => {
    const members = team.members.map((m) => ({ ...m, gear: gearMap[m.name] ?? null }));
    const gearValues = members.map((m) => m.gear).filter((g) => g !== null);
    const total = gearValues.length ? gearValues.reduce((a, b) => a + b, 0) : null;
    const average = gearValues.length ? total / gearValues.length : null;
    return { ...team, members, total, average };
  });
}
