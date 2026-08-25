import Link from 'next/link';

export default function NotFound() {
  return (
    <main>
      <div className="setup-notice">
        <h2>ไม่พบหน้านี้</h2>
        <p>ลิงก์อาจพิมพ์ผิดหรือหน้านี้ถูกย้ายไปแล้ว</p>
        <Link href="/" className="btn btn-add" style={{ display: 'inline-block', textDecoration: 'none' }}>
          กลับหน้าหลัก
        </Link>
      </div>
    </main>
  );
}
