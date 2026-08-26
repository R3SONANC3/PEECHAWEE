export function formatNum(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '';
  return Number.isInteger(n) ? n.toLocaleString() : n.toLocaleString(undefined, { maximumFractionDigits: 1 });
}
