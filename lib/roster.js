import { getSheetTitles, getValues, setValues, clearValues, quoteSheet, colLetter } from './googleSheets';
import { CLASS_ORDER } from './classes';
import { withWriteLock } from './writeLock';

async function getRosterSheetName() {
  const titles = await getSheetTitles();
  return titles[0].title;
}

export async function readRoster() {
  const sheetName = await getRosterSheetName();
  const lastCol = colLetter(CLASS_ORDER.length);
  const rows = await getValues(`${quoteSheet(sheetName)}!A2:${lastCol}`);

  const map = {};
  CLASS_ORDER.forEach((cls, i) => {
    map[cls] = [];
    rows.forEach((row) => {
      const v = row[i];
      if (v !== undefined && v !== null && String(v).trim() !== '') {
        map[cls].push(String(v).trim());
      }
    });
  });
  return map;
}

export async function writeRoster(map) {
  const sheetName = await getRosterSheetName();
  const lastCol = colLetter(CLASS_ORDER.length);
  await clearValues(`${quoteSheet(sheetName)}!A2:${lastCol}`);

  const maxLen = Math.max(0, ...CLASS_ORDER.map((c) => map[c].length));
  if (maxLen === 0) return;

  const out = [];
  for (let r = 0; r < maxLen; r++) {
    out.push(CLASS_ORDER.map((cls) => (map[cls][r] !== undefined ? map[cls][r] : '')));
  }
  await setValues(`${quoteSheet(sheetName)}!A2:${lastCol}${maxLen + 1}`, out);
}

// Locked so two admins editing the roster near-simultaneously don't lose
// one edit to a read-modify-write race (readRoster/writeRoster aren't
// atomic — each call rewrites the whole A2:J range from its own snapshot).
export async function addMember(name, cls) {
  const trimmed = (name || '').trim();
  if (!trimmed || !CLASS_ORDER.includes(cls)) throw new Error('invalid input');
  return withWriteLock('roster', async () => {
    const map = await readRoster();
    map[cls].push(trimmed);
    await writeRoster(map);
    return map;
  });
}

export async function deleteMember(name, cls) {
  return withWriteLock('roster', async () => {
    const map = await readRoster();
    if (map[cls]) {
      const idx = map[cls].indexOf(name);
      if (idx > -1) map[cls].splice(idx, 1);
    }
    await writeRoster(map);
    return map;
  });
}

export async function editMember(oldName, oldCls, newName, newCls) {
  return withWriteLock('roster', async () => {
    const map = await readRoster();
    if (map[oldCls]) {
      const idx = map[oldCls].indexOf(oldName);
      if (idx > -1) map[oldCls].splice(idx, 1);
    }
    const trimmed = (newName || '').trim();
    if (trimmed && map[newCls]) map[newCls].push(trimmed);
    await writeRoster(map);
    return map;
  });
}
