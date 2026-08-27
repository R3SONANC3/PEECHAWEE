import { NextResponse } from 'next/server';
import { getAttendanceForDate, saveAttendance } from '@/lib/attendance';
import { isAdmin } from '@/lib/auth';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const war = (searchParams.get('war') || '').trim();
  const date = (searchParams.get('date') || '').trim();
  try {
    const data = await getAttendanceForDate(war, date);
    return NextResponse.json({ ok: true, ...data });
  } catch (e) {
    const status = e.message === 'invalid war' ? 400 : 500;
    return NextResponse.json({ ok: false, error: e.message }, { status });
  }
}

export async function POST(request) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'ไม่มีสิทธิ์แก้ไขข้อมูล' }, { status: 401 });
  const body = await request.json();
  const war = (body.war || '').trim();
  const date = (body.date || '').trim();
  if (!date) return NextResponse.json({ ok: false, error: 'missing date' }, { status: 400 });
  try {
    const data = await saveAttendance(war, date, body.records || {});
    return NextResponse.json({ ok: true, ...data });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
  }
}
