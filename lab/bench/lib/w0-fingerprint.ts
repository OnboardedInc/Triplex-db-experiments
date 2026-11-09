import { performance } from "node:perf_hooks";
import { createHash } from "node:crypto";
import { W0, canonical, worldOf, reachableRows, w0Basis, type PositionBasis } from "./w0-world.ts";
import type { CompositionHandle } from "./composition.ts";
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
  deadline = Infinity,
): Promise<W0Fingerprint> {
  const check = () => {
    signal.throwIfAborted();
    if (performance.now() >= deadline) throw new FingerprintRefusal("read deadline");
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
export type OpenFingerprintReader = (endpoint: string, scope: string) => Promise<FingerprintReader>;
const openDefault: OpenFingerprintReader = async (endpoint, scope) => {
  const comp =
    endpoint === `memory://${scope}`
      ? (await import("./memory.ts")).memoryComposition("xtdb", scope)
      : await (await import("./composition.ts")).openComposition("public", "xtdb", scope);
  return { endpoint: comp.backend.url, scope, comp, close: () => comp.close() };
};
export async function fingerprintSweep(
  input: FingerprintInput,
  open: OpenFingerprintReader = openDefault,
) {
  const ms = input.deadlineMs ?? 600_000;
  if (
    !Number.isFinite(ms) ||
    ms <= 0 ||
    !input.endpoint ||
    !input.scope ||
    !Number.isSafeInteger(input.expected?.N) ||
    input.expected.N < 50 ||
    input.expected.basisTx !== input.basis.position ||
    !Number.isSafeInteger(input.expected.facts) ||
    input.expected.facts < 1 ||
    ![input.expected.worlds, input.expected.R2].every((d) => /^sha256:[0-9a-f]{64}$/.test(d)) ||
    !Object.keys(input.counts).length ||
    Object.values(input.counts).some((n) => !Number.isSafeInteger(n) || n < 0)
  )
    throw new FingerprintRefusal("invalid pre-pinned expectation");
  const controller = new AbortController(),
    signal = input.signal ? AbortSignal.any([controller.signal, input.signal]) : controller.signal;
  const deadline = performance.now() + ms;
  let timer: ReturnType<typeof setTimeout>;
  let reader: FingerprintReader | undefined;
  const work = async () => {
    reader = await open(input.endpoint, input.scope);
    if (reader.endpoint !== input.endpoint || reader.scope !== input.scope)
      throw new FingerprintRefusal("endpoint/scope binding mismatch");
    const counts = async () => {
      const actual = await reader!.comp.storeCounts();
      for (const [k, v] of Object.entries(input.counts))
        if (actual[k] !== v) throw new FingerprintRefusal("count mismatch: " + k);
    };
    await counts();
    const observed = await readW0Fingerprint(
      reader.comp,
      input.expected.N,
      input.basis,
      signal,
      reader.observePage,
      deadline,
    );
    await counts();
    for (const k of ["basisTx", "facts", "worlds", "R2"] as const)
      if (observed[k] !== input.expected[k]) throw new FingerprintRefusal("content mismatch: " + k);
    signal.throwIfAborted();
    if (performance.now() >= deadline) throw new FingerprintRefusal("read deadline");
    // [EXP-P5-R2] Why: only this complete fresh content comparison grants; process/readiness diagnostics are never inputs. Rejected: accepting an old PASS or matching copy hash (Q93a).
    return {
      status: "complete-and-matching" as const,
      endpoint: input.endpoint,
      scope: input.scope,
      basis: input.basis,
      observed,
    };
  };
  try {
    return await Promise.race([
      work(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new FingerprintRefusal("read deadline"));
        }, ms);
        signal.addEventListener("abort", () => reject(new FingerprintRefusal("aborted")), {
          once: true,
        });
      }),
    ]);
  } catch (e) {
    throw e instanceof FingerprintRefusal ? e : new FingerprintRefusal(String(e));
  } finally {
    clearTimeout(timer!);
    if (reader) await reader.close();
  }
}
