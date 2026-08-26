import { Noto_Sans_Thai, Noto_Serif_Thai } from 'next/font/google';
import './globals.css';
import Nav from '@/components/Nav';
import RoleGate from '@/components/RoleGate';
import { listTeamSheetTitles } from '@/lib/teams';
import { isAdmin } from '@/lib/auth';

const notoSans = Noto_Sans_Thai({
  variable: '--font-sans',
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600', '700'],
});
const notoSerif = Noto_Serif_Thai({
  variable: '--font-serif',
  subsets: ['thai', 'latin'],
  weight: ['600', '700'],
});

export const metadata = {
  title: 'ทำเนียบสมาชิกกิลผีชีวะ',
  description: 'จัดการรายชื่อสมาชิก เช็คชื่อ และทีมต่าง ๆ ของกิลผีชีวะ',
};

// Nav lists team tabs discovered from the live sheet, so this must never be
// cached/prerendered — otherwise a newly added team tab wouldn't show up
// until the next build.
export const dynamic = 'force-dynamic';

export default async function RootLayout({ children }) {
  let teamSheets = [];
  try {
    teamSheets = await listTeamSheetTitles();
  } catch (e) {
    teamSheets = [];
  }
  const admin = await isAdmin();

  return (
    <html lang="th" className={`${notoSans.variable} ${notoSerif.variable}`}>
      <body>
        <div className="wrap">
          <RoleGate isAdmin={admin}>
            <Nav teamSheets={teamSheets} isAdmin={admin} />
            {children}
          </RoleGate>
        </div>
      </body>
    </html>
  );
}
