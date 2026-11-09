import { performance } from "node:perf_hooks";
import { createHash } from "node:crypto";
import { W0, canonical, worldOf, reachableRows, w0Basis, type PositionBasis } from "./w0-world.ts";
import type { CompositionHandle } from "./composition.ts";
import {
  admitG0,
  readG0,
  fields,
  type Pin,
  type Reader,
  type Expected,
  type W0Check,
} from "./g0.ts";
import { loadW0Pins } from "./evaluate.ts";
export interface W0Fingerprint {
  basisTx: number;
  facts: number;
  worlds: string;
  R2: string;
}
export interface FingerprintInput {
  endpoint: string;
  scope: string;
  basis: PositionBasis;
  expected: W0Fingerprint & { N: number };
  counts: Record<string, number>;
  deadlineMs?: number;
  signal?: AbortSignal;
  pin?: Pin;
}
export class FingerprintRefusal extends Error {
  readonly _tag = "FingerprintRefusal";
  readonly reason: string;
  constructor(reason: string) {
    super(reason);
    this.reason = reason;
  }
}
export async function readW0Fingerprint(
  comp: CompositionHandle,
  N: number,
  basis: PositionBasis,
  signal: AbortSignal,
  observePage?: (records: readonly any[], page: number) => void,
): Promise<W0Fingerprint> {
  const check = () => {
    signal.throwIfAborted();
  };
  check();
  W0.rung(N);
  await loadW0Pins();
  const worlds = createHash("sha256"),
    outputs = createHash("sha256");
  worlds.update("[");
  outputs.update("[");
  let count = 0,
    facts = 0;
  for (let offset = 0; offset < N; offset += 64) {
    check();
    const subjects = Array.from({ length: Math.min(64, N - offset) }, (_, k) =>
      W0.placementId(offset + k),
    );
    const page = await comp.sweepPage(subjects, basis);
    if (!Number.isSafeInteger(page.position) || page.position < basis.position)
      throw new FingerprintRefusal("page snapshot unavailable");
    const index = new Map<string, any[]>();
    for (const row of page.rows) {
      const list = index.get(row.entityId) ?? [];
      list.push(row);
      index.set(row.entityId, list);
    }
    const records = [];
    for (const subject of subjects) {
      check();
      const world = worldOf(subject, reachableRows([subject], page.rows, index));
      const result = W0.sweepSubject(world, W0.R2, w0Basis(basis));
      if ("error" in result) throw new FingerprintRefusal("kernel: " + result.error);
      worlds.update(count ? "," : "");
      worlds.update(canonical(world));
      outputs.update(count ? "," : "");
      outputs.update(result.json);
      facts += world.facts.length;
      count++;
      records.push({ subject, world, output: result.output, record: result.record });
    }
    // [EXP-P5-R2] Why: a CPU-only page may starve a timer signal; yield and also check elapsed monotonic time. Rejected: timer-only Promise.race (can grant after its deadline).
    await new Promise<void>((resolve) => setImmediate(resolve));
    check();
    observePage?.(records, offset / 64);
  }
  check();
  if (count !== N) throw new FingerprintRefusal("incomplete coverage");
  worlds.update("]");
  outputs.update("]");
  return {
    basisTx: basis.position,
    facts,
    worlds: "sha256:" + worlds.digest("hex"),
    R2: "sha256:" + outputs.digest("hex"),
  };
}
export interface FingerprintReader {
  endpoint: string;
  scope: string;
  comp: CompositionHandle;
  close(): Promise<void>;
  observePage?: (records: readonly any[], page: number) => void;
}
export type OpenFingerprintReader = (
  endpoint: string,
  scope: string,
  signal?: AbortSignal,
) => Promise<FingerprintReader>;
const openDefault: OpenFingerprintReader = async (endpoint, scope, signal) => {
  signal?.throwIfAborted();
  const comp =
    endpoint === `memory://${scope}`
      ? (await import("./memory.ts")).memoryComposition("xtdb", scope)
      : await (await import("./composition.ts")).openComposition("public", "xtdb", scope);
  return { endpoint: comp.backend.url, scope, comp, close: () => comp.close() };
};
// [EXP-P5-R3] Why: one admission coordinator owns D and W0 comparison; this module only streams the subordinate world component. Rejected: a second snapshot-only admission digest (F1).
export function w0Check(
  comp: CompositionHandle,
  input: FingerprintInput,
  observer?: FingerprintReader["observePage"],
): W0Check {
  return {
    N: input.expected.N,
    oracle: {
      rung: { N: input.expected.N },
      seed: "W0-pop-1",
      sources: { binding: "pre-pinned P5 expectation" },
      invalidWorlds: [],
      fingerprint: input.expected,
    },
    read: (signal) => readW0Fingerprint(comp, input.expected.N, input.basis, signal, observer),
  };
}
export async function freezeMemoryG0(
  comp: CompositionHandle,
  input: FingerprintInput,
): Promise<Pin> {
  if (!comp.g0Reader) throw new FingerprintRefusal("full-content reader required");
  const reader = comp.g0Reader(input.scope),
    counts: Record<string, number> = {};
  for (const t of Object.keys(fields))
    counts[t] = await reader.count(t, input.scope, new AbortController().signal);
  return readG0(
    reader,
    { scope: input.scope, position: input.basis.position, world: "W0", counts },
    w0Check(comp, input),
    input.deadlineMs,
  );
}
export async function fingerprintSweep(
  input: FingerprintInput,
  open: OpenFingerprintReader = openDefault,
) {
  const ms = input.deadlineMs ?? 600_000;
  if (!Number.isFinite(ms) || ms <= 0) throw new FingerprintRefusal("invalid read deadline");
  const deadline = performance.now() + ms,
    controller = new AbortController();
  const signal = input.signal
    ? AbortSignal.any([controller.signal, input.signal])
    : controller.signal;
  const refusal = () =>
    controller.signal.aborted
      ? new FingerprintRefusal("read deadline")
      : new FingerprintRefusal("aborted");
  const check = () => {
    if (signal.aborted) throw refusal();
    if (performance.now() >= deadline) {
      controller.abort();
      throw refusal();
    }
  };
  const timer = setTimeout(() => controller.abort(), ms);
  let rejectAbort!: () => void;
  const aborted = new Promise<never>((_resolve, reject) => {
    rejectAbort = () => reject(refusal());
    signal.addEventListener("abort", rejectAbort, { once: true });
    if (signal.aborted) rejectAbort();
  });
  void aborted.catch(() => {});
  const within = async <T>(work: () => Promise<T>): Promise<T> => {
    check();
    const value = await Promise.race([
      Promise.resolve().then(() => {
        check();
        return work();
      }),
      aborted,
    ]);
    check();
    return value;
  };
  const owned = new Set<{ close(): Promise<void> }>(),
    closing = new Map<object, Promise<void>>();
  const closeOnce = (resource: { close(): Promise<void> }) => {
    let promise = closing.get(resource);
    if (!promise) {
      promise = Promise.resolve().then(() => resource.close());
      closing.set(resource, promise);
    }
    return promise;
  };
  // [EXP-P5-R4] Why: a cancelled open may still resolve; ownership starts on resolution and always schedules exactly one close. Rejected: assigning only the winning raced result (leaks late readers).
  const acquire = async <T extends { close(): Promise<void> }>(openResource: () => Promise<T>) =>
    within(async () => {
      const resource = await openResource();
      owned.add(resource);
      try {
        check();
      } catch (error) {
        await closeOnce(resource);
        throw error;
      }
      return resource;
    });
  let candidate: any,
    failure: unknown,
    failed = false;
  try {
    if (!input.pin) throw new FingerprintRefusal("pre-freeze full-content pin required");
    const h = await acquire(() => open(input.endpoint, input.scope, signal));
    if (
      h.endpoint !== input.endpoint ||
      h.scope !== input.scope ||
      h.comp.backend.url !== input.endpoint
    )
      throw new FingerprintRefusal("endpoint/scope binding mismatch");
    let reader: Reader;
    if (h.comp.g0Reader) reader = h.comp.g0Reader(input.pin.scope);
    else {
      const g = await acquire(async () => {
        const module = await import("./g0-xtdb.ts");
        check();
        return module.openG0(input.endpoint);
      });
      reader = {
        ...g.reader,
        scopes: async (signal) =>
          (await g.reader.scopes(signal)).map((r) => ({
            ...r,
            scope_key: r.scope_key === g.scopeKey(input.scope) ? input.pin!.scope : r.scope_key,
          })),
        scan: (t, _s, signal) => g.reader.scan(t, input.scope, signal),
        count: (t, _s, signal) => g.reader.count(t, input.scope, signal),
      };
    }
    if (reader.endpoint !== input.endpoint)
      throw new FingerprintRefusal("full-content reader endpoint binding mismatch");
    const expected: Expected = {
      scope: input.pin.scope,
      position: input.basis.position,
      world: "W0",
      counts: input.pin.counts,
    };
    const source = reader;
    reader = {
      endpoint: source.endpoint,
      scopes: (inner) => within(() => source.scopes(AbortSignal.any([signal, inner]))),
      count: (t, scope, inner) =>
        within(() => source.count(t, scope, AbortSignal.any([signal, inner]))),
      async *scan(t, scope, inner) {
        check();
        for await (const row of source.scan(t, scope, AbortSignal.any([signal, inner]))) {
          check();
          yield row;
        }
        check();
      },
    };
    const checked = w0Check(h.comp, input, h.observePage),
      read = checked.read;
    checked.read = (inner) => within(() => read(AbortSignal.any([signal, inner])));
    const counts = await within(() => h.comp.storeCounts(signal));
    for (const [k, v] of Object.entries(input.counts))
      if (counts[k] !== v) throw new FingerprintRefusal("count mismatch: " + k);
    // [EXP-P5-R4] Why: opening and count observations spend the same absolute budget as D. Rejected: restarting deadlineMs at the inner coordinator (F5).
    const admission = await within(() =>
      admitG0(reader, input.pin!, expected, checked, deadline - performance.now()),
    );
    const endCounts = await within(() => h.comp.storeCounts(signal));
    for (const [k, v] of Object.entries(input.counts))
      if (endCounts[k] !== v) throw new FingerprintRefusal("end count mismatch: " + k);
    candidate = {
      status: "complete-and-matching" as const,
      endpoint: input.endpoint,
      scope: input.scope,
      basis: input.basis,
      observed: input.pin.w0,
      counts: { start: counts, end: endCounts },
      admission,
    };
  } catch (e) {
    failure = e;
    failed = true;
  } finally {
    // [EXP-P5-R4] Why: close every acquired handle even if one close fails, and never grant while cleanup exceeds freshness. Rejected: serial finally closes (a first failure skips the second).
    const cleanup = Promise.allSettled([...owned].map(closeOnce)).then((results) => {
      const bad = results.find((r) => r.status === "rejected");
      if (bad?.status === "rejected") throw bad.reason;
    });
    try {
      await Promise.race([cleanup, aborted]);
    } catch (error) {
      if (!failed) failure = error;
      failed = true;
    }
    clearTimeout(timer);
    signal.removeEventListener("abort", rejectAbort);
  }
  if (failed)
    throw failure instanceof FingerprintRefusal ? failure : new FingerprintRefusal(String(failure));
  check();
  return candidate as {
    status: "complete-and-matching";
    endpoint: string;
    scope: string;
    basis: PositionBasis;
    observed: Pin["w0"];
    counts: { start: Record<string, number>; end: Record<string, number> };
    admission: Awaited<ReturnType<typeof admitG0>>;
  };
}
