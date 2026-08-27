import { readTeams, listSections, readGroupAssignments } from '@/lib/teams';
import { readGearMap, applyGearMap } from '@/lib/gear';
import { buildNameToClass } from '@/lib/nameToColor';
import { isAdmin } from '@/lib/auth';
import TeamGrid from '@/components/TeamGrid';
import SetupNotice from '@/components/SetupNotice';

export const dynamic = 'force-dynamic';

export default async function TeamSheetPage({ params }) {
  const { sheet } = await params;
  const title = decodeURIComponent(sheet);

  let teams = null;
  let sectionLabels = [];
  let nameToClass = {};
  let gearMap = {};
  let groupAssignments = {};
  let error = null;
  const admin = await isAdmin();
  try {
    gearMap = await readGearMap();
    teams = applyGearMap(await readTeams(title), gearMap);
    sectionLabels = await listSections(title);
    nameToClass = await buildNameToClass();
    groupAssignments = await readGroupAssignments(title);
  } catch (e) {
    error = e.message === 'MISSING_GOOGLE_CREDENTIALS' ? 'missing-credentials' : 'fetch-failed';
  }

  return (
    <main>
      <header className="page-header">
        <h1>ทีม {title}</h1>
        <p className="subtitle">
          {teams ? `${teams.length} ทีม · ${teams.reduce((n, t) => n + t.members.length, 0)} คน` : ''}
        </p>
      </header>
      {error ? (
        <SetupNotice type={error} />
      ) : (
        <TeamGrid
          sheetTitle={title}
          initialTeams={teams}
          sectionLabels={sectionLabels}
          nameToClass={nameToClass}
          gearMap={gearMap}
          groupAssignments={groupAssignments}
          isAdmin={admin}
        />
      )}
    </main>
  );
}
