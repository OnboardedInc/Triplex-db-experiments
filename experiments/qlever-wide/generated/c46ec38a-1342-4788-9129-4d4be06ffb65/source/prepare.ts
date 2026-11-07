/** Offline packet preparation only: no network, process controls or database writes. */
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { DatabaseScope } from "../../packages/core/dist/runtime/index.js";
import type { DatalogQuery } from "../../packages/core/dist/datalog/index.js";
import { integer } from "../../packages/core/dist/index.js";
import { compileWideCandidate, type Strategy } from "./candidates.js";
import { compilePersistedCandidate } from "./canonical-source.js";

const root = path.resolve(import.meta.dirname, "../..");
const runId = randomUUID();
const output = path.join(import.meta.dirname, "generated", runId);
mkdirSync(output, { recursive: true });
const put = (name: string, text: string) =>
  writeFileSync(path.join(output, name), text, { flag: "wx" });
const fixtureBytes = readFileSync(
  path.join(root, "qualification/workloads/temporal-workloads.json"),
);
const packet = JSON.parse(fixtureBytes.toString());
const workload = packet.workloads.find((entry: { id: string }) => entry.id === "17");
assert.ok(workload);
const scalarScope = DatabaseScope.test("qlever-case-4a742ee1-307a-4779-b92d-11dbecb7457d");
const scalarFields = [
  [":conf/code", "?code", "007"],
  [":conf/count", "?count", 7],
  [":conf/enabled", "?enabled", true],
  [":conf/instant", "?instant", 1700000000000],
  [":conf/data", "?data", '{"ok":true}'],
  [":conf/owner", "?owner", "7"],
  [":conf/blob", "?blob", "sha256:artifact"],
] as const;
const attribute = (field: string) => `:w17/a${Buffer.from(field).toString("hex")}`;
const events = [...workload.events].reverse();
const funnelFacts = events.flatMap((event: any) =>
  Object.entries(event.payload).map(([field, value]: [string, any]) => ({
    entityId: event.id,
    attribute: attribute(field),
    value: value.tag === "i64" ? integer(value.value) : { type: "string", value: value.value },
    validFrom: 1000000 + Number(event.occurred_at),
  })),
);
assert.equal(funnelFacts.length, 36);
const oracle = (steps: number, upper: bigint, session?: string) => {
  const grouped = new Map<string, Map<string, bigint[]>>();
  for (const event of workload.events) {
    const key = event.payload.session.value;
    const step = event.payload.step.value;
    const at = BigInt(event.payload.at.value);
    if (at < 0n || at >= upper || (session !== undefined && key !== session)) continue;
    if (!grouped.has(key)) grouped.set(key, new Map());
    const byStep = grouped.get(key)!;
    byStep.set(step, [...(byStep.get(step) ?? []), at]);
  }
  const names = ["view", "checkout", "payment"].slice(0, steps);
  const accepts = (groups: Map<string, bigint[]>, index: number, previous: bigint): boolean =>
    index === names.length ||
    (groups.get(names[index]!) ?? []).some((at) => at > previous && accepts(groups, index + 1, at));
  return [...grouped]
    .filter(([, groups]) => accepts(groups, 0, -1n))
    .map(([name]) => name)
    .sort();
};
assert.deepEqual(oracle(3, 40n), ["S"]);
assert.deepEqual(oracle(3, 41n), ["S", "U"]);
assert.deepEqual(oracle(3, 40n, "equal"), []);
const funnel = (steps: number, upper: string, session?: string): DatalogQuery => {
  const where: unknown[] = [];
  for (const [event, step, time] of [
    ["?view", "view", "?v"],
    ["?checkout", "checkout", "?c"],
    ["?payment", "payment", "?p"],
  ].slice(0, steps))
    where.push(
      [event, attribute("session"), "?session"],
      [event, attribute("step"), step],
      [event, attribute("at"), time],
      [">=", time, integer("0")],
      ["<", time, integer(upper)],
    );
  if (steps >= 2) where.push(["<", "?v", "?c"]);
  if (steps >= 3) where.push(["<", "?c", "?p"]);
  if (session !== undefined) where.push(["=", "?session", session]);
  return { find: ["?session"], where } as DatalogQuery;
};
const cases: {
  id: string;
  query: DatalogQuery;
  scope: string;
  basis: { validAt: number; recordedPosition: number; recordedAt?: number };
  expected: unknown[];
}[] = [];
for (const width of [1, 2, 4, 6, 7]) {
  const fields = scalarFields.slice(0, width);
  cases.push({
    id: `scalar-${width}`,
    query: {
      find: ["?entity", ...fields.map(([, variable]) => variable)],
      where: fields.map(([attribute, variable]) => ["?entity", attribute, variable]),
    },
    scope: scalarScope,
    basis: { validAt: Number.MAX_SAFE_INTEGER, recordedPosition: 1 },
    expected: [
      Object.fromEntries([
        ["?entity", "42"],
        ...fields.map(([, variable, value]) => [variable, value]),
      ]),
    ],
  });
}
const funnelScope = DatabaseScope.test(`wide-funnel:${runId}`);
for (const steps of [1, 2, 3])
  cases.push({
    id: `funnel-${steps * 3}`,
    query: funnel(steps, "40"),
    scope: funnelScope,
    basis: { validAt: 1000050, recordedAt: 1001, recordedPosition: 1 },
    expected: oracle(steps, 40n).map((name) => ({ "?session": name })),
  });
cases.push({
  id: "funnel-boundary-41",
  query: funnel(3, "41"),
  scope: funnelScope,
  basis: { validAt: 1000050, recordedAt: 1001, recordedPosition: 1 },
  expected: oracle(3, 41n).map((name) => ({ "?session": name })),
});
cases.push({
  id: "funnel-equal-steps",
  query: funnel(3, "40", "equal"),
  scope: funnelScope,
  basis: { validAt: 1000050, recordedAt: 1001, recordedPosition: 1 },
  expected: [],
});
const generated: any[] = [];
for (const strategy of ["projected", "persisted"] satisfies Strategy[])
  for (const entry of cases) {
    const compiled =
      strategy === "projected"
        ? compileWideCandidate(entry.query, entry.scope, entry.basis, strategy)
        : compilePersistedCandidate(entry.query, entry.scope, entry.basis);
    const stem = `${strategy}-${entry.id}`;
    put(`${stem}.rq`, compiled.sparql + "\n");
    if (compiled.domainSparql) put(`${stem}.domains.rq`, compiled.domainSparql + "\n");
    if (compiled.layoutGuardSparql) put(`${stem}.layout.rq`, compiled.layoutGuardSparql + "\n");
    generated.push({
      ...entry,
      strategy,
      queryFile: `${stem}.rq`,
      ...(compiled.domainSparql ? { domainFile: `${stem}.domains.rq` } : {}),
      ...(compiled.layoutGuardSparql ? { layoutFile: `${stem}.layout.rq` } : {}),
      queryBytes: Buffer.byteLength(compiled.sparql),
      querySha256: createHash("sha256")
        .update(compiled.sparql + "\n")
        .digest("hex"),
      patternCount: compiled.patternCount,
    });
  }
put(
  "funnel-public-fixture.json",
  JSON.stringify(
    {
      scope: funnelScope,
      deterministic: { startTime: 1001, seed: runId },
      operation: "Triples.transact, one assert batch and explicit command identity",
      source: "reversed workload17 business events payloads, never expected/assertion rows",
      facts: funnelFacts,
    },
    null,
    2,
  ) + "\n",
);
const manifest = {
  format: "qlever-wide-experiment/1",
  status: "PREPARED_NOT_EXECUTED",
  runId,
  createdAt: new Date().toISOString(),
  sourcePacketSha256: createHash("sha256").update(fixtureBytes).digest("hex"),
  sourceSha256: Object.fromEntries(
    [
      "PACKET.md",
      "candidates.ts",
      "canonical-source.ts",
      "public-runtime.ts",
      "prepare.ts",
      "run.ts",
    ].map((name) => [
      name,
      createHash("sha256")
        .update(readFileSync(path.join(import.meta.dirname, name)))
        .digest("hex"),
    ]),
  ),
  baseline: "Stopped after two real4GiBOOMs; not rerun",
  profile: {
    perCandidateMemoryBytes: 2 * 1024 ** 3,
    cpus: 2,
    queryAllocatorArgument: "512M",
    cacheArgument: "64M",
    plannerBudget: 100,
    aggregateQleverMemoryBytes: 4 * 1024 ** 3,
    nativeTimeoutMs: 5000,
    clientDeadlineMs: 6000,
    maxResultRows: 1000,
    maxResponseBytes: 4 * 1024 ** 2,
    stopRssBytes: 1.5 * 1024 ** 3,
  },
  nodes: [
    {
      strategy: "projected",
      container: "triplex-qlever-candidate-a",
      url: "http://127.0.0.1:7021",
    },
    {
      strategy: "persisted",
      container: "triplex-qlever-candidate-b",
      url: "http://127.0.0.1:7022",
    },
  ],
  fixture: {
    copiedScalarScope: scalarScope,
    scalarExpectedAssertionCount: 7,
    funnelScope,
    funnelFixtureFile: "funnel-public-fixture.json",
    funnelExpectedAssertions: 36,
  },
  cases: generated,
};
put("manifest.json", JSON.stringify(manifest, null, 2) + "\n");
console.log(
  JSON.stringify({
    status: manifest.status,
    manifest: path.join(output, "manifest.json"),
    queries: generated.length,
    networkRequests: 0,
  }),
);
