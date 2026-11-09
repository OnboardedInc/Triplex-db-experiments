import { postgresPlaceholders } from "../../../../packages/xtdb/src/XtdbClient.js";
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { Effect } from "effect";
import { Triples, EntityId, string } from "../../../../packages/core/dist/index.js";
import { makeA0RecordTimeSuite } from "../../../../packages/testkit/dist/index.js";
import { makeXtdbStorageAdapter } from "../../../../packages/xtdb/src/XtdbStorageAdapter.js";
import { sqlTransport } from "../../../../packages/xtdb/test/fixtures/journal-sql-transport.js";
const live = "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-RT01/live2";
const sha = (bytes: Buffer | string) => createHash("sha256").update(bytes).digest("hex");
const expected = new Map(
  fs
    .readFileSync("lab/experiments/EXP-RT01/live2/DURABLE-SHA256SUMS", "utf8")
    .trim()
    .split("\n")
    .map((line) => [line.slice(66), line.slice(0, 64)]),
);
function retained(name: string) {
  const bytes = fs.readFileSync(path.join(live, name));
  assert.equal(sha(bytes), expected.get(name), name);
  return bytes.toString();
}
const point = JSON.parse(retained("g6-attempt1/point-0-a0-10.json"));
const dictionary = JSON.parse(retained("g6-attempt1/statements.json"));
const oldEvents = retained("g2-attempt1/progress.jsonl")
  .trim()
  .split("\n")
  .map((line) => JSON.parse(line));
const before: any = {},
  after: any = {};
for (const encoding of ["a0", "compact"] as const) {
  before[encoding] = oldEvents
    .flatMap((e) => (e.kind === "submit-start" ? e.statements : []))
    .find(
      (s) =>
        s.sql.includes("MAX(stamp)") &&
        (encoding === "a0"
          ? s.parameterSyntax !== "postgresql"
          : s.parameterSyntax === "postgresql" && !s.sql.includes("tx_claims")),
    );
  assert.ok(before[encoding]);
  const transport = sqlTransport(),
    scope = "guard-plan";
  const suite = makeA0RecordTimeSuite(
    makeXtdbStorageAdapter(transport.client, scope, { commitEncoding: encoding }),
    {} as never,
    scope,
    { loseNextAck: () => {} },
  );
  try {
    await Effect.runPromise(
      Effect.gen(function* () {
        const t = yield* Triples;
        yield* t.transact(
          Array.from({ length: 10 }, (_, i) => ({
            op: "assert" as const,
            entityId: EntityId.make("subject"),
            attribute: `:value/${i}`,
            value: string("v"),
          })),
        );
      }).pipe(Effect.provide(suite.layer)),
    );
    const submit = transport.calls.find(
      (c) => c.kind === "submit" && c.statements.some((s: any) => s.sql.includes("MAX(position)")),
    );
    assert.ok(submit);
    after[encoding] = { ...submit.statements[0], statementCount: submit.statements.length };
    assert.equal(after[encoding].statementCount, encoding === "a0" ? 6 : 5);
  } finally {
    transport.db.close();
  }
}
assert.ok(Object.values(dictionary).includes(postgresPlaceholders(before.a0.sql)));
const cases = [];
// [EXP-RT01] Why: count actual predicate/projection visits in a declared relational model and retain EXPLAIN's keyed search. Rejected: calling JS N/2N estimates or a SQLite plan an observed XTDB execution plan.
for (const encoding of ["a0", "compact"] as const)
  for (const n of [0, 1, 100, 10000]) {
    const db = new DatabaseSync(":memory:");
    let positionVisits = 0,
      stampVisits = 0;
    db.exec(
      "CREATE TABLE tx_meta (_id TEXT PRIMARY KEY, scope_key TEXT, position INTEGER, stamp INTEGER)",
    );
    db.function("visitPosition", (v: any) => {
      positionVisits++;
      return v;
    });
    db.function("visitStamp", (v: any) => {
      stampVisits++;
      return v;
    });
    const insert = db.prepare("INSERT INTO tx_meta VALUES (?, 'scope', ?, ?)");
    db.exec("BEGIN");
    for (let i = 1; i <= n; i++) insert.run(i === n ? "scope" : `historical-model:${i}`, i, i);
    db.exec("COMMIT");
    const versions: any = {};
    for (const version of ["before", "after"]) {
      const s = version === "before" ? before[encoding] : after[encoding];
      const expression = s.sql
        .slice(7)
        .replace(/, '[^']+'$/, "")
        .replaceAll(" FOR ALL VALID_TIME", "");
      const sql = `SELECT (${expression}) AS allowed`;
      const params =
        version === "before"
          ? encoding === "a0"
            ? ["scope", n, "scope", n]
            : ["scope", n, n]
          : ["scope", n, n];
      const bind = (text: string, explain = false) => {
        const stmt = db.prepare((explain ? "EXPLAIN QUERY PLAN " : "") + text);
        if (text.includes("$1"))
          return stmt.all(Object.fromEntries(params.map((v, i) => [`$${i + 1}`, v])));
        return stmt.all(...params);
      };
      const plan = bind(sql, true);
      positionVisits = 0;
      stampVisits = 0;
      const counted = sql
        .replaceAll("MAX(position)", "MAX(visitPosition(position))")
        .replaceAll("MAX(stamp)", "MAX(visitStamp(stamp))")
        .replaceAll("SELECT stamp FROM", "SELECT visitStamp(stamp) FROM");
      const answer = bind(counted);
      assert.equal(answer[0]!.allowed, 1);
      assert.equal(positionVisits, n);
      assert.equal(stampVisits, version === "before" ? n : Math.min(n, 1));
      if (version === "after")
        assert.ok(
          plan.some((r) => String(r.detail).includes("(_id=?)")),
          JSON.stringify(plan),
        );
      versions[version] = {
        sql,
        params,
        plan,
        positionVisits,
        stampVisits,
        totalVisits: positionVisits + stampVisits,
        allowed: answer[0]!.allowed,
      };
    }
    cases.push({ encoding, modelScopeRows: n, ...versions });
    db.close();
  }
const samples = point.blocks.flatMap((b: any) => b.samples);
assert.equal(samples.length, 300);
assert.equal(samples.filter((s: any) => s.arm === "A").length, 150);
assert.ok(samples.every((s: any) => s.submittedStatements === 6));
console.log(
  JSON.stringify(
    {
      schema: "rt01-r6-guard-plan/1",
      kind: "offline captured-SQL relational model, NOT XTDB engine plan",
      sourceEvidence: {
        liveRoot: live,
        pointSha256: expected.get("g6-attempt1/point-0-a0-10.json"),
        traceSha256: expected.get("g2-attempt1/progress.jsonl"),
        statementDictionarySha256: expected.get("g6-attempt1/statements.json"),
      },
      retained: {
        A: point.A,
        B: point.B,
        ratios: point.ratios,
        tolerance: point.tolerance,
        assertionRowsPerCommit: { A: 23, B: 22 },
        currentMetadataRowsPerScope: 1,
        statementCount: 6,
        warmWireExecutions: 13,
        warmReadyCycles: 13,
        firstFreshB: 17,
      },
      before,
      after,
      cases,
      interpretation:
        "Captured SQL confirms the extra aggregate without extra warm wire cycles. Model changes stamp visits N to at most 1, total 2N to N+1. Retained live data has one current tx_meta row per scope and no native EXPLAIN/scan counters; it does not prove N historical versions are visited or causally attribute the complete 29.25% service regression. Native plan/performance confirmation remains a live obligation.",
    },
    null,
    2,
  ),
);
