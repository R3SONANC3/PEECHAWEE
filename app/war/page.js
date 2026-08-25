import { readTeams } from '@/lib/teams';
import { buildNameToColor } from '@/lib/nameToColor';
import TeamGrid from '@/components/TeamGrid';
import SetupNotice from '@/components/SetupNotice';

export const dynamic = 'force-dynamic';

export default async function WarPage() {
  let teams = null;
  let nameToColor = {};
  let error = null;
  try {
    teams = await readTeams('war');
    nameToColor = await buildNameToColor();
  } catch (e) {
    error = e.message === 'MISSING_GOOGLE_CREDENTIALS' ? 'missing-credentials' : 'fetch-failed';
  }

  return (
    <main>
      <header className="page-header">
        <h1>ทีม War</h1>
        <p className="subtitle">
          {teams ? `${teams.length} ทีม · ${teams.reduce((n, t) => n + t.members.length, 0)} คน` : ''}
        </p>
      </header>
      {error ? <SetupNotice type={error} /> : <TeamGrid sheetType="war" initialTeams={teams} nameToColor={nameToColor} layout="war" />}
    </main>
  );
}
