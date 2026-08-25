import { readRoster } from './roster';
import { CLASSES } from './classes';

// Maps a player's name to their class key (not color directly) so callers
// can look up CLASS_MAP[key] for both the color and the icon.
export async function buildNameToClass() {
  const roster = await readRoster();
  const map = {};
  CLASSES.forEach((c) => {
    (roster[c.key] || []).forEach((n) => { map[n] = c.key; });
  });
  return map;
}
