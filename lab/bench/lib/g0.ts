// [EXP-K01-R7] Why: Q93 gives admission only to a fresh in-process content read against a pre-freeze pin. Rejected: transported process booleans, diagnostic equality and owner certificates.
import { createHash } from "node:crypto";
import { storedFields } from "./g0-schema.ts";
export const fields = storedFields;
export type Table = keyof typeof fields;
export type Counts = Record<Table, number>;
export interface Reader {
  endpoint: string;
  scan(table: Table, scope: string, signal: AbortSignal): AsyncIterable<Record<string, unknown>>;
  count(table: Table, scope: string, signal: AbortSignal): Promise<number>;
  scopes(signal: AbortSignal): Promise<readonly { scope_key: string; position: number }[]>;
}
export interface Expected {
  scope: string;
  position: number;
  counts: Counts;
  world: "N01" | "W0";
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
}
export const canonical = (value: unknown): string =>
  JSON.stringify(value, (_k, v) => {
    if (v === undefined || (typeof v === "number" && !Number.isFinite(v)))
      throw Error("G0 unsupported/missing value");
    if (typeof v === "bigint") {
      const n = Number(v);
      if (!Number.isSafeInteger(n)) throw Error("G0 unsafe integer");
      return n;
    }
    return v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(
          Object.keys(v)
            .sort()
            .map((k) => [k, v[k]]),
        )
      : v;
  });
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
export async function readG0(
  reader: Reader,
  expected: Expected,
  w0?: W0Check,
  ms = 600_000,
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
    await checkScopes();
    const tables: Record<string, string> = {};
    for (const table of Object.keys(fields) as Table[]) {
      const count = await reader.count(table, expected.scope, signal);
      if (!Number.isSafeInteger(count) || count < 0) throw Error("G0 invalid independent count");
      const want = expected.counts[table];
      const core = ["tx_assertions", "tx_claims", "tx_attempts", "tx_meta"].includes(table);
      if (
        (core || want !== undefined) &&
        (!Number.isSafeInteger(want) || want < (core ? 1 : 0) || count !== want)
      )
        throw Error("G0 count mismatch: " + table);
      // [EXP-K01-R8] Why: auxiliary tables have no N01 closed form; their independently counted complete contents are pinned in D. Rejected: skipping side tables or deriving core expected counts from the scan.
      // [EXP-K01-R7] Why: sort row hashes, preserving multiplicity, to stream pages without retaining full rows. Rejected: a sum/XOR digest (duplicates cancel) or a subject sample (misses changed history).
      const hashes: string[] = [];
      for await (const row of reader.scan(table, expected.scope, signal)) {
        if (signal.aborted || hashes.length >= count) throw Error("G0 extra rows or expired read");
        for (const field of fields[table]) {
          if (!Object.hasOwn(row, field) || row[field] === undefined)
            throw Error("G0 missing field: " + field);
        }
        // [EXP-K01-R8] Why: hash column names and all returned values as well as requiring the declared schema. Rejected: missing schemaless/dynamic side-table bindings that SELECT * returns.
        const values = Object.keys(row)
          .sort()
          .map((field) => [field, row[field]]);
        hashes.push(hash(values));
      }
      if (hashes.length !== count) throw Error("G0 partial/empty scan: " + table);
      tables[table] = hash([fields[table], hashes.sort()]);
    }
    await checkScopes();
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
      canonical({ scope: pin.scope, position: pin.position, counts: pin.counts, world: pin.world })
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
