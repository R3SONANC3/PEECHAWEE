// Simple original line icons (not copied from any stock set) — one per
// class, plus a few spares ready to assign to a future new class without
// having to draw a new one first.
const ICONS = {
  shield: <path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3z" />,
  wizardHat: <path d="M12 3l5 12H7l5-12zM3 17h18" />,
  bow: <path d="M4 20L20 4M20 4l-6 1M20 4l-1 6" />,
  cross: <path d="M12 4v16M8 8h8" />,
  dagger: (
    <>
      <path d="M12 3l3 9h-6l3-9zM7 12h10M12 12v6" />
      <circle cx="12" cy="20" r="1.3" fill="currentColor" stroke="none" />
    </>
  ),
  hammer: (
    <>
      <rect x="9" y="3" width="6" height="4" rx="1" transform="rotate(45 12 5)" fill="currentColor" stroke="none" />
      <path d="M10 8L4 20" />
    </>
  ),
  pistol: (
    <>
      <rect x="9" y="9" width="12" height="3" rx="0.5" fill="currentColor" stroke="none" />
      <rect x="5" y="11" width="4" height="9" rx="1" transform="rotate(20 7 15)" fill="currentColor" stroke="none" />
      <path d="M9 12c-1.6 0-2.6 1.1-2.6 2.6s1 2.4 2.6 2.4" />
    </>
  ),
  leaf: <path d="M4 20C4 10 10 4 20 4c0 10-6 16-16 16zM8 16L20 4" />,
  paladinShield: <path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3zM12 9v6M9 12h6" />,
  trophy: (
    <path d="M7 4h10v4a5 5 0 01-10 0V4zM7 5H4v2a3 3 0 003 3M17 5h3v2a3 3 0 01-3 3M10 17h4M12 13v4M9 20h6" />
  ),
  // spares — not assigned to a class yet, ready to use for the next new class
  fist: <path d="M8 21v-5.5L5 12l2-2 3 2.5V8h2v4h2V6h2v6h2v3l-2 2v4z" />,
  flame: <path d="M12 2c3 4 5 7 5 11a5 5 0 01-10 0c0-2 1-3 2-4-.3 2 .5 3 1 3 .8 0-1-3 2-10z" />,
  lyre: <path d="M6 3v12a3 3 0 003 3M18 3v12a3 3 0 01-3 3M6 3h12M9 9h6M9 13h6" />,
  axe: <path d="M14 4l-3 3 7 7 3-3zM11 7L4 20" />,
};

export default function ClassIcon({ icon, size = 18, className }) {
  const content = ICONS[icon];
  if (!content) return null;
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {content}
    </svg>
  );
}
