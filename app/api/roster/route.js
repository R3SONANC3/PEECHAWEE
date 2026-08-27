import { NextResponse } from 'next/server';
import { readRoster, addMember, deleteMember, editMember } from '@/lib/roster';
import { readGearMap, setGear, deleteGear } from '@/lib/gear';
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
    } else if (body.action === 'delete') {
      roster = await deleteMember(body.name, body.cls);
      // Attendance drops the same name automatically on its next load
      // (syncNamesFromRoster rebuilds its name list from the roster) — GEAR
      // has no such self-cleaning, so it needs an explicit delete here.
      await deleteGear(body.name);
    } else if (body.action === 'edit') {
      roster = await editMember(body.oldName, body.oldCls, body.newName, body.newCls);
      // A blank gear means "unchanged" — never overwrite the shared value with blank.
      if (body.newName && body.gear !== '' && body.gear !== null && body.gear !== undefined) {
        await setGear(body.newName.trim(), body.gear);
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
