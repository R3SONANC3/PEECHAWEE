const queues = new Map();

// ponytail: an in-memory per-process queue serializes read-modify-write
// operations against the same sheet within a single warm server instance —
// it does NOT protect across multiple serverless instances running at once.
// Good enough to close the common "two admins editing on this instance at
// the same moment" race, where the last write used to silently clobber the
// other's change. Swap for a real distributed lock (a lock cell in the
// sheet, or Redis) if concurrent admins ever outgrow one instance.
export function withWriteLock(key, fn) {
  const prev = queues.get(key) || Promise.resolve();
  const run = prev.then(fn, fn);
  queues.set(key, run.catch(() => {}));
  return run;
}
