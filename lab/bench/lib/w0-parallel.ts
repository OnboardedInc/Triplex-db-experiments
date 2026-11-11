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
