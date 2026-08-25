'use client';

export default function Error({ error, reset }) {
  return (
    <main>
      <div className="setup-notice error">
        <h2>เกิดข้อผิดพลาดที่ไม่คาดคิด</h2>
        <p>{error?.message || 'ลองรีเฟรชหน้านี้อีกครั้ง'}</p>
        <button type="button" className="btn btn-add" onClick={() => reset()}>ลองใหม่</button>
      </div>
    </main>
  );
}
