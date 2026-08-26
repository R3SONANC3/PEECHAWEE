'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const BASE_LINKS = [
  { href: '/', label: '🏰 ทำเนียบสมาชิก' },
  { href: '/attendance', label: '📋 เช็คชื่อ' },
  { href: '/duplicates', label: '🔁 ชื่อซ้ำ' },
];

export default function Nav({ teamSheets = [], isAdmin }) {
  const pathname = usePathname();
  const [theme, setTheme] = useState(null); // unknown until mounted, avoids SSR mismatch
  const links = [
    ...BASE_LINKS,
    ...teamSheets.map((title) => ({ href: `/teams/${encodeURIComponent(title)}`, label: `⚔️ ${title}` })),
  ];

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    setTheme(saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  }, []);

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    setTheme(next);
  }

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
      <button type="button" className="nav-theme-toggle" onClick={toggleTheme} title="สลับธีม">
        {theme === 'dark' ? '☀️' : theme === 'light' ? '🌙' : ''}
      </button>
      <button type="button" className="nav-role-switch" onClick={switchRole} title="เปลี่ยนโหมด">
        {isAdmin ? '🛡️ ผู้บริหาร' : '👤 Member'}
      </button>
    </nav>
  );
}
