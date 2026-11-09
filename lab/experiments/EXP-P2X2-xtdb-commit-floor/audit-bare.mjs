// @ts-nocheck -- [EXP-CHECKJS-R2] dynamic collections, runtime Buffer-to-JSON coercion, or validated values without static narrowing. Binding errors remain checked by lab/bin/checkjs.mjs.
// [EXP-P2X2] Why: independent postgres.js decoding validates all retained command bytes.
// Rejected: replacing failed original accounting receipts (first failures remain immutable).
import fs from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { attempt, observe, save, finish, RECEIPTS, sha } from "./observe.mjs";
import { modules } from "./runtime.mjs";
const a = attempt("bare-independent-audit"),
  m = await modules("/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-P2X2/p2x");
const client = m.xtdb.makeXtdbClient("postgres://xtdb:xtdb@127.0.0.1:5471/xtdb", {
  maxConnections: 1,
});
const b = observe();
save(path.join(a.dir, "before.json"), b);
const raw = [],
  results = [];
try {
  for (const f of fs.readdirSync(RECEIPTS).sort()) {
    const r = JSON.parse(fs.readFileSync(path.join(RECEIPTS, f)));
    if (
      !["F1", "F2", "F3"].includes(r.arm) ||
      ![500, 1000].includes(r.n) ||
      !r.scope ||
      !r.serviceMs
    )
      continue;
    if (
      r.binding.container !== b.binding.container ||
      r.afterBinding.container !== b.binding.container
    )
      throw new Error("original slot identity changed");
    const failures = [],
      prefix = r.scope + "-",
      n = r.n;
    const samples = JSON.parse(fs.readFileSync(path.join(r.evidenceDir, "samples.json")));
    if (samples.length !== n || new Set(samples.map((s) => s.cmd)).size !== n)
      failures.push("sample identity/count");
    const expected = new Set(Array.from({ length: n }, (_, i) => prefix + i));
    if (
      samples.some(
        (s, i) =>
          s.i !== i ||
          s.cmd !== prefix + i ||
          s.writes !== (r.arm === "F1" ? 3 : r.arm === "F2" ? 8 : 1),
      )
    )
      failures.push("socket/sample shape");
    if (r.arm === "F1") {
      const rows = await client.query("SELECT _id,v FROM p2x2_single WHERE _id LIKE ?", [
        prefix + "%",
      ]);
      if (
        rows.length !== n ||
        new Set(rows.map((row) => row._id)).size !== n ||
        rows.some(
          (row) => !expected.has(row._id) || Number(row.v) !== Number(row._id.slice(prefix.length)),
        )
      )
        failures.push("single row contents");
      raw.push({ id: r.id, rows });
    } else {
      const claims = await client.query("SELECT _id,subj,pos FROM r16_claim WHERE _id LIKE ?", [
        prefix + "%",
      ]);
      const ledger = await client.query(
        "SELECT _id,cmd,subj,attr,val,pos FROM r16_ledger WHERE subj = ?",
        [r.scope],
      );
      const feed = await client.query("SELECT _id,subj,pos,changes FROM r16_feed WHERE subj = ?", [
        r.scope,
      ]);
      const current = await client.query("SELECT * FROM r16_ent WHERE _id = ?", [r.scope]);
      if (
        claims.length !== n ||
        new Set(claims.map((row) => row._id)).size !== n ||
        claims.some(
          (row) =>
            !expected.has(row._id) ||
            row.subj !== r.scope ||
            Number(row.pos) !== Number(row._id.slice(prefix.length)) + 1,
        )
      )
        failures.push("claim contents");
      if (
        ledger.length !== n * 10 ||
        new Set(ledger.map((row) => row._id)).size !== n * 10 ||
        ledger.some((row) => {
          const k = Number(row.attr.slice(1)),
            pos = Number(row.cmd.slice(prefix.length)) + 1;
          return (
            !expected.has(row.cmd) ||
            k < 0 ||
            k > 9 ||
            row._id !== `${row.cmd}|${k}` ||
            row.val !== `v${pos}-${k}` ||
            Number(row.pos) !== pos ||
            row.subj !== r.scope
          );
        })
      )
        failures.push("ledger contents");
      const changes = JSON.stringify(
        Array.from({ length: 10 }, (_, k) => ({ attr: `a${k}`, vf: "now", vt: "inf" })),
      );
      if (
        feed.length !== n ||
        new Set(feed.map((row) => row._id)).size !== n ||
        feed.some(
          (row) =>
            !expected.has(row._id) ||
            row.subj !== r.scope ||
            Number(row.pos) !== Number(row._id.slice(prefix.length)) + 1 ||
            row.changes !== changes,
        )
      )
        failures.push("feed contents");
      if (
        current.length !== 1 ||
        Number(current[0].pos) !== n ||
        Array.from({ length: 10 }, (_, k) =>
          k < 8
            ? Number(current[0][`a${k}`]) !== (n * 31 + k) % 1000003
            : current[0][`a${k}`] !== `w${n}-${k}`,
        ).some(Boolean)
      )
        failures.push("current contents");
      raw.push({ id: r.id, claims, ledger, feed, current });
    }
    results.push({
      id: r.id,
      originalReceiptSha256: sha(path.join(RECEIPTS, f)),
      originalGAcct: r.gates["G-ACCT"],
      offered: n,
      failures,
      qualified: failures.length === 0,
    });
  }
  const after = observe();
  save(path.join(a.dir, "after.json"), after);
  fs.writeFileSync(path.join(a.dir, "observed-rows.json.gz"), gzipSync(JSON.stringify(raw)));
  finish(a, {
    binding: b.binding,
    afterBinding: after.binding,
    results,
    qualified: results.length === 5 && results.every((r) => r.qualified),
    note: "fresh independent read-back of original attempt namespaces on the same uninterrupted container; original failed receipts unchanged",
  });
  console.log(JSON.stringify(results));
} finally {
  await client.close();
}
