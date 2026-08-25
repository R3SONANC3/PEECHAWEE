import { listTeamSheetTitles, readTeams } from '@/lib/teams';
import { readRoster } from '@/lib/roster';
import SetupNotice from '@/components/SetupNotice';

export const dynamic = 'force-dynamic';

// A name assigned to more than one team slot — across any team sheets,
// not just two specific ones — is flagged as a duplicate. Names not found
// in the Players roster are flagged too, since that usually means a typo.
async function findDuplicates() {
  const sheetTitles = await listTeamSheetTitles();
  const rosterMap = await readRoster();
  const playerNames = new Set(Object.values(rosterMap).flat());

  const locations = new Map();
  for (const title of sheetTitles) {
    const teams = await readTeams(title);
    teams.forEach((team) => {
      team.members.forEach((m) => {
        if (!locations.has(m.name)) locations.set(m.name, []);
        locations.get(m.name).push({ sheet: title, team: team.name, slot: m.slot });
      });
    });
  }

  return [...locations.entries()]
    .filter(([, spots]) => spots.length > 1)
    .map(([name, spots]) => ({ name, spots, unknown: !playerNames.has(name) }));
}

export default async function DuplicatesPage() {
  let duplicates = null;
  let error = null;
  try {
    duplicates = await findDuplicates();
  } catch (e) {
    error = e.message === 'MISSING_GOOGLE_CREDENTIALS' ? 'missing-credentials' : 'fetch-failed';
  }

  return (
    <main>
      <header className="page-header">
        <h1>ตรวจชื่อซ้ำระหว่างทีม</h1>
        <p className="subtitle">
          {duplicates ? `พบ ${duplicates.length} ชื่อที่ถูกจัดเข้าทีมมากกว่า 1 ที่ (เทียบกับทำเนียบสมาชิกด้วย)` : ''}
        </p>
      </header>
      {error ? (
        <SetupNotice type={error} />
      ) : duplicates.length === 0 ? (
        <p className="subtitle">ไม่พบชื่อซ้ำ ✅</p>
      ) : (
        <ul className="dup-list">
          {duplicates.map((d) => (
            <li key={d.name} className="dup-item">
              <div className="dup-name">
                {d.name}
                {d.unknown && <span className="dup-flag">ไม่พบในทำเนียบ</span>}
              </div>
              <ul className="dup-spots">
                {d.spots.map((s, i) => (
                  <li key={i}>{s.sheet} · {s.team} · ช่องที่ {s.slot}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
