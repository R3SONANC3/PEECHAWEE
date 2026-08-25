// Shared between server (lib/roster.js column mapping) and client (rendering) code —
// keep this file free of server-only imports.
//
// `icon` refers to a key in components/ClassIcon.js. Spare icons not
// currently assigned to any class (fist, flame, lyre, axe) are ready to
// use when a new class gets added — just pick one here, no new icon to draw.
export const CLASSES = [
  { key: 'Knight', th: 'อัศวิน', color: '#4f46e5', icon: 'shield' },
  { key: 'Wizard', th: 'นักเวท', color: '#2563eb', icon: 'wizardHat' },
  { key: 'Hunter', th: 'นักล่า', color: '#ea580c', icon: 'bow' },
  { key: 'Priest', th: 'นักบวช', color: '#16a34a', icon: 'cross' },
  { key: 'Assassin', th: 'นักฆ่า', color: '#9333ea', icon: 'dagger' },
  { key: 'Blacksmith', th: 'ช่างตีเหล็ก', color: '#b45309', icon: 'hammer' },
  { key: 'Gunslinger', th: 'มือปืน', color: '#64748b', icon: 'pistol' },
  { key: 'Druid', th: 'ดรูอิด', color: '#0d9488', icon: 'leaf' },
  { key: 'Paladin', th: 'พาลาดิน', color: '#dc2626', icon: 'paladinShield' },
  { key: 'Champion', th: 'แชมเปี้ยน', color: '#ca8a04', icon: 'trophy' },
];

export const CLASS_ORDER = CLASSES.map((c) => c.key);
export const CLASS_MAP = Object.fromEntries(CLASSES.map((c) => [c.key, c]));
