import { getSheetTitles, setValues, clearValues, getValues, batchUpdate, quoteSheet, invalidateSheetTitlesCache } from './googleSheets';
import { withWriteLock } from './writeLock';

const GEAR_SHEET_NAME = 'Gear';

// Unlocked internal — callers must already hold the 'gear' write lock
// (both readGearMap and setGear do) so sheet creation and the row-lookup
// in setGear can't race each other.
async function ensureGearSheet() {
  const titles = await getSheetTitles();
  if (titles.some((t) => t.title === GEAR_SHEET_NAME)) return;

  await batchUpdate([{ addSheet: { properties: { title: GEAR_SHEET_NAME } } }]);
  invalidateSheetTitlesCache();
  await setValues(`${quoteSheet(GEAR_SHEET_NAME)}!A1:B1`, [['ชื่อ', 'GEAR']]);
}

export async function readGearMap() {
  return withWriteLock('gear', async () => {
    await ensureGearSheet();
    const rows = await getValues(`${quoteSheet(GEAR_SHEET_NAME)}!A2:B`);
    const map = {};
    rows.forEach((row) => {
      const name = (row[0] ?? '').toString().trim();
      const gearNum = Number(row[1]);
      if (name && Number.isFinite(gearNum)) map[name] = gearNum;
    });
    return map;
  });
}

// Locked: without this, two concurrent setGear calls for two different new
// names could both read the same "row not found" snapshot and both target
// the same next-empty row, so one silently overwrites the other.
export async function setGear(name, gear) {
  const trimmed = (name || '').toString().trim();
  if (!trimmed) return;
  return withWriteLock('gear', async () => {
    await ensureGearSheet();
    const rows = await getValues(`${quoteSheet(GEAR_SHEET_NAME)}!A2:A`);
    const idx = rows.findIndex((row) => (row[0] ?? '').toString().trim() === trimmed);
    const row = idx === -1 ? rows.length + 2 : idx + 2;
    const gearValue = gear === '' || gear === null || gear === undefined ? '' : Number(gear);
    await setValues(`${quoteSheet(GEAR_SHEET_NAME)}!A${row}:B${row}`, [[trimmed, gearValue]]);
  });
}

// Clears a name's row (rather than shifting rows below it, simplest given
// this sheet is just a flat name->gear list) — a no-op if they never had a
// recorded value.
export async function deleteGear(name) {
  const trimmed = (name || '').toString().trim();
  if (!trimmed) return;
  return withWriteLock('gear', async () => {
    await ensureGearSheet();
    const rows = await getValues(`${quoteSheet(GEAR_SHEET_NAME)}!A2:A`);
    const idx = rows.findIndex((row) => (row[0] ?? '').toString().trim() === trimmed);
    if (idx === -1) return;
    const row = idx + 2;
    await clearValues(`${quoteSheet(GEAR_SHEET_NAME)}!A${row}:B${row}`);
  });
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
