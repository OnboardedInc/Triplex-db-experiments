import fs from "node:fs";
import { measureW0Http } from "./w0-http.ts";
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
  observePage?: (records: readonly any[], page: number, metrics?: any) => void,
): Promise<W0Fingerprint> {
  W0.rung(N);
  await loadW0Pins();
  const worlds = createHash("sha256"),
    outputs = createHash("sha256");
  worlds.update("[");
  outputs.update("[");
  let count = 0,
    facts = 0;
  for (let offset = 0; offset < N; offset += 64) {
    signal.throwIfAborted();
    const subjects = Array.from({ length: Math.min(64, N - offset) }, (_, k) =>
      W0.placementId(offset + k),
    );
    // [DX-H5] Why: the mandatory preview is a no-live calibration on the identical observed rows.
    // Rejected: estimating gateway/client CPU from latency while 64 other readers are running.
    const cpu = () => process.threadCpuUsage();
    const elapsedCpu = (before: ReturnType<typeof cpu>) => {
      const now = cpu();
      return (now.user - before.user + now.system - before.system) / 1000;
    };
    const gateways = () =>
      Object.fromEntries(
        (process.env.TX2_ENGINE_CGROUPS ?? "")
          .split(",")
          .filter(Boolean)
          .map((entry) => {
            const [name, p] = entry.split("=");
            return [
              name,
              Number(fs.readFileSync(p + "/cpu.stat", "utf8").match(/^usage_usec (\d+)$/m)?.[1]),
            ];
          }),
      );
    const gatewayBefore = gateways(),
      readCpuStart = cpu(),
      readStarted = performance.now();
    const measured = await measureW0Http(() => comp.sweepPage(subjects, basis));
    const page = measured.value;
    const readWallMs = performance.now() - readStarted,
      readCpuMs = elapsedCpu(readCpuStart),
      gatewayAfter = gateways();
    let decodeWallMs = 0,
      decodeCpuMs = 0,
      evaluateWallMs = 0,
      evaluateCpuMs = 0,
      hashWallMs = 0,
      hashCpuMs = 0;
    const indexStarted = performance.now(),
      indexCpuStart = cpu();
    if (!Number.isSafeInteger(page.position) || page.position < basis.position)
      throw new FingerprintRefusal("page snapshot unavailable");
    const index = new Map<string, any[]>();
    for (const row of page.rows) {
      const list = index.get(row.entityId) ?? [];
      list.push(row);
      index.set(row.entityId, list);
    }
    const indexWallMs = performance.now() - indexStarted,
      indexCpuMs = elapsedCpu(indexCpuStart);
    const records = [];
    for (const subject of subjects) {
      let wall = performance.now(),
        before = cpu();
      const world = worldOf(subject, reachableRows([subject], page.rows, index));
      decodeWallMs += performance.now() - wall;
      decodeCpuMs += elapsedCpu(before);
      wall = performance.now();
      before = cpu();
      const result = W0.sweepSubject(world, W0.R2, w0Basis(basis));
      evaluateWallMs += performance.now() - wall;
      evaluateCpuMs += elapsedCpu(before);
      wall = performance.now();
      before = cpu();
      if ("error" in result) throw new FingerprintRefusal("kernel: " + result.error);
      worlds.update(count ? "," : "");
      worlds.update(canonical(world));
      outputs.update(count ? "," : "");
      outputs.update(result.json);
      facts += world.facts.length;
      count++;
      records.push({ subject, world, output: result.output, record: result.record });
      hashWallMs += performance.now() - wall;
      hashCpuMs += elapsedCpu(before);
    }
    observePage?.(records, offset / 64, {
      subjects: subjects.length,
      rows: page.rows.length,
      readWallMs,
      readCpuMs,
      indexWallMs,
      indexCpuMs,
      decodeWallMs,
      decodeCpuMs,
      evaluateWallMs,
      evaluateCpuMs,
      hashWallMs,
      hashCpuMs,
      responseBytes: measured.responseBytes,
      requests: measured.requests,
      gatewayMicros: measured.gatewayHeaders ? measured.gatewayMicros : null,
      gatewayReadCpuMicros: Object.fromEntries(
        Object.entries(gatewayAfter).map(([name, value]) => [name, value - gatewayBefore[name]]),
      ),
      gateway: comp.backend.url,
      cpuScope: "main-thread-no-live-preview",
    });
  }
  signal.throwIfAborted();
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
  observePage?: (records: readonly any[], page: number, metrics?: any) => void;
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
    );
    await counts();
    for (const k of ["basisTx", "facts", "worlds", "R2"] as const)
      if (observed[k] !== input.expected[k]) throw new FingerprintRefusal("content mismatch: " + k);
    signal.throwIfAborted();
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
