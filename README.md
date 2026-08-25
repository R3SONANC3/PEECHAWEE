# ทำเนียบสมาชิกกิลผีชีวะ

จัดการรายชื่อสมาชิก เช็คชื่อกิลวอร์ และจัดทีมต่าง ๆ — เขียนด้วย Next.js (JavaScript ธรรมดา ไม่ใช้ TypeScript) โดยใช้ Google Sheet เดิมเป็นฐานข้อมูล ผ่าน Google Sheets API ตรง ๆ (ไม่ใช้ Google Apps Script อีกต่อไป)

โค้ดเวอร์ชันเดิม (Google Apps Script + static HTML) เก็บไว้ใน `legacy-apps-script/` เพื่ออ้างอิง ไม่ได้ใช้งานแล้ว

## ตั้งค่า Google Sheets API

แอปนี้อ่าน/เขียนชีตของคุณผ่าน Service Account (ไม่มีการ deploy Apps Script อีกแล้ว) ทำตามขั้นตอนนี้ครั้งเดียว:

1. เปิด [Google Cloud Console](https://console.cloud.google.com/) → สร้างโปรเจกต์ใหม่ (หรือใช้โปรเจกต์เดิม)
2. เมนู **APIs & Services > Library** → ค้นหา **Google Sheets API** → กด **Enable**
3. เมนู **APIs & Services > Credentials** → **Create Credentials > Service Account** → ตั้งชื่ออะไรก็ได้ → สร้างเสร็จแล้วกดเข้าไปที่ Service Account นั้น
4. แท็บ **Keys** → **Add Key > Create new key** → เลือก **JSON** → จะได้ไฟล์ `.json` ดาวน์โหลดมา (เก็บไว้เป็นความลับ ไม่ต้องอัพขึ้น GitHub)
5. เปิดไฟล์ JSON นั้น คัดลอกค่า `client_email` และ `private_key`
6. เปิด Google Sheet ของกิลด์ → กด **Share** → แชร์ให้กับอีเมลใน `client_email` (สิทธิ์ **Editor**)
7. คัดลอก Sheet ID จาก URL ของชีต (ส่วนที่อยู่ระหว่าง `/d/` กับ `/edit`)

จากนั้นสร้างไฟล์ `.env.local` (คัดลอกจาก `.env.example`) แล้วกรอก:

```
GOOGLE_SHEET_ID=<sheet id จากขั้นตอน 7>
GOOGLE_SERVICE_ACCOUNT_EMAIL=<client_email จากขั้นตอน 5>
GOOGLE_PRIVATE_KEY="<private_key จากขั้นตอน 5 ทั้งก้อน รวม -----BEGIN/END----->"
```

`.env.local` ถูก gitignore ไว้แล้ว จะไม่ถูกอัพขึ้น GitHub

## รันในเครื่อง

```bash
npm install
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000)

ถ้ายังไม่ตั้งค่า `.env.local` เว็บจะแสดงข้อความ "ยังไม่ได้ตั้งค่าการเชื่อมต่อ Google Sheet" แทนที่จะพัง — ใช้เช็คได้ว่าโค้ดรันได้ปกติ

## โครงสร้างข้อมูลในชีต (สำคัญ)

- **ชีตแรก (ทำเนียบสมาชิก)**: แถวที่ 1 เป็นหัวคอลัมน์, คอลัมน์ A–J คือ 10 คลาสตามลำดับใน `lib/classes.js` แต่ละคอลัมน์มีชื่อผู้เล่นเรียงเป็นแถว ๆ
- **ชีตเช็คชื่อ** (ชื่อ `เช็คชื่อกิลวอร์` หรือแท็บที่สองถ้าไม่เจอชื่อนี้): คอลัมน์ A = ชื่อผู้เล่น, แถวที่ 1 ตั้งแต่คอลัมน์ B = วันที่ (checkbox แต่ละคอลัมน์ = เช็คชื่อวันนั้น)
- **ชีตทีม**: แท็บอื่น ๆ ทุกแท็บในสเปรดชีต (นอกจากทำเนียบสมาชิกกับเช็คชื่อ) จะกลายเป็นหน้าทีมให้อัตโนมัติ — เพิ่มแท็บใหม่ในชีต (เช่น "Sub-War") แล้วมันจะโผล่เป็นเมนูใหม่เองโดยไม่ต้องแก้โค้ด หัวทีมเป็นเซลล์ข้อความ `TEAM 1`, `TEAM 2`, ... ตามด้วยแถวสมาชิกในคอลัมน์เดียวกัน (จำนวนแถว/สมาชิกต่อทีมไม่ต้องเท่ากัน ระบบนับตามจริงจนถึงหัวทีมถัดไปหรือจนหมดชีต) และ **คอลัมน์ถัดไปทางขวา = ค่า GEAR** ของคนนั้น
  - ลิงก์เก่า `/war` และ `/polarity` ยัง redirect ไปหน้าใหม่ `/teams/Main-War` และ `/teams/Polarity` ให้อยู่ ไม่ต้องแก้ bookmark เดิม

## Deploy ขึ้น Vercel

1. Push โค้ดนี้ขึ้น GitHub (ทำให้แล้วในโปรเจกต์นี้)
2. เข้า [vercel.com](https://vercel.com) → **Add New > Project** → เลือก repo `PEECHAWEE`
3. ก่อนกด Deploy ให้ไปที่ **Environment Variables** เพิ่ม 3 ตัวเดียวกับใน `.env.local`:
   - `GOOGLE_SHEET_ID`
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_PRIVATE_KEY` (ใส่ทั้งก้อนพร้อม `\n` เหมือนใน `.env.local`)
4. กด **Deploy** — ครั้งต่อไปที่ push ขึ้น `main`, Vercel จะ deploy ให้อัตโนมัติ

## โครงสร้างโค้ด

- `lib/googleSheets.js` — auth + wrapper เรียก Google Sheets API (แทน `Code.gs` เดิม)
- `lib/roster.js`, `lib/attendance.js`, `lib/teams.js` — logic อ่าน/เขียนแต่ละชีต
- `app/api/*/route.js` — API routes ที่ฝั่ง client เรียกตอนเพิ่ม/แก้/ลบข้อมูล
- `app/*/page.js`, `app/teams/[sheet]/page.js` — แต่ละหน้า โหลดข้อมูลฝั่ง server ตั้งแต่แรกเพื่อความไว หน้าทีมเป็น route เดียวที่รับชื่อแท็บมาจาก URL
- `components/*` — ส่วนที่ต้องโต้ตอบกับผู้ใช้ (ฟอร์ม, ปุ่ม, modal ยืนยัน)
