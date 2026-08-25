// Simple original filled-silhouette icons (not copied from any stock/
// licensed set) — one per class, plus a few spares ready to assign to a
// future new class without having to draw a new one first.
const ICONS = {
  sword: (
    <>
      <path d="M12 1l1.4 12h-2.8L12 1z" />
      <rect x="8" y="13" width="8" height="2" rx="0.5" />
      <rect x="11" y="15" width="2" height="6" rx="0.5" />
      <circle cx="12" cy="21.5" r="1.3" />
    </>
  ),
  wizardHat: (
    <>
      <path d="M12 2L19 17H5L12 2z" />
      <ellipse cx="12" cy="18" rx="9" ry="2" />
      <circle cx="12" cy="1.4" r="1.2" />
    </>
  ),
  arrow: <path d="M2 12h11l-2-3h4l7 3-7 3h-4l2-3H2z" />,
  cross: <path d="M10 2h4v6h6v4h-6v10h-4V12H4V8h6V2z" />,
  dagger: (
    <g transform="rotate(45 12 12)">
      <path d="M12 4l1.6 8h-3.2L12 4z" />
      <rect x="9" y="12" width="6" height="1.6" rx="0.5" />
      <rect x="11.2" y="13.6" width="1.6" height="5" rx="0.5" />
      <circle cx="12" cy="19.6" r="1.1" />
    </g>
  ),
  hammer: (
    <>
      <rect x="8.5" y="2" width="7" height="5" rx="1" transform="rotate(45 12 4.5)" />
      <rect x="10" y="7" width="3" height="15" rx="1" transform="rotate(15 11.5 14.5)" />
    </>
  ),
  pistol: <path d="M2 14h9v-2h5l2-2h4v4h-2v3h-4v-2h-3l-1 2H6l-1-2H2z" />,
  paw: (
    <>
      <ellipse cx="12" cy="17" rx="6" ry="5" />
      <circle cx="5" cy="9" r="2.6" />
      <circle cx="10" cy="5" r="2.6" />
      <circle cx="15" cy="5" r="2.7" />
      <circle cx="19.5" cy="9" r="2.6" />
    </>
  ),
  paladinShield: <path d="M12 2L21 5.5V11C21 16.5 17.2 20.3 12 22C6.8 20.3 3 16.5 3 11V5.5L12 2z" />,
  trophy: (
    <>
      <path d="M7 3h10v5a5 5 0 01-10 0V3z" />
      <path d="M7 4H3v3a4 4 0 004 4M17 4h4v3a4 4 0 01-4 4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <rect x="10.5" y="12" width="3" height="6" />
      <rect x="8" y="19" width="8" height="2" rx="0.5" />
    </>
  ),
  // spares — not assigned to a class yet, ready to use for the next new class
  fist: <path d="M8 21v-5.5L5 12l2-2 3 2.5V8h2v4h2V6h2v6h2v3l-2 2v4z" />,
  flame: <path d="M12 2c3 4 5 7 5 11a5 5 0 01-10 0c0-2 1-3 2-4-.3 2 .5 3 1 3 .8 0-1-3 2-10z" />,
  lyre: (
    <>
      <path d="M4 21V9c0-4 3-7 7-7h1v20H8a4 4 0 01-4-4z" />
      <rect x="7.2" y="5" width="1.1" height="14" />
      <rect x="9.6" y="5" width="1.1" height="14" />
    </>
  ),
  axe: (
    <>
      <path d="M15 3l-4 4 8 8 4-4c1-3-1-7-4-8-1.5-.5-3 0-4 0z" />
      <rect x="9.5" y="9" width="2" height="13" rx="0.6" transform="rotate(45 10.5 15.5)" />
    </>
  ),
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
      fill="currentColor"
      stroke="none"
      aria-hidden="true"
    >
      {content}
    </svg>
  );
}
