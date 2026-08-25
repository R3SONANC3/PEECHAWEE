export default function SetupNotice({ type }) {
  if (type === 'missing-credentials') {
    return (
      <div className="setup-notice">
        <h2>ยังไม่ได้ตั้งค่าการเชื่อมต่อ Google Sheet</h2>
        <p>
          เว็บนี้ต้องเชื่อมกับ Google Sheet ผ่าน Service Account ก่อนใช้งานได้ ดูขั้นตอนตั้งค่าได้ใน{' '}
          <code>README.md</code> ของโปรเจกต์ แล้วเพิ่มค่าต่อไปนี้เป็น environment variables:
        </p>
        <ul>
          <li><code>GOOGLE_SHEET_ID</code></li>
          <li><code>GOOGLE_SERVICE_ACCOUNT_EMAIL</code></li>
          <li><code>GOOGLE_PRIVATE_KEY</code></li>
        </ul>
      </div>
    );
  }
  return (
    <div className="setup-notice error">
      <h2>เชื่อมต่อ Google Sheet ไม่สำเร็จ</h2>
      <p>ลองรีเฟรชหน้านี้อีกครั้ง หากยังไม่สำเร็จ ตรวจสอบว่า Service Account มีสิทธิ์เข้าถึงชีตนี้ และเปิดใช้งาน Google Sheets API แล้ว</p>
    </div>
  );
}
