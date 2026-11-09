// [EXP-QH1] Why: fresh independent O-REPLAY answers bind the exact generated intent/receipts/cuts.
// Rejected: comparing candidate rows with an in-process fold or adopting a historical oracle PASS.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { Option } from "effect";
import { expect, it } from "vitest";
import { sqliteWorker } from "../../../packages/qlever/src/broker/sqlite-worker.js";
import { H1Dictionary, h1Rows, resolveDictionary, wholePullTuples } from "../../../packages/qlever/src/broker/h1.js";
import { openWorker } from "./worker-client.js";
import { row, base } from "./helpers.js";
const canonical = (x: any): string => JSON.stringify(normal(x));
function numberBits(n: number) {
  const d = new DataView(new ArrayBuffer(8));
  d.setFloat64(0, n);
  return "0x" + d.getBigUint64(0).toString(16).padStart(16, "0");
}
function normal(x: any): any {
  return Array.isArray(x)
    ? x.map(normal)
    : x && typeof x === "object"
      ? Object.fromEntries(
          Object.keys(x)
            .sort()
            .map((k) => [k, normal(x[k])]),
        )
      : x;
}
it("G4: 100000 sampled H1w pulls have zero differences against fresh O-REPLAY", async () => {
  const mutant = process.env.QH1_MUTANT;
  let source = sqliteWorker;
  if (mutant === "real") source = source.replace(`ELSE printf('%!.17g',"+x+") END`, `ELSE "+x+" END`);
  if (mutant === "owner")
    source = source.replace("frontier=next.filter(e=>!seen.has(e));", "frontier=[];");
  if (mutant === "retraction")
    source = source.replace(
      "(t==='history'?' AND rpos>@b':'')",
      "(t==='history'?' AND rpos>=@b':'')",
    );
  if (mutant === "purge")
    source = source.replace("if(b<m.h)throw Error('H1_SNAPSHOT_EXPIRED');", "");
  const client = await openWorker(source),
    commands: any[] = [],
    receipts: any[] = [],
    entities = new Set<string>(),
    byId = new Map<string, any>();
  let id = 0;
  const make = (e: string, a: string, value: any, validTo: number | null = null) => {
    const r = {
      ...row(++id, e, 1024),
      id: "r" + id,
      attribute: a,
      value_type: value.type,
      value_number: null,
      value_string: null,
      value_boolean: null,
      valid_to: validTo,
    };
    (r as any)[
      value.type === "ref" || value.type === "integer" ? "value_string" : "value_" + value.type
    ] = value.type === "boolean" ? Number(value.value) : value.value;
    entities.add(e);
    byId.set(r.id, r);
    return r;
  };
  const initial = [];
  for (let i = 0; i < 30; i++) {
    const root = "s:" + i,
      child = root + "/a:1";
    initial.push(
      make(root, ":x/ref", { type: "ref", value: child }),
      make(root, ":x/value", { type: "number", value: 0.30000000000000004 + i }),
      make(child, ":x/ref", { type: "ref", value: "external/shared" }),
      make(child, ":x/cycle", { type: "ref", value: root }),
      make(child, ":x/expired", { type: "string", value: "expired" }, 150),
    );
  }
  initial.push(make("external/shared", ":x/value", { type: "string", value: "hé😀" }));
  const second = initial
    .filter((r) => r.attribute === ":x/value" && r.entity_id.startsWith("s:"))
    .slice(0, 6)
    .map((r) => ({ ...r, retracted_position: 2048, retracted_at: 200, retract_tx_id: "tx:2048" }));
  const third = [make("s:0", ":x/new", { type: "boolean", value: true })].map((r) => ({
    ...r,
    recorded_position: 3072,
    recorded_at: 300,
    tx_id: "tx:3072",
  }));
  try {
    for (const [index, rs] of [initial, second, third].entries()) {
      const p = index + 1,
        operations = rs.map((r) =>
          r.retracted_position !== null
            ? { op: "retract", id: r.id }
            : {
                op: "assert",
                entityId: r.entity_id,
                attribute: r.attribute,
                value: {
                  type: r.value_type,
                  value:
                    r.value_type === "boolean"
                      ? !!r.value_boolean
                      : (r as any)[
                          r.value_type === "ref" ? "value_string" : "value_" + r.value_type
                        ],
                },
                validFrom: r.valid_from,
                ...(r.valid_to === null ? {} : { validTo: r.valid_to }),
              },
        );
      commands.push({ kind: "transact", scope: "s1", operations, meta: { commandId: "cmd" + p } });
      receipts.push({
        command: index,
        outcome: "committed",
        txId: "tx:" + p * 1024,
        position: p,
        instant: p * 100,
        assertionIds: rs.map((r) => (r.retracted_position !== null ? null : r.id)),
      });
      await client.append(rs);
    }
    const queries = [];
    for (const p of [1, 2, 3])
      for (const v of [100, 200])
        for (const entity of entities)
          queries.push({
            id: `${p}|${v}|${entity}`,
            kind: "entityTriples",
            entityId: entity,
            cut: { scope: "s1", position: p, validAt: v },
          });
    const doc = {
      format: "triplex-db-2/o-replay-case/1",
      adapter: { schemaVersion: 1 },
      caseId: "QH1-" + path.basename(client.dir),
      defaultScope: "s1",
      initialPositions: { s1: 0 },
      commands,
      receipts,
      queries,
    };
    const caseFile = path.join(client.dir, "oracle-case.json"),
      expectedFile = path.join(client.dir, "oracle-expected.json");
    fs.writeFileSync(caseFile, JSON.stringify(doc));
    execFileSync(
      "python3",
      [
        "-I",
        path.resolve("lab/oracles/replay/cli.py"),
        caseFile,
        "-o",
        expectedFile,
        "--lane",
        "qlever",
      ],
      { stdio: "pipe" },
    );
    const oracle = JSON.parse(fs.readFileSync(expectedFile, "utf8"));
    expect(oracle.verdict).toBe("PASS");
    expect(oracle.receiptConsistency.status).toBe("PASS");
    expect(oracle.queries.length).toBe(queries.length);
    const expected = new Map<string, any[]>();
    for (const q of oracle.queries) {
      expect(q.error).toBeUndefined();
      expect(q.result.snapshot).toBeDefined();
      expected.set(q.id, q.result.snapshot);
    }
    const project = (r: any) => {
      const { recordedPosition: _, retractedPosition: __, ...rest } = r;
      return rest;
    };
    const publicRow = (t: any) => ({
      id: t.id,
      entityId: t.entityId,
      attribute: t.attribute,
      value: t.value.type === "number" ? { ...t.value, bits: numberBits(t.value.value) } : t.value,
      recordedAt: t.recordedAt,
      validFrom: t.validFrom,
      validTo: Option.getOrNull(t.validTo),
      createdBy: Option.getOrNull(t.createdBy),
      entityType: Option.getOrNull(t.entityType),
      schemaVersion: Option.getOrNull(t.schemaVersion),
      txId: Option.getOrNull(t.txId),
      retractedAt: Option.getOrNull(t.retractedAt),
      retractTxId: Option.getOrNull(t.retractTxId),
    });
    const oraclePull = (root: string, p: number, v: number) => {
      const seen = new Set<string>(),
        out: any[] = [];
      let todo = [root];
      while (todo.length) {
        const next: string[] = [];
        for (const entity of todo) {
          if (seen.has(entity)) continue;
          seen.add(entity);
          for (const r of expected.get(`${p}|${v}|${entity}`) ?? []) {
            out.push(project(r));
            if (r.value.type === "ref") next.push(r.value.value);
          }
        }
        todo = next;
      }
      return canonical(out.sort((a, b) => a.id.localeCompare(b.id)));
    };
    const reference = new Map<string, string>();
    for (let root = 0; root < 30; root++)
      for (const p of [1, 2, 3])
        for (const v of [100, 200])
          reference.set(`${root}|${p}|${v}`, oraclePull("s:" + root, p, v));
    const count = Number(process.env.QH1_PULLS ?? 100000);
    const dictionary = new H1Dictionary();
    const observedCuts = new Set<string>();
    let seed = 8901,
      compared = 0;
    for (let i = 0; i < count; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const root = seed % 30,
        p = i % 100 < 80 ? 3 : i % 100 < 95 ? 2 : 1,
        v = i % 2 ? 100 : 200;
      const answer = await client.call("wholePull", { basis: p * 1024, roots: ["s:" + root] });
      // Owner fetch is a superset: reconstruct reach through the per-hop API semantics.
      const tuples = wholePullTuples(answer);
      await resolveDictionary(dictionary, tuples, `${answer.snapshot.epoch}:${answer.schema}`, (r) =>
        client.call("names", r),
      );
      const observed = [...h1Rows(tuples, { validAt: v }, dictionary).values()].flat();
      const byEntity = new Map<string, any[]>();
      for (const t of observed) {
        const a = byEntity.get(t.entityId) ?? [];
        a.push(t);
        byEntity.set(t.entityId, a);
      }
      let todo = ["s:" + root],
        out: any[] = [],
        seen = new Set<string>();
      while (todo.length) {
        const next: string[] = [];
        for (const e of todo) {
          if (seen.has(e)) continue;
          seen.add(e);
          for (const t of byEntity.get(e) ?? []) {
            out.push(publicRow(t));
            if (t.value.type === "ref") next.push(t.value.value);
          }
        }
        todo = next;
      }
      expect(
        canonical(out.sort((a, b) => a.id.localeCompare(b.id))),
        `sample ${i}/${root}/${p}/${v}`,
      ).toBe(reference.get(`${root}|${p}|${v}`));
      observedCuts.add(`${root}|${p}|${v}`);
      compared++;
    }
    await client.call("purge", 3072);
    await expect(client.call("wholePull", { basis: 1024, roots: ["s:0"] })).rejects.toThrow(
      "H1_SNAPSHOT_EXPIRED",
    );
    fs.writeFileSync(
      path.join(base, "oreplay.json"),
      JSON.stringify({
        diagnostic: true,
        compared,
        mismatches: 0,
        fixtureRoots: 30,
        uniqueRootCuts: observedCuts.size,
        availableReferenceCuts: 180,
        seed: 8901,
        basisMix: [80, 15, 5],
        oracle: oracle.oracle,
        caseSha256: createHash("sha256").update(fs.readFileSync(caseFile)).digest("hex"),
        expectedSha256: createHash("sha256").update(fs.readFileSync(expectedFile)).digest("hex"),
        caseFile,
        expectedFile,
      }),
    );
  } finally {
    await client.close();
  }
}, 300000);
