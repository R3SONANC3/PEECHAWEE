'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const BASE_LINKS = [
  { href: '/', label: '🏰 ทำเนียบสมาชิก' },
  { href: '/attendance', label: '📋 เช็คชื่อ' },
  { href: '/duplicates', label: '🔁 ชื่อซ้ำ' },
];

export default function Nav({ teamSheets = [], isAdmin }) {
  const pathname = usePathname();
  const links = [
    ...BASE_LINKS,
    ...teamSheets.map((title) => ({ href: `/teams/${encodeURIComponent(title)}`, label: `⚔️ ${title}` })),
  ];

  async function switchRole() {
    if (isAdmin) await fetch('/api/auth', { method: 'DELETE' });
    localStorage.removeItem('guild_role');
    window.location.reload();
  }

  return (
    <nav className="nav">
      {links.map((l) => (
        <Link key={l.href} href={l.href} className={pathname === l.href ? 'nav-link active' : 'nav-link'}>
          {l.label}
        </Link>
      ))}
      <button type="button" className="nav-role-switch" onClick={switchRole} title="เปลี่ยนโหมด">
        {isAdmin ? '🛡️ ผู้บริหาร' : '👤 Member'}
      </button>
    </nav>
  );
}
