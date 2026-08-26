const attempts = new Map(); // key -> { count, resetAt }

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

// ponytail: in-memory per-process counter — resets on cold start and isn't
// shared across serverless instances, so this is a soft speed bump against
// casual password guessing, not a hard guarantee. Good enough for a single
// shared guild password; swap for a real store (Redis/KV) if that changes.
export function isRateLimited(key) {
  const entry = attempts.get(key);
  if (!entry || Date.now() > entry.resetAt) return false;
  return entry.count >= MAX_ATTEMPTS;
}

export function recordFailure(key) {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now > entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    entry.count += 1;
  }
}

export function recordSuccess(key) {
  attempts.delete(key);
}
