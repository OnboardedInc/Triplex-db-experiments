import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { openComposition } from "../../../bench/lib/composition.ts";
import { openTriples } from "../../../bench/lib/triplex.ts";
import { ImportRun, pace } from "./lane.ts";
import { fileSource, bytes, sha, type Assertion, type Group, type Header } from "./source.ts";
import { openNative } from "./native.ts";

const base = process.argv[3]!,
  id = process.argv[4] ?? randomUUID();
const meta = (mode: "history" | "snapshot", n: number): Omit<Header, "seal"> => ({
  source: "account-export",
  generation: id,
  mode,
  groups: n,
  validAt: 250,
});
function history(): Group[] {
  const add = (i: number, ref: string, n: number, from = 100, to?: number): Assertion => ({
    op: "assert",
    ref,
    entityId: "person-" + i,
    attribute: ":score",
    value: { type: "integer", value: String(n) },
    validFrom: from,
    ...(to === undefined ? {} : { validTo: to }),
  });
  return Array.from({ length: 20 }, (_, i): Group => {
    const instant = [1000, 800, 1000, 1200][i % 4]! + Math.floor(i / 4) * 400;
    if (i === 1)
      return { ordinal: i, id: "save-" + i, instant, ops: [add(0, "old-note", 99, 0, 150)] };
    if (i === 2)
      return {
        ordinal: i,
        id: "save-" + i,
        instant,
        ops: [{ op: "retract", target: "base-0" }, add(0, "corrected", 42, 125)],
      };
    if (i === 3)
      return {
        ordinal: i,
        id: "save-" + i,
        instant,
        ops: [{ op: "retract", target: "old-note" }, add(0, "future", 55, 400)],
      };
    return {
      ordinal: i,
      id: "save-" + i,
      instant,
      ops: [add(i, "base-" + i, i), add(i, "other-" + i, i + 10, 150, 200)],
    };
  });
}
const selected = (r: any) => [
  r.id,
  r.entityId,
  r.attribute,
  r.value,
  r.validFrom,
  r.validTo?.value ?? (typeof r.validTo === "number" ? r.validTo : null),
  r.recordedAt,
  r.txId?.value ?? (typeof r.txId === "string" ? r.txId : null),
];
const ordered = (x: any[]) => x.map(selected).sort((a, b) => a[0].localeCompare(b[0]));
async function worker(mode: "history" | "snapshot", n: number, point?: string) {
  const src = fileSource(join(base, mode + ".source"), meta(mode, n)),
    target = await openNative(
      "import-" + (mode === "history" ? "history" : "live") + "-" + id,
      mode,
    );
  try {
    const run = await ImportRun.open(target, src, pace(8, 1), join(base, mode + ".cursor"));
    try {
      while (true) {
        const first = run.last()?.end ?? 0;
        const stop = () => {
          if (first === Math.floor(n * 0.9)) process.kill(process.pid, "SIGKILL");
        };
        const result = await run.step({
          ...(point === "before"
            ? { beforeWrite: stop }
            : point === "after"
              ? { afterWrite: stop }
              : point === "checked"
                ? { beforeCheckpoint: stop }
                : {}),
        });
        if (!result) break;
      }
    } finally {
      run.close();
    }
  } finally {
    src.close();
    await target.close();
  }
}
async function check(mode: "history" | "snapshot", groups: Group[]) {
  const scope = "import-" + (mode === "history" ? "history" : "live") + "-" + id;
  const s = fileSource(join(base, mode + ".source"), meta(mode, groups.length)),
    target = await openNative(scope, mode);
  const run = await ImportRun.open(target, s, pace(8, 1), join(base, mode + ".cursor"));
  const touched = await openComposition("reach-touched", "datomic", scope);
  const h = await openTriples("datomic", scope);
  try {
    const entries = [...run.entries()],
      commands: any[] = [],
      receipts: any[] = [],
      queries: any[] = [],
      actual: any[] = [],
      lookup = new Map<string, any>();
    for (const e of entries) {
      const ops = groups.slice(e.first, e.end).flatMap((g) => g.ops);
      const r = await run.lookup(e.command);
      assert.equal(r.txId, e.txId);
      const inputs = ops.map((o) => (o.op === "assert" ? { ...o, createdBy: "bulk-import" } : o));
      commands.push({
        clock: mode === "history" ? groups[e.first]!.instant : e.instant,
        meta: { actor: "bulk-import", commandId: e.command, correlationId: e.digest },
        operations: inputs,
      });
      receipts.push({
        command: receipts.length,
        outcome: "committed",
        txId: e.txId,
        position: e.position,
        instant: e.instant,
        assertionIds: r.changes.map((c: any) => (c.op === "assert" ? c.tripleId : null)),
      });
      for (const c of r.changes) if (c.op === "assert") lookup.set(c.tripleId, c);
    }
    assert(entries.length && entries.at(-1)!.end === groups.length);
    const head = await target.currentPosition();
    const first = entries[0]!.position;
    let after = first - 1;
    const feed = [];
    while (after < head) {
      const p = await target.feedPage(after, 3);
      assert(p.transactions.length);
      for (const record of p.transactions) {
        assert.equal(record.position, ++after);
        feed.push(record);
      }
    }
    assert.equal(feed.length, entries.length);
    const roots = [
      ...new Set(
        groups.flatMap((g) => g.ops.flatMap((o) => (o.op === "assert" ? [o.entityId] : []))),
      ),
    ];
    roots.push("absent");
    const cases = [
      { position: first - 1, validAt: 250 },
      { position: first, validAt: 250 },
      { position: head, validAt: 250 },
      { position: head, validAt: 500 },
      ...[99, 125, 150, 199, 200, 249, 250, 400].flatMap((validAt) =>
        [799, 800, 999, 1000, 1100, 1200].map((recordedAt) => ({ recordedAt, validAt })),
      ),
    ];
    for (const root of roots) {
      for (const cut of root === "person-0" ? cases : cases.slice(0, 4)) {
        const qid = String(queries.length);
        queries.push({ id: qid, kind: "entityTriples", entityId: root, cut });
        const b: any = {
          validAt: cut.validAt,
          ...("position" in cut
            ? { recordedPosition: cut.position }
            : { recordedAt: cut.recordedAt }),
        };
        const p = await target.pull(root, b),
          t = await touched.pull(root, b);
        assert.deepEqual(ordered(p.triples as any[]), ordered(t.triples as any[]));
        actual.push(ordered(p.triples as any[]));
      }
    }
    const input = {
      format: "triplex-db-2/o-replay-case/1",
      caseId: "import-" + mode + "-" + id,
      defaultScope: scope,
      initialPositions: { [scope]: first - 1 },
      commands,
      receipts,
      queries,
    };
    const f = join(base, mode + ".case.json"),
      out = join(base, mode + ".oracle.json");
    writeFileSync(f, bytes(input), { flag: "wx" });
    const proc = spawnSync("python3", ["-I", "lab/oracles/replay/cli.py", f, "-o", out], {
      encoding: "utf8",
    });
    assert.equal(proc.status, 0, proc.stderr);
    const o = JSON.parse(readFileSync(out, "utf8"));
    assert.equal(o.caseSha256, sha(readFileSync(f)));
    assert.equal(o.verdict, "PASS");
    assert.equal(o.state.length, 1);
    assert.equal(o.state[0].scope, scope);
    assert.deepEqual(
      feed.map((r) => ({
        ...r,
        changedEntities: [...new Set(r.changes.map((c: any) => c.entityId))].sort(),
      })),
      o.state[0].transactions,
    );
    assert.equal(o.queries.length, actual.length);
    o.queries.forEach((q: any, i: number) => {
      assert.equal(q.id, String(i));
      assert.deepEqual(actual[i], ordered(q.result.snapshot));
    });
    for (const root of roots) {
      const rows = await h.run(h.triples.history(root));
      const oracle = o.state[0].assertions.filter((a: any) => a.entityId === root);
      assert.deepEqual(ordered(rows as any[]), ordered(oracle));
      for (const a of oracle) {
        const t = (rows as any[]).find((r) => r.id === a.id);
        assert.deepEqual(
          [t.retractedAt?.value ?? null, t.retractTxId?.value ?? null],
          [a.retractedAt, a.retractTxId],
        );
      }
    }
    const latest = o.state[0].assertions.filter(
      (a: any) =>
        a.retractedAt === null && a.validFrom <= 250 && (a.validTo === null || 250 < a.validTo),
    );
    writeFileSync(
      join(base, mode + ".readback.json"),
      bytes({
        scope,
        id,
        source: s.header,
        entries,
        actual,
        queryHash: sha(bytes(actual)),
        oracle: sha(readFileSync(out)),
        feed: sha(bytes(feed)),
      }),
      { flag: "wx" },
    );
    return { latest, entries, queries: queries.length };
  } finally {
    await h.close();
    await touched.close();
    run.close();
    s.close();
    await target.close();
  }
}
if (process.argv[2] === "--child") {
  await worker(process.argv[5] as any, Number(process.argv[6]), process.argv[7]);
} else if (process.argv[2] === "--native-proof") {
  mkdirSync(base);
  const groups = history();
  fileSource(join(base, "history.source"), meta("history", groups.length), groups).close();
  const child = (point?: string) =>
    spawnSync(
      process.execPath,
      [
        "--experimental-strip-types",
        import.meta.filename,
        "--child",
        base,
        id,
        "history",
        String(groups.length),
        ...(point ? [point] : []),
      ],
      { encoding: "utf8", timeout: 100000 },
    );
  for (const point of ["before", "after", "checked"]) {
    const p = child(point);
    assert.equal(p.signal, "SIGKILL", p.stderr);
  }
  const done = child();
  assert.equal(done.status, 0, done.stderr);
  const old = await check("history", groups);
  assert.equal(old.entries.filter((e) => e.recovered).length, 1);
  const snapshot: Group[] = old.latest.map((a: any, i: number) => ({
    ordinal: i,
    id: "person-" + i,
    ops: [
      {
        op: "assert",
        ref: "current-" + i,
        entityId: a.entityId,
        attribute: a.attribute,
        value: a.value,
        validFrom: 250,
      },
    ],
  }));
  fileSource(join(base, "snapshot.source"), meta("snapshot", snapshot.length), snapshot).close();
  await worker("snapshot", snapshot.length);
  const now = await check("snapshot", snapshot);
  const values = (rows: any[]) => rows.map((a) => bytes([a.entityId, a.attribute, a.value])).sort();
  assert.deepEqual(values(now.latest), values(old.latest));
  console.log(
    bytes({
      id,
      sourceGroups: groups.length,
      historicalFacts: groups.flatMap((g) => g.ops).length,
      snapshotFacts: snapshot.length,
      historyQueries: old.queries,
      snapshotQueries: now.queries,
    }),
  );
}
