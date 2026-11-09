import { Cause, Effect, Stream } from "effect";
import type { KvBackendService, KvEntry, KvTransaction, RangeOptions } from "../kv/KvBackend.js";
import type { TripleStoreRuntimeService } from "../../store/TripleStoreRuntime.js";
import { InvalidTripleError } from "../../errors/index.js";
import type { ValueDomain } from "../../ValueDomain.js";

export const invalidKvEntry = (
  domain: ValueDomain,
  key: Uint8Array,
  value: Uint8Array | null,
  original: unknown,
): InvalidTripleError | undefined => {
  const limits = domain.storage;
  return limits &&
    (key.length + limits.subspaceBytes > limits.maxKeyBytes ||
      (value?.length ?? 0) > limits.maxValueBytes)
    ? new InvalidTripleError({
        field: "value",
        value: original,
        message: `Encoded KV entry exceeds ${domain.id}'s key/value byte limit`,
      })
    : undefined;
};

const compare = (a: Uint8Array, b: Uint8Array): number => {
  for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) return a[i]! - b[i]!;
  return a.length - b.length;
};
const keyId = (key: Uint8Array) => Array.from(key).join(",");

// [EXP-GS12F-R4] Why: byte-check the actual META, index and journal mutations before flushing any claim.
// Rejected: measuring only user JSON (it omits header, escaped index, journal and subspace bytes).
export const bufferKvTransaction = (
  base: KvTransaction,
  domain: ValueDomain,
  subject: () => unknown,
) => {
  const pending = new Map<string, { key: Uint8Array; value: Uint8Array | null }>();
  const mutations: { key: Uint8Array; value: Uint8Array | null }[] = [];
  let bytes = 0;
  const mutate = (key: Uint8Array, value: Uint8Array | null) =>
    Effect.suspend(() => {
      const invalid = invalidKvEntry(domain, key, value, subject());
      if (invalid) return Effect.fail(invalid);
      const limits = domain.storage!;
      bytes +=
        key.length + (value?.length ?? 0) + limits.subspaceBytes + limits.mutationOverheadBytes;
      if (bytes > limits.maxMutationBytes)
        return Effect.fail(
          new InvalidTripleError({
            field: "value",
            value: subject(),
            message: `Encoded KV mutations exceed ${domain.id}'s transaction byte budget`,
          }),
        );
      const mutation = { key: key.slice(), value: value?.slice() ?? null };
      mutations.push(mutation);
      pending.set(keyId(key), mutation);
      return Effect.void;
    });
  // [EXP-GS12F-R4] Why: KvTransaction has no error parameter; the runner restores this typed error.
  // Rejected: Effect.orDie (it turns an unholdable value back into a backend defect).
  const tx = {
    get: (key: Uint8Array) =>
      Effect.suspend(() =>
        pending.has(keyId(key)) ? Effect.succeed(pending.get(keyId(key))!.value) : base.get(key),
      ),
    set: (key: Uint8Array, value: Uint8Array) => mutate(key, value),
    delete: (key: Uint8Array) => mutate(key, null),
    getRange: (options: RangeOptions) =>
      Stream.unwrap(
        Effect.gen(function* () {
          const { limit, ...range } = options;
          const rows = yield* Stream.runCollect(base.getRange(range));
          const merged = new Map(rows.map(([key, value]) => [keyId(key), { key, value }]));
          for (const [id, row] of pending) {
            if (compare(row.key, options.start) < 0 || compare(row.key, options.end) >= 0) continue;
            if (row.value === null) merged.delete(id);
            else merged.set(id, { key: row.key, value: row.value });
          }
          let result: KvEntry[] = [...merged.values()]
            .sort((a, b) => compare(a.key, b.key))
            .map(({ key, value }) => [key, value] as const);
          if (options.reverse) result.reverse();
          if (limit !== undefined) result = result.slice(0, limit);
          return Stream.fromIterable(result);
        }),
      ),
  };
  return {
    tx: tx as unknown as KvTransaction,
    flush: () =>
      Effect.forEach(
        mutations,
        ({ key, value }) => (value === null ? base.delete(key) : base.set(key, value)),
        { discard: true },
      ),
  };
};

// [EXP-GS12F-R4] Why: size admission runs outside the write callback, replaying identical generated IDs/time.
// Rejected: adopting the preliminary reads as a semantic snapshot (all truth checks rerun in the real transaction).
export const admitKvTransaction = <A, E>(
  backend: KvBackendService,
  runtime: TripleStoreRuntimeService,
  work: (tx: KvTransaction, runtime: TripleStoreRuntimeService) => Effect.Effect<A, E>,
  subject: () => unknown,
): Effect.Effect<A, E | InvalidTripleError> =>
  Effect.suspend(() => {
    const domain = backend.valueDomain;
    if (!domain?.storage) return backend.transact((tx) => work(tx, runtime));
    const ids: import("../../Branded.js").TripleId[] = [];
    let cursor = 0;
    return Effect.gen(function* () {
      const txId = yield* runtime.nextTxId;
      const now = yield* runtime.now;
      const replayRuntime = {
        ...runtime,
        nextTxId: Effect.succeed(txId),
        now: Effect.succeed(now),
        nextTripleId: Effect.suspend(() => {
          const index = cursor++;
          if (ids[index] !== undefined) return Effect.succeed(ids[index]!);
          return runtime.nextTripleId.pipe(
            Effect.tap((id) =>
              Effect.sync(() => {
                ids[index] = id;
              }),
            ),
          );
        }),
      };
      const normalize = (effect: Effect.Effect<A, E>): Effect.Effect<A, E | InvalidTripleError> =>
        effect.pipe(
          Effect.catchCause((cause): Effect.Effect<never, E | InvalidTripleError> => {
            const error = Cause.squash(cause);
            return error instanceof InvalidTripleError
              ? Effect.fail(
                  new InvalidTripleError({
                    field: "value",
                    value: subject(),
                    message: error.message,
                  }),
                )
              : Effect.failCause(cause);
          }),
        );
      const readOnly: KvTransaction = {
        get: (key) =>
          key.length === 1 && key[0] === 0x21
            ? Effect.succeed(new TextEncoder().encode(String(Number.MAX_SAFE_INTEGER - 1)))
            : backend.get(key),
        getRange: backend.getRange,
        set: () => Effect.die("preflight must not write"),
        delete: () => Effect.die("preflight must not delete"),
      };
      const preview = bufferKvTransaction(readOnly, domain, subject);
      const preliminary = yield* normalize(work(preview.tx, replayRuntime)).pipe(Effect.result);
      if (preliminary._tag === "Failure" && preliminary.failure instanceof InvalidTripleError)
        return yield* Effect.fail(preliminary.failure);
      cursor = 0;
      return yield* backend.transact((tx) => {
        cursor = 0;
        const buffered = bufferKvTransaction(tx, domain, subject);
        return normalize(work(buffered.tx, replayRuntime)).pipe(Effect.tap(() => buffered.flush()));
      });
    });
  });
