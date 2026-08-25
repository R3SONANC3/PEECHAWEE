'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const BASE_LINKS = [
  { href: '/', label: '🏰 ทำเนียบสมาชิก' },
  { href: '/attendance', label: '📋 เช็คชื่อ' },
];

export default function Nav({ teamSheets = [] }) {
  const pathname = usePathname();
  const links = [
    ...BASE_LINKS,
    ...teamSheets.map((title) => ({ href: `/teams/${encodeURIComponent(title)}`, label: `⚔️ ${title}` })),
  ];

  return (
    <nav className="nav">
      {links.map((l) => (
        <Link key={l.href} href={l.href} className={pathname === l.href ? 'nav-link active' : 'nav-link'}>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
