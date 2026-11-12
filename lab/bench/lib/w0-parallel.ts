// [DX-S5] Why: overlap independent immutable reads and stateless oracle calls while retaining every result and exact order.
// Rejected: sampling subjects or raising the hold deadline to accommodate avoidable serial transport waits.
function check(n: number) {
  if (!Number.isSafeInteger(n) || n < 1 || n > 32) throw Error("invalid verification concurrency");
}
export async function forEachBounded<A>(
  values: readonly A[],
  concurrency: number,
  run: (value: A, index: number) => Promise<void>,
) {
  check(concurrency);
  let next = 0,
    failed = false;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, async () => {
      while (!failed) {
        const i = next++;
        if (i >= values.length) return;
        try {
          await run(values[i]!, i);
        } catch (e) {
          failed = true;
          throw e;
        }
      }
    }),
  );
}
export async function* orderedMap<A, B>(
  values: readonly A[],
  concurrency: number,
  run: (value: A) => Promise<B>,
): AsyncGenerator<B> {
  check(concurrency);
  const pending = new Map<number, Promise<B>>();
  const launch = (i: number) => {
    if (i < values.length) {
      const p = run(values[i]!);
      void p.catch(() => {});
      pending.set(i, p);
    }
  };
  try {
    for (let i = 0; i < Math.min(values.length, concurrency); i++) launch(i);
    for (let i = 0; i < values.length; i++) {
      const result = await pending.get(i)!;
      pending.delete(i);
      yield result;
      launch(i + concurrency);
    }
  } finally {
    await Promise.allSettled(pending.values());
  }
}

// [DX-S5] Why: retained 100k roots make 16 complete journal replacements exceed the unchanged 64 MiB transport cap.
// Rejected: raising that cap or skipping journals; halve only an oversized read at the same exact cursor, failing closed at one.
export function adaptiveReplicaFeed<T>(
  request: (after: number, limit: number, waitMs: number) => Promise<T>,
  onShrink?: (event: { after: number; from: number; to: number; error: string }) => void,
) {
  let learned = 16;
  return async (after: number, limit: number, waitMs: number): Promise<T> => {
    if (!Number.isSafeInteger(limit) || limit < 1) throw Error("invalid feed page limit");
    let size = Math.min(limit, learned);
    for (;;) {
      try {
        return await request(after, size, waitMs);
      } catch (error) {
        if (
          size === 1 ||
          !(error instanceof Error) ||
          !("_tag" in error) ||
          error._tag !== "DatomicTransportError" ||
          !/^Gateway response exceeds \d+ bytes$/.test(error.message)
        )
          throw error;
        const previous = size;
        learned = Math.min(learned, Math.max(1, Math.floor(size / 2)));
        size = learned;
        onShrink?.({ after, from: previous, to: size, error: error.message });
      }
    }
  };
}
