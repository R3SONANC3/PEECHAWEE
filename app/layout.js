import { Noto_Sans_Thai, Noto_Serif_Thai } from 'next/font/google';
import './globals.css';
import Nav from '@/components/Nav';

const notoSans = Noto_Sans_Thai({
  variable: '--font-sans',
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600', '700'],
});
const notoSerif = Noto_Serif_Thai({
  variable: '--font-serif',
  subsets: ['thai', 'latin'],
  weight: ['600', '700'],
});

export const metadata = {
  title: 'ทำเนียบสมาชิกกิลผีชีวะ',
  description: 'จัดการรายชื่อสมาชิก เช็คชื่อ และทีม War/Polarity ของกิลผีชีวะ',
};

export default function RootLayout({ children }) {
  return (
    <html lang="th" className={`${notoSans.variable} ${notoSerif.variable}`}>
      <body>
        <div className="wrap">
          <Nav />
          {children}
        </div>
      </body>
    </html>
  );
}
