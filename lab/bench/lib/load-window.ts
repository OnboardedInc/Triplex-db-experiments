// [DX-LOAD1] Why: bounded outstanding receipt promises overlap transport with preparation, and failure drains already submitted work. Rejected: unbounded Promise.all or forgetting later outcomes when the oldest send fails.
export async function windowed<T>(
  items: Iterable<T>,
  depth: number,
  apply: (item: T) => Promise<void>,
): Promise<void> {
  if (!Number.isSafeInteger(depth) || ![1, 2, 4].includes(depth))
    throw Error("Snapshot depth must be 1, 2 or 4");
  if (depth === 1) {
    for (const item of items) await apply(item);
    return;
  }
  const pending = new Set<Promise<void>>();
  let failed = false,
    error: unknown;
  try {
    for (const item of items) {
      if (failed) break;
      let work: Promise<void>;
      work = Promise.resolve()
        .then(() => apply(item))
        .catch((e) => {
          if (!failed) {
            failed = true;
            error = e;
          }
        })
        .finally(() => pending.delete(work));
      pending.add(work);
      if (pending.size >= depth) await Promise.race(pending);
    }
  } finally {
    await Promise.all(pending);
  }
  if (failed) throw error;
}
