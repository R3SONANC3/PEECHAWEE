import { NextResponse } from 'next/server';
import { readTeams, updateTeamSlot, importTeam, clearTeam } from '@/lib/teams';
import { readGearMap, applyGearMap, setGear } from '@/lib/gear';
import { isAdmin } from '@/lib/auth';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const sheet = searchParams.get('sheet') || '';
  if (!sheet) return NextResponse.json({ ok: false, error: 'missing sheet' }, { status: 400 });
  try {
    const teams = applyGearMap(await readTeams(sheet), await readGearMap());
    return NextResponse.json({ ok: true, teams });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

export async function POST(request) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'ไม่มีสิทธิ์แก้ไขข้อมูล' }, { status: 401 });
  const body = await request.json();
  try {
    if (body.action === 'import') {
      const { teams, skipped } = await importTeam(body.sheet, body.teamKey, body.sourceSheet, body.sourceTeamKey);
      return NextResponse.json({ ok: true, teams: applyGearMap(teams, await readGearMap()), skipped });
    }

    if (body.action === 'clear') {
      const teams = await clearTeam(body.sheet, body.teamKey);
      return NextResponse.json({ ok: true, teams: applyGearMap(teams, await readGearMap()) });
    }

    await updateTeamSlot(body.sheet, body.teamKey, body.slot, body.name);
    // A blank gear on submit means "unchanged" (e.g. re-assigning a known
    // name to a new slot without retyping their gear) — never overwrite
    // the shared value with blank.
    if (body.name && body.gear !== '' && body.gear !== null && body.gear !== undefined) {
      await setGear(body.name, body.gear);
    }
    const teams = applyGearMap(await readTeams(body.sheet), await readGearMap());
    return NextResponse.json({ ok: true, teams });
  } catch (e) {
    const status = e.code === 'DUPLICATE_NAME' ? 409 : 400;
    return NextResponse.json({ ok: false, error: e.message }, { status });
  }
}
