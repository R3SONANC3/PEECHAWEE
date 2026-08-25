import { redirect } from 'next/navigation';

export default function WarRedirect() {
  redirect('/teams/' + encodeURIComponent('Main-War'));
}
