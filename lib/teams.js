import { getValues, setValues, quoteSheet, colLetter } from './googleSheets';

function sheetTitleFor(sheetType) {
  return sheetType === 'polarity' ? 'Polarity' : 'Main-War';
}

function normalizeTeamName(raw) {
  return raw.toString().trim().toUpperCase().replace(/\s+/g, '');
}

export async function readTeams(sheetType) {
  const title = sheetTitleFor(sheetType);
  const grid = await getValues(quoteSheet(title), 'UNFORMATTED_VALUE');

  const teams = [];
  for (let r = 0; r < grid.length; r++) {
    const row = grid[r] || [];
    for (let c = 0; c < row.length; c++) {
      const cell = (row[c] ?? '').toString().trim();
      if (!/^TEAM\s*\d+$/i.test(cell)) continue;

      const members = [];
      for (let k = 1; k <= 5; k++) {
        const memberRow = grid[r + k];
        if (!memberRow) continue;
        const name = (memberRow[c] ?? '').toString().trim();
        if (!name) continue;
        const gearRaw = memberRow[c + 1];
        const gearNum = typeof gearRaw === 'number' ? gearRaw : Number(gearRaw);
        members.push({ name, gear: Number.isFinite(gearNum) ? gearNum : null });
      }
      const gearValues = members.map((m) => m.gear).filter((g) => g !== null);
      const average = gearValues.length ? gearValues.reduce((a, b) => a + b, 0) / gearValues.length : null;
      teams.push({ name: normalizeTeamName(cell), members, average });
    }
  }

  teams.sort((a, b) => (parseInt(a.name.replace(/\D/g, ''), 10) || 0) - (parseInt(b.name.replace(/\D/g, ''), 10) || 0));
  return teams;
}

export async function updateTeamSlot(sheetType, teamName, slot, name, gear) {
  const title = sheetTitleFor(sheetType);
  const grid = await getValues(quoteSheet(title), 'UNFORMATTED_VALUE');

  let target = null;
  for (let r = 0; r < grid.length && !target; r++) {
    const row = grid[r] || [];
    for (let c = 0; c < row.length; c++) {
      const cell = (row[c] ?? '').toString().trim();
      if (/^TEAM\s*\d+$/i.test(cell) && normalizeTeamName(cell) === teamName) {
        target = { row: r, col: c };
        break;
      }
    }
  }
  if (!target) throw new Error('team not found');

  const targetRow = target.row + Number(slot) + 1; // grid is 0-based; header row + slot offset
  const nameCol = colLetter(target.col + 1);
  const gearCol = colLetter(target.col + 2);
  const trimmedName = (name || '').toString().trim();
  const gearValue = gear === '' || gear === null || gear === undefined ? '' : Number(gear);

  await setValues(`${quoteSheet(title)}!${nameCol}${targetRow}:${gearCol}${targetRow}`, [
    [trimmedName, gearValue === '' ? '' : gearValue],
  ]);

  return readTeams(sheetType);
}
