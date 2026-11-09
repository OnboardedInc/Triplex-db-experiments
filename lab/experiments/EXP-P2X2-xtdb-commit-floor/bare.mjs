// @ts-nocheck -- [EXP-CHECKJS-R2] runtime-populated records, option bags, or branch-specific union members. Binding errors remain checked by lab/bin/checkjs.mjs.
// [EXP-P2X2] Why: adapt R16 writer.mjs's exact six body statements; F3 changes only transport.
// Rejected: a single INSERT proxy for the 10-fact command (omits guards, current state and outbox).
import path from "node:path";
import { Wire, text, int } from "./wire.mjs";
import { summary, engineMeans } from "./analysis.mjs";
import { attempt, observe, quiet, save, finish } from "./observe.mjs";
const url = "postgres://xtdb:xtdb@127.0.0.1:5471/xtdb";
const arm = process.argv[2];
if (!["F1", "F2", "F3"].includes(arm)) throw new Error("arm");
const n = Number(process.argv[3] ?? 1000),
  a = attempt(arm),
  scope = a.id.replace(/[^a-zA-Z0-9]/g, "");
const c = await Wire.connect(url);
const p = (sql, params = []) => ({ sql, params });
export function command(cmd, subj, expected) {
  const pos = expected + 1;
  const sets = Array.from({ length: 10 }, (_, k) => `a${k} = $${k + 2}`);
  const ps = [
    text(subj),
    ...Array.from({ length: 10 }, (_, k) =>
      k < 8 ? int((pos * 31 + k) % 1000003) : text(`w${pos}-${k}`),
    ),
    int(pos),
  ];
  const lp = [],
    rows = [];
  for (let k = 0; k < 10; k++) {
    const b = lp.length;
    rows.push(`(${Array.from({ length: 6 }, (_, i) => `$${b + i + 1}`).join(",")})`);
    lp.push(
      text(`${cmd}|${k}`),
      text(cmd),
      text(subj),
      text(`a${k}`),
      text(`v${pos}-${k}`),
      int(pos),
    );
  }
  return [
    p(`BEGIN READ WRITE WITH (METADATA = {cmd: '${cmd}', subj: '${subj}', pos: ${pos}})`),
    p("ASSERT NOT EXISTS (SELECT 1 FROM r16_claim WHERE _id = $1), 'dup'", [text(cmd)]),
    p("ASSERT (SELECT COALESCE(MAX(pos),0) FROM r16_ent WHERE _id = $1) = $2, 'cas'", [
      text(subj),
      int(expected),
    ]),
    p(`UPDATE r16_ent SET ${sets.join(",")}, pos = $12 WHERE _id = $1`, ps),
    p("INSERT INTO r16_claim (_id,subj,pos) VALUES ($1,$2,$3)", [text(cmd), text(subj), int(pos)]),
    p(`INSERT INTO r16_ledger (_id,cmd,subj,attr,val,pos) VALUES ${rows.join(",")}`, lp),
    p("INSERT INTO r16_feed (_id,subj,pos,changes) VALUES ($1,$2,$3,$4)", [
      text(cmd),
      text(subj),
      int(pos),
      text(
        JSON.stringify(
          Array.from({ length: 10 }, (_, k) => ({ attr: `a${k}`, vf: "now", vt: "inf" })),
        ),
      ),
    ]),
    p("COMMIT SYNC"),
  ];
}
const subj = scope;
const raw = [];
let failure = null,
  before,
  after;
try {
  await c.query("BEGIN READ WRITE");
  await c.query(
    `INSERT INTO r16_ent (_id,pos,a0,a1,a2,a3,a4,a5,a6,a7,a8,a9) VALUES ($1,0,0,0,0,0,0,0,0,0,'','')`,
    [text(subj)],
  );
  await c.query("INSERT INTO r16_claim (_id,subj,pos) VALUES ($1,$2,0)", [
    text(scope + "seed"),
    text(scope + "seed"),
  ]);
  await c.query("INSERT INTO r16_ledger (_id,cmd,subj,attr,val,pos) VALUES ($1,$1,$1,$1,$1,0)", [
    text(scope + "seed"),
  ]);
  await c.query("INSERT INTO r16_feed (_id,subj,pos,changes) VALUES ($1,$1,0,$1)", [
    text(scope + "seed"),
  ]);
  await c.query("COMMIT SYNC");
  before = observe();
  save(path.join(a.dir, "before.json"), before);
  if (!quiet(before).zero) throw new Error(`G-QUIET: ${JSON.stringify(quiet(before))}`);
  const start = performance.now();
  for (let i = 0; i < n; i++) {
    const cmd = `${scope}-${i}`;
    const statements =
      arm === "F1"
        ? [
            p("BEGIN READ WRITE"),
            p("INSERT INTO p2x2_single (_id,v) VALUES ($1,$2)", [text(cmd), int(i)]),
            p("COMMIT SYNC"),
          ]
        : command(cmd, subj, i);
    const w = c.writes,
      t = performance.now();
    if (arm === "F3") await c.batch(statements);
    else for (const s of statements) await c.batch([s]);
    const elapsed = performance.now() - t;
    raw.push({ i, cmd, ms: elapsed, writes: c.writes - w });
  }
  const elapsedMs = performance.now() - start;
  after = observe();
  save(path.join(a.dir, "after.json"), after);
  const claims = await c.query(
    arm === "F1"
      ? "SELECT COUNT(*) AS n FROM p2x2_single WHERE _id LIKE $1"
      : "SELECT COUNT(*) AS n FROM r16_claim WHERE _id LIKE $1",
    [text(scope + "-%")],
  );
  const ledger =
    arm === "F1"
      ? null
      : await c.query("SELECT COUNT(*) AS n FROM r16_ledger WHERE subj=$1", [text(subj)]);
  const feed =
    arm === "F1"
      ? null
      : await c.query("SELECT COUNT(*) AS n FROM r16_feed WHERE subj=$1", [text(subj)]);
  const current =
    arm === "F1" ? null : await c.query("SELECT pos,a0,a9 FROM r16_ent WHERE _id=$1", [text(subj)]);
  const accounted =
    raw.length === n &&
    Number(claims[0]?.n) === n &&
    (arm === "F1" ||
      (Number(ledger[0]?.n) === n * 10 &&
        Number(feed[0]?.n) === n &&
        Number(current[0]?.pos) === n &&
        Number(current[0]?.a0) === (n * 31) % 1000003 &&
        current[0]?.a9 === `w${n}-9`));
  const writeShape = raw.every((r) => r.writes === (arm === "F1" ? 3 : arm === "F2" ? 8 : 1));
  save(path.join(a.dir, "samples.json"), raw);
  finish(a, {
    arm,
    n,
    facts: arm === "F1" ? 1 : 10,
    scope,
    serviceMs: summary(raw.map((r) => r.ms)),
    commitsPerS: n / (elapsedMs / 1000),
    elapsedMs,
    accounting: {
      offered: n,
      acknowledged: raw.length,
      claims,
      ledger,
      feed,
      current,
      contentMatches: accounted,
    },
    writeShape,
    quiet: quiet(before),
    binding: before.binding,
    afterBinding: after.binding,
    engine: engineMeans(before.metrics, after.metrics, n),
    gates: {
      "G-QUIET": quiet(before).zero,
      "G-ACCT": accounted,
      oneWriteF3: arm !== "F3" || writeShape,
    },
    runKind: n === 1000 ? "diagnostic" : n === 500 ? "diagnostic-segment" : "smoke",
  });
  console.log(a.id, summary(raw.map((r) => r.ms)));
} catch (e) {
  failure = { message: e.message, code: e.code };
  save(path.join(a.dir, "failure.json"), { failure, raw });
  finish(a, { arm, n, failure, binding: before?.binding, gates: { "G-ACCT": false } });
  throw e;
} finally {
  c.close();
}
