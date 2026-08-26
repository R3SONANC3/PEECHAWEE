import { NextResponse } from 'next/server';
import { ADMIN_COOKIE } from '@/lib/auth';
import { isRateLimited, recordFailure, recordSuccess } from '@/lib/rateLimit';

const ONE_YEAR = 60 * 60 * 24 * 365;

export async function POST(request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (isRateLimited(ip)) {
    return NextResponse.json({ ok: false, error: 'ลองผิดหลายครั้งเกินไป กรุณาลองใหม่ภายหลัง' }, { status: 429 });
  }

  const { password } = await request.json();
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return NextResponse.json({ ok: false, error: 'ยังไม่ได้ตั้งค่ารหัสผ่านผู้บริหาร (ADMIN_PASSWORD)' }, { status: 500 });
  }
  if (password !== expected) {
    recordFailure(ip);
    return NextResponse.json({ ok: false, error: 'รหัสผ่านไม่ถูกต้อง' }, { status: 401 });
  }
  recordSuccess(ip);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, expected, { httpOnly: true, sameSite: 'lax', maxAge: ONE_YEAR, path: '/' });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(ADMIN_COOKIE);
  return res;
}
