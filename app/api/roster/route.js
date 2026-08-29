import { NextResponse } from 'next/server';
import { readRoster, addMember, deleteMember, editMember } from '@/lib/roster';
import { readGearMap, setGear, deleteGear } from '@/lib/gear';
import { removeNameFromAllTeams } from '@/lib/teams';
import { isAdmin } from '@/lib/auth';

export async function GET() {
  try {
    const roster = await readRoster();
    const gearMap = await readGearMap();
    return NextResponse.json({ ok: true, roster, gearMap });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

export async function POST(request) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'ไม่มีสิทธิ์แก้ไขข้อมูล' }, { status: 401 });
  const body = await request.json();
  try {
    let roster;
    if (body.action === 'add') {
      roster = await addMember(body.name, body.cls);
      if (body.gear !== '' && body.gear !== null && body.gear !== undefined) {
        await setGear(body.name.trim(), body.gear);
      }
    } else if (body.action === 'delete') {
      roster = await deleteMember(body.name, body.cls);
      // Neither GEAR nor a team-sheet slot self-cleans when a name leaves
      // the roster — both need an explicit removal here, or the name lingers
      // forever in the Gear sheet and keeps holding a slot on whichever team
      // sheet(s) it was assigned to (Main-War/SUB-WAR/Castle/Polarity).
      await deleteGear(body.name);
      await removeNameFromAllTeams(body.name);
    } else if (body.action === 'edit') {
      roster = await editMember(body.oldName, body.oldCls, body.newName, body.newCls);
      // A blank gear means "unchanged" — never overwrite the shared value with blank.
      if (body.newName && body.gear !== '' && body.gear !== null && body.gear !== undefined) {
        await setGear(body.newName.trim(), body.gear);
      }
      // A rename leaves the old name behind otherwise — an orphan row in
      // the Gear sheet, and a team slot still showing a name that no longer
      // exists in the roster. The player (or an admin) re-assigns the new
      // name to a team slot separately; this only clears the stale one.
      if (body.newName && body.newName.trim() !== body.oldName) {
        await deleteGear(body.oldName);
        await removeNameFromAllTeams(body.oldName);
      }
    } else {
      return NextResponse.json({ ok: false, error: 'unknown action' }, { status: 400 });
    }
    const gearMap = await readGearMap();
    return NextResponse.json({ ok: true, roster, gearMap });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
  }
}
