import { cookies } from 'next/headers';

export const ADMIN_COOKIE = 'admin_auth';

// ponytail: the cookie value IS the shared admin password, compared as a
// plain string — no session store, no rotation, no per-user accounts.
// Good enough for a guild tool with one shared admin password; swap for
// real per-user auth if that ever changes.
export async function isAdmin() {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const store = await cookies();
  return store.get(ADMIN_COOKIE)?.value === expected;
}
