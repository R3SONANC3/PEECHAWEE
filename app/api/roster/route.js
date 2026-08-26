import { NextResponse } from 'next/server';
import { readRoster, addMember, deleteMember, editMember } from '@/lib/roster';
import { isAdmin } from '@/lib/auth';

export async function GET() {
  try {
    const roster = await readRoster();
    return NextResponse.json({ ok: true, roster });
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
    } else if (body.action === 'edit') {
      roster = await editMember(body.oldName, body.oldCls, body.newName, body.newCls);
    } else {
      return NextResponse.json({ ok: false, error: 'unknown action' }, { status: 400 });
    }
    return NextResponse.json({ ok: true, roster });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
  }
}
