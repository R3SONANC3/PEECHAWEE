import { redirect } from 'next/navigation';

export default function PolarityRedirect() {
  redirect('/teams/' + encodeURIComponent('Polarity'));
}
