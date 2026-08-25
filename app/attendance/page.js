import { getAttendanceForDate } from '@/lib/attendance';
import AttendanceBoard from '@/components/AttendanceBoard';
import SetupNotice from '@/components/SetupNotice';

export const dynamic = 'force-dynamic';

function todayLabel() {
  const now = new Date();
  return `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;
}

export default async function AttendancePage() {
  const today = todayLabel();
  let data = null;
  let error = null;
  try {
    data = await getAttendanceForDate(today);
  } catch (e) {
    error = e.message === 'MISSING_GOOGLE_CREDENTIALS' ? 'missing-credentials' : 'fetch-failed';
  }

  return (
    <main>
      <header className="page-header">
        <h1>เช็คชื่อกิลวอร์</h1>
        <p className="subtitle">แตะชื่อเพื่อเปลี่ยนสถานะ แล้วกดบันทึกครั้งเดียวตอนเสร็จ</p>
      </header>
      {error ? <SetupNotice type={error} /> : <AttendanceBoard initialData={data} today={today} />}
    </main>
  );
}
