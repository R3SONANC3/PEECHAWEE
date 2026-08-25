// Shared between server (lib/roster.js column mapping) and client (rendering) code —
// keep this file free of server-only imports.
export const CLASSES = [
  { key: 'Knight', th: 'อัศวิน', color: '#4f46e5' },
  { key: 'Wizard', th: 'นักเวท', color: '#2563eb' },
  { key: 'Hunter', th: 'นักล่า', color: '#ea580c' },
  { key: 'Priest', th: 'นักบวช', color: '#16a34a' },
  { key: 'Assassin', th: 'นักฆ่า', color: '#9333ea' },
  { key: 'Blacksmith', th: 'ช่างตีเหล็ก', color: '#b45309' },
  { key: 'Gunslinger', th: 'มือปืน', color: '#64748b' },
  { key: 'Druid', th: 'ดรูอิด', color: '#0d9488' },
  { key: 'Paladin', th: 'พาลาดิน', color: '#dc2626' },
  { key: 'Champion', th: 'แชมเปี้ยน', color: '#ca8a04' },
];

export const CLASS_ORDER = CLASSES.map((c) => c.key);
export const CLASS_MAP = Object.fromEntries(CLASSES.map((c) => [c.key, c]));
