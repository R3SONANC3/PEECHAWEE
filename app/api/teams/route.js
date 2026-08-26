import { NextResponse } from 'next/server';
import { readTeams, updateTeamSlot } from '@/lib/teams';
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
    await updateTeamSlot(body.sheet, body.team, body.slot, body.name);
    // A blank gear on submit means "unchanged" (e.g. re-assigning a known
    // name to a new slot without retyping their gear) — never overwrite
    // the shared value with blank.
    if (body.name && body.gear !== '' && body.gear !== null && body.gear !== undefined) {
      await setGear(body.name, body.gear);
    }
    const teams = applyGearMap(await readTeams(body.sheet), await readGearMap());
    return NextResponse.json({ ok: true, teams });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
  }
}
