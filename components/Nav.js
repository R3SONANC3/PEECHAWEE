'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: '🏰 ทำเนียบสมาชิก' },
  { href: '/attendance', label: '📋 เช็คชื่อ' },
  { href: '/war', label: '⚔️ War' },
  { href: '/polarity', label: '🔮 Polarity' },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <nav className="nav">
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} className={pathname === l.href ? 'nav-link active' : 'nav-link'}>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
