import { listTeamSheetTitles, readTeams } from '@/lib/teams';
import { readRoster } from '@/lib/roster';
import SetupNotice from '@/components/SetupNotice';

export const dynamic = 'force-dynamic';

// A name assigned to more than one team slot within the SAME sheet is
// flagged as a duplicate. The same name appearing on different sheets is
// not a duplicate. Names not found in the Players roster are flagged too,
// since that usually means a typo. Roster names never assigned to any team
// on any sheet are flagged separately, so nobody gets left out.
async function findIssues() {
  const sheetTitles = await listTeamSheetTitles();
  const rosterMap = await readRoster();
  const playerNames = new Set(Object.values(rosterMap).flat());
  const assignedNames = new Set();

  const duplicates = [];
  for (const title of sheetTitles) {
    const teams = await readTeams(title);
    const locations = new Map();
    teams.forEach((team) => {
      team.members.forEach((m) => {
        assignedNames.add(m.name);
        if (!locations.has(m.name)) locations.set(m.name, []);
        locations.get(m.name).push({ sheet: title, team: team.name, slot: m.slot });
      });
    });

    [...locations.entries()]
      .filter(([, spots]) => spots.length > 1)
      .forEach(([name, spots]) => {
        duplicates.push({ name, spots, unknown: !playerNames.has(name) });
      });
  }

  const unassigned = Object.entries(rosterMap).flatMap(([cls, names]) =>
    names.filter((name) => !assignedNames.has(name)).map((name) => ({ name, cls }))
  );

  return { duplicates, unassigned };
}

export default async function DuplicatesPage() {
  let duplicates = null;
  let unassigned = null;
  let error = null;
  try {
    ({ duplicates, unassigned } = await findIssues());
  } catch (e) {
    error = e.message === 'MISSING_GOOGLE_CREDENTIALS' ? 'missing-credentials' : 'fetch-failed';
  }

  return (
    <main>
      <header className="page-header">
        <h1>ตรวจชื่อซ้ำระหว่างทีม</h1>
        <p className="subtitle">
          {duplicates
            ? `พบ ${duplicates.length} ชื่อซ้ำในชีทเดียวกัน และ ${unassigned.length} ชื่อที่ยังไม่ได้ลงทีม (เทียบกับทำเนียบสมาชิก)`
            : ''}
        </p>
      </header>
      {error ? (
        <SetupNotice type={error} />
      ) : (
        <>
          {duplicates.length === 0 ? (
            <p className="subtitle">ไม่พบชื่อซ้ำ ✅</p>
          ) : (
            <ul className="dup-list">
              {duplicates.map((d, i) => (
                <li key={`${d.spots[0].sheet}-${d.name}-${i}`} className="dup-item">
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

          <h2 className="section-title">ชื่อที่ยังไม่ได้ใส่ลงทีม ({unassigned.length})</h2>
          {unassigned.length === 0 ? (
            <p className="subtitle">ทุกคนถูกจัดลงทีมแล้ว ✅</p>
          ) : (
            <ul className="dup-list">
              {unassigned.map((u) => (
                <li key={`${u.cls}-${u.name}`} className="dup-item">
                  <div className="dup-name">
                    {u.name} <span className="dup-flag">{u.cls}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  );
}
