import { readRoster } from './roster';
import { CLASSES } from './classes';

export async function buildNameToColor() {
  const roster = await readRoster();
  const map = {};
  CLASSES.forEach((c) => {
    (roster[c.key] || []).forEach((n) => { map[n] = c.color; });
  });
  return map;
}
