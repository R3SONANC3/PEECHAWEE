// Shared between server (lib/roster.js column mapping) and client (rendering) code —
// keep this file free of server-only imports.
//
// `icon` refers to a key in components/ClassIcon.js. Spare icons not
// currently assigned to any class (fist, flame, lyre, axe) are ready to
// use when a new class gets added — just pick one here, no new icon to draw.
// Colors match the Google Sheets standard palette names used in the
// Players sheet header row (e.g. "red berry", "light green 2").
export const CLASSES = [
  { key: 'Knight', th: 'อัศวิน', color: '#ff0000', icon: 'sword' },
  { key: 'Wizard', th: 'นักเวท', color: '#0000ff', icon: 'wizardHat' },
  { key: 'Hunter', th: 'นักล่า', color: '#ff9900', icon: 'arrow' },
  { key: 'Priest', th: 'นักบวช', color: '#00ff00', icon: 'cross' },
  { key: 'Assassin', th: 'นักฆ่า', color: '#9900ff', icon: 'dagger' },
  { key: 'Blacksmith', th: 'ช่างตีเหล็ก', color: '#980000', icon: 'hammer' },
  { key: 'Gunslinger', th: 'มือปืน', color: '#000000', icon: 'pistol' },
  { key: 'Druid', th: 'ดรูอิด', color: '#4a86e8', icon: 'paw' },
  { key: 'Paladin', th: 'พาลาดิน', color: '#dd7e6b', icon: 'paladinShield' },
  { key: 'Champion', th: 'แชมเปี้ยน', color: '#b6d7a8', icon: 'trophy' },
];

export const CLASS_ORDER = CLASSES.map((c) => c.key);
export const CLASS_MAP = Object.fromEntries(CLASSES.map((c) => [c.key, c]));
