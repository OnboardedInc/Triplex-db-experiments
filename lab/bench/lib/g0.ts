// [EXP-K01-R7] Why: Q93 gives admission only to a fresh in-process content read against a pre-freeze pin. Rejected: transported process booleans, diagnostic equality and owner certificates.
import { createHash } from "node:crypto";
import { storedFields } from "./g0-schema.ts";
export const fields = storedFields;
import type { Catalog } from "./g0-catalog.ts";
export type Table = keyof typeof fields;
export type Counts = Record<Table, number>;
export interface Reader {
  endpoint: string;
  scan(table: Table, scope: string, signal: AbortSignal): AsyncIterable<Record<string, unknown>>;
  count(table: Table, scope: string, signal: AbortSignal, allScopes?: boolean): Promise<number>;
  catalog?(signal: AbortSignal): Promise<Catalog>;
  scopes(signal: AbortSignal): Promise<readonly { scope_key: string; position: number }[]>;
}
export interface Expected {
  scope: string;
  position: number;
  counts: Counts;
  world: "N01" | "W0";
  tables?: Record<string, { written: boolean; columns: Record<string, boolean> }>;
}
export interface W0Fingerprint {
  basisTx: number;
  facts: number;
  worlds: string;
  R2: string;
}
export interface W0Check {
  N: number;
  oracle: any;
  read(signal: AbortSignal): Promise<W0Fingerprint>;
}
export interface Pin extends Expected {
  format: "tx2-g0/1";
  D: string;
  w0?: W0Fingerprint;
  Dprime?: string;
}
export { canonical } from "./g0-values.ts";
import { canonical } from "./g0-values.ts";
import { e1Normalizer, normalization } from "./g0-normalize.ts";
export { normalization } from "./g0-normalize.ts";
export const hash = (value: unknown) => createHash("sha256").update(canonical(value)).digest("hex");
export async function bounded<T>(
  work: (signal: AbortSignal) => Promise<T>,
  ms = 600_000,
): Promise<T> {
  if (!Number.isFinite(ms) || ms <= 0) throw Error("G0 invalid deadline");
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout>;
  try {
    return await Promise.race([
      work(controller.signal),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(Error("G0 read deadline exceeded"));
        }, ms);
      }),
    ]);
  } finally {
    clearTimeout(timer!);
  }
}
// [EXP-K01-R7] Why: share the P5/R34 oracle comparison with the content gate. Rejected: independently maintained admission comparisons.
export function requireW0Fingerprint(observed: W0Fingerprint, oracle: any, N: number): void {
  if (
    oracle.rung?.N !== N ||
    oracle.seed !== "W0-pop-1" ||
    !Object.keys(oracle.sources ?? {}).length ||
    oracle.invalidWorlds?.length !== 0
  )
    throw Error("G0 oracle binding invalid");
  for (const key of ["basisTx", "facts", "worlds", "R2"] as const)
    if (observed[key] === undefined || observed[key] !== oracle.fingerprint?.[key])
      throw Error("G0 O-DOMAIN mismatch: " + key);
}
async function readContent(
  reader: Reader,
  expected: Expected,
  w0?: W0Check,
  ms = 600_000,
  rowRead?: (table: Table, row: Record<string, unknown>) => void,
): Promise<Pin> {
  if (
    !expected.scope ||
    !Number.isSafeInteger(expected.position) ||
    expected.position < 1 ||
    !["N01", "W0"].includes(expected.world)
  )
    throw Error("G0 expected binding missing");
  return bounded(async (signal) => {
    const checkScopes = async () => {
      const scopes = await reader.scopes(signal);
      if (
        scopes.length !== 1 ||
        scopes[0]!.scope_key !== expected.scope ||
        Number(scopes[0]!.position) !== expected.position
      )
        throw Error("G0 foreign scope or wrong position");
    };
    const catalog = reader.catalog ? await reader.catalog(signal) : undefined;
    // [EXP-K01-R13] Why: freeze the observed catalog bytes immediately, even if a Reader reuses a mutable object. Rejected: comparing an earlier reference after it has been changed in place.
    const catalogDigest = catalog === undefined ? undefined : canonical(catalog);
    if (expected.tables && !catalog) throw Error("G0 seed policy requires catalog");
    if (
      expected.tables &&
      Object.keys(expected.tables).sort().join() !== Object.keys(fields).sort().join()
    )
      throw Error("G0 incomplete seed table policy");
    await checkScopes();
    const tables: Record<string, string> = {};
    for (const table of Object.keys(fields) as Table[]) {
      const policy = expected.tables?.[table];
      if (
        policy &&
        (typeof policy.written !== "boolean" ||
          Object.keys(policy.columns).sort().join() !== [...fields[table]].sort().join() ||
          Object.values(policy.columns).some((v) => typeof v !== "boolean"))
      )
        throw Error("G0 incomplete seed column policy");
      if (policy && policy.written !== expected.counts[table] > 0)
        throw Error("G0 seed write/count policy differs");
      if (policy?.written && !catalog![table]) throw Error("G0 missing written table: " + table);
      if (policy && catalog?.[table])
        for (const [c, written] of Object.entries(policy.columns))
          if (
            written &&
            (!Object.hasOwn(catalog[table], c) ||
              catalog[table][c] === ":null" ||
              catalog[table][c] === ":nothing")
          )
            throw Error("G0 missing written column: " + table + "." + c);
      const count = await reader.count(table, expected.scope, signal, policy?.written === false);
      if (!Number.isSafeInteger(count) || count < 0) throw Error("G0 invalid independent count");
      const want = expected.counts[table];
      const core = ["tx_assertions", "tx_claims", "tx_attempts", "tx_meta"].includes(table);
      // [EXP-K01-R12] Why: retain both count observations at the refusing boundary for first-failure diagnosis. Rejected: a table-only error that loses the observed/expected values when cleanup removes the volume.
      if (
        (core || want !== undefined) &&
        (!Number.isSafeInteger(want) || want < (core ? 1 : 0) || count !== want)
      )
        throw Error(
          `G0 count mismatch: ${table} (expected ${want}, observed ${count}; scope ${expected.scope}, position ${expected.position})`,
        );
      // [EXP-K01-R8] Why: auxiliary tables have no N01 closed form; their independently counted complete contents are pinned in D. Rejected: skipping side tables or deriving core expected counts from the scan.
      // [EXP-K01-R7] Why: sort row hashes, preserving multiplicity, to stream pages without retaining full rows. Rejected: a sum/XOR digest (duplicates cancel) or a subject sample (misses changed history).
      const hashes: string[] = [];
      const nonNull = new Set<string>();
      for await (const row of reader.scan(table, expected.scope, signal)) {
        if (signal.aborted || hashes.length >= count) throw Error("G0 extra rows or expired read");
        for (const field of fields[table]) {
          if (!Object.hasOwn(row, field) || row[field] === undefined)
            throw Error("G0 missing field: " + field);
        }
        // [EXP-K01-R8] Why: hash column names and all returned values as well as requiring the declared schema. Rejected: missing schemaless/dynamic side-table bindings that SELECT * returns.
        if (policy)
          for (const [c, written] of Object.entries(policy.columns)) {
            if (row[c] !== null) {
              if (!written) throw Error("G0 unexpected seed column value: " + table + "." + c);
              nonNull.add(c);
            }
          }
        const values = Object.keys(row)
          .sort()
          .map((field) => [field, row[field]]);
        hashes.push(hash(values));
        rowRead?.(table, row);
      }
      if (hashes.length !== count) throw Error("G0 partial/empty scan: " + table);
      if (policy)
        for (const [c, written] of Object.entries(policy.columns))
          if (written && !nonNull.has(c))
            throw Error("G0 unobserved written column: " + table + "." + c);
      tables[table] = hash([fields[table], hashes.sort()]);
    }
    await checkScopes();
    if (catalog && catalogDigest !== canonical(await reader.catalog!(signal)))
      throw Error("G0 catalog changed during read");
    let world: W0Fingerprint | undefined;
    if (expected.world === "W0") {
      if (!w0) throw Error("G0 W0 requires O-DOMAIN");
      world = await w0.read(signal);
      requireW0Fingerprint(world, w0.oracle, w0.N);
    }
    return {
      ...expected,
      format: "tx2-g0/1",
      D: hash([expected, tables, world ?? null]),
      ...(world ? { w0: world } : {}),
    };
  }, ms);
}
export async function readG0(
  reader: Reader,
  expected: Expected,
  w0?: W0Check,
  ms = 600_000,
): Promise<Pin> {
  return readContent(reader, expected, w0, ms);
}
// [EXP-K01-R9] Why: E1 needs a separate normalized view bound to the same full D. Rejected: weakening clone admission or collecting whole tables in memory.
export async function readE1G0(
  reader: Reader,
  expected: Expected,
  w0?: W0Check,
  ms = 600_000,
): Promise<Pin> {
  return bounded(async (signal) => {
    const normal = e1Normalizer();
    const first = await readContent(reader, expected, w0, ms, (t, r) => normal.collect(t, r));
    normal.finish();
    const hashes: Record<string, string[]> = {};
    const second = await readContent(reader, expected, w0, ms, (t, r) => {
      signal.throwIfAborted();
      (hashes[t] ??= []).push(hash(normal.row(t, r)));
    });
    if (first.D !== second.D) throw Error("Dprime source changed during normalization");
    const normalized = Object.fromEntries(
      Object.keys(fields).map((t) => [t, hash([fields[t], (hashes[t] ?? []).sort()])]),
    );
    return {
      ...second,
      Dprime: hash(["tx2-e1/2", normalization, expected, normalized, second.w0 ?? null]),
    };
  }, ms);
}
export async function admitG0(
  reader: Reader,
  pin: Pin,
  expected: Expected,
  w0?: W0Check,
  ms = 600_000,
) {
  if (
    pin?.format !== "tx2-g0/1" ||
    !/^[0-9a-f]{64}$/.test(pin.D) ||
    canonical(expected) !==
      canonical({
        scope: pin.scope,
        position: pin.position,
        counts: pin.counts,
        world: pin.world,
        ...(pin.tables ? { tables: pin.tables } : {}),
      })
  )
    throw Error("G0 pin binding differs from manifest");
  const current = await readG0(reader, expected, w0, ms);
  if (current.D !== pin.D) throw Error("G0 content mismatch");
  return {
    gate: "G0" as const,
    status: "PASS" as const,
    D: current.D,
    endpoint: reader.endpoint,
    checkedAt: new Date().toISOString(),
  };
}
