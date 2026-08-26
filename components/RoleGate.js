'use client';
import { useEffect, useState } from 'react';

const KEY = 'guild_role';

export default function RoleGate({ isAdmin, children }) {
  const [ready, setReady] = useState(isAdmin);
  const [mode, setMode] = useState(null); // null | 'choose' | 'password'
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isAdmin) { setReady(true); return; }
    if (localStorage.getItem(KEY) === 'member') setReady(true);
    else setMode('choose');
  }, [isAdmin]);

  function chooseMember() {
    localStorage.setItem(KEY, 'member');
    setMode(null);
    setReady(true);
  }

  async function submitPassword(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'เข้าสู่ระบบไม่สำเร็จ');
      localStorage.setItem(KEY, 'admin');
      window.location.reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (mode) {
    return (
      <div className="role-gate">
        <div className="role-gate-box">
          {mode === 'choose' ? (
            <>
              <h1>เข้าสู่ระบบ</h1>
              <p className="subtitle">เลือกสถานะของคุณ</p>
              <div className="role-gate-choices">
                <button type="button" className="role-gate-btn" onClick={chooseMember}>
                  <span className="role-gate-btn-title">👤 Member</span>
                  <span className="role-gate-btn-desc">ดูข้อมูลได้อย่างเดียว</span>
                </button>
                <button type="button" className="role-gate-btn" onClick={() => setMode('password')}>
                  <span className="role-gate-btn-title">🛡️ ผู้บริหาร</span>
                  <span className="role-gate-btn-desc">แก้ไขข้อมูลได้ทั้งหมด</span>
                </button>
              </div>
            </>
          ) : (
            <form onSubmit={submitPassword}>
              <h1>รหัสผ่านผู้บริหาร</h1>
              <p className="subtitle">กรอกรหัสผ่านเพื่อเข้าใช้งานในโหมดแก้ไขข้อมูล</p>
              <input
                type="password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="รหัสผ่าน"
                style={{ width: '100%', marginBottom: 12 }}
              />
              {error && <div className="sync-error">{error}</div>}
              <div className="modal-actions">
                <button
                  type="button"
                  className="modal-btn modal-btn-cancel"
                  onClick={() => { setMode('choose'); setError(''); setPassword(''); }}
                >
                  ย้อนกลับ
                </button>
                <button type="submit" className="modal-btn modal-btn-confirm" disabled={busy}>
                  {busy ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  if (!ready) return null;
  return children;
}
