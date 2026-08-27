import Link from 'next/link';
import { getAttendanceForDate } from '@/lib/attendance';
import { isAdmin } from '@/lib/auth';
import AttendanceBoard from '@/components/AttendanceBoard';
import SetupNotice from '@/components/SetupNotice';

export const dynamic = 'force-dynamic';

const WARS = [
  { key: 'main', label: 'MAIN WAR' },
  { key: 'sub', label: 'SUB WAR' },
];

function todayLabel() {
  const now = new Date();
  return `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;
}

export default async function AttendancePage({ searchParams }) {
  const params = await searchParams;
  const war = params.war === 'sub' ? 'sub' : 'main';
  const today = todayLabel();
  let data = null;
  let error = null;
  const admin = await isAdmin();
  try {
    data = await getAttendanceForDate(war, today);
  } catch (e) {
    error = e.message === 'MISSING_GOOGLE_CREDENTIALS' ? 'missing-credentials' : 'fetch-failed';
  }

  return (
    <main>
      <header className="page-header">
        <h1>เช็คชื่อกิลวอร์</h1>
        <p className="subtitle">แตะชื่อเพื่อเปลี่ยนสถานะ แล้วกดบันทึกครั้งเดียวตอนเสร็จ</p>
      </header>
      <div className="war-tabs">
        {WARS.map((w) => (
          <Link key={w.key} href={`/attendance?war=${w.key}`} className={`war-tab${war === w.key ? ' active' : ''}`}>
            {w.label}
          </Link>
        ))}
      </div>
      {error ? (
        <SetupNotice type={error} />
      ) : (
        <AttendanceBoard key={war} initialData={data} today={today} isAdmin={admin} war={war} />
      )}
    </main>
  );
}
