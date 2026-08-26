import { readRoster } from '@/lib/roster';
import { readGearMap } from '@/lib/gear';
import { CLASSES } from '@/lib/classes';
import RosterBoard from '@/components/RosterBoard';
import SetupNotice from '@/components/SetupNotice';

// Roster data changes constantly (add/edit/delete) — must be fetched fresh
// per request, not baked into the build like a static page.
export const dynamic = 'force-dynamic';

export default async function RosterPage() {
  let roster = null;
  let gearMap = {};
  let error = null;
  try {
    roster = await readRoster();
    gearMap = await readGearMap();
  } catch (e) {
    error = e.message === 'MISSING_GOOGLE_CREDENTIALS' ? 'missing-credentials' : 'fetch-failed';
  }

  return (
    <main>
      <header className="page-header">
        <h1>ทำเนียบสมาชิกกิลผีชีวะ</h1>
        <p className="subtitle">จัดการรายชื่อสมาชิก · เพิ่ม แก้ไข และลบข้อมูลตามคลาส</p>
      </header>
      {error ? <SetupNotice type={error} /> : <RosterBoard initialRoster={roster} classes={CLASSES} gearMap={gearMap} />}
    </main>
  );
}
