import { NextResponse } from 'next/server';
import { readTeams, updateTeamSlot } from '@/lib/teams';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const sheet = searchParams.get('sheet') || '';
  if (!sheet) return NextResponse.json({ ok: false, error: 'missing sheet' }, { status: 400 });
  try {
    const teams = await readTeams(sheet);
    return NextResponse.json({ ok: true, teams });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

export async function POST(request) {
  const body = await request.json();
  try {
    const teams = await updateTeamSlot(body.sheet, body.team, body.slot, body.name, body.gear);
    return NextResponse.json({ ok: true, teams });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
  }
}
