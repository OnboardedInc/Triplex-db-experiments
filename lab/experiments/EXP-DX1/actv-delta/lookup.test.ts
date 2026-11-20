import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { W0, canonical, sha256 } from "../../../bench/lib/w0-world.ts";
import { allIndexes, differences, parameterRules, type Difference } from "./rules.ts";
import { LookupIndex, ordered } from "./lookup.ts";
export function change(base: W0.CompiledRelease, id: W0.RuleId, params: object, scoped = false) {
  return W0.compileRelease({
    ...base.doc,
    rules: base.doc.rules.map((e) =>
      e.id !== id
        ? e
        : scoped
          ? { ...e, scope: { jurisdictions: ["jur:j002"], params } }
          : { ...e, params },
    ),
  } as W0.ReleaseDoc);
}
test("seven declarations equal every independently evaluated before and after row", (t) => {
  const r = W0.rung(1000),
    basis = W0.populationBasis(r),
    worlds = [...W0.population(r)].map((p) => p.world);
  const blank = { subject: "pl:empty", facts: [] };
  worlds.push(blank);
  const s = "pl:edge",
    d = s + "/doc:x",
    e = s + "/doc:y",
    f = (entity: string, a: string, v: W0.Fact["v"]): W0.Fact => ({ e: entity, a, v, tx: 1 });
  worlds.push({
    subject: s,
    facts: [
      f(s, "location", "loc:absent"),
      f(s, "weeklyMinutes", 2700),
      f(s, "documents", d),
      f(s, "documents", e),
      f(d, "docType", "visa"),
      f(d, "expiresOn", "2026-11-04"),
      f(e, "docType", "visa"),
    ],
  });
  const census = Array.from({ length: r.N }, (_, i) => W0.placementId(i))
    .concat([blank.subject, s])
    .sort(ordered);
  const values: Record<string, object> = {
    I9S2: { businessDays: 10 },
    EVSUB: { businessDays: 1 },
    EVSTAT: { tncBusinessDays: 20 },
    DOCEXP: { leadDays: { ead: 33, passport: 90 } },
    MINWAGE: { floorSources: ["location.localMinWageCents"] },
    OT: { thresholdMinutes: 2700 },
    PAYCHG: { thresholdCents: 0 },
  };
  const releases = [
    W0.R1,
    W0.R2,
    W0.R3,
    ...parameterRules.flatMap((id) =>
      [false, true].map((sc) => change(W0.R1, id, values[id]!, sc)),
    ),
  ];
  const pairs = [[0, 1], [1, 2], [0, 0], ...releases.slice(3).map((_, i) => [0, i + 3])];
  const got = new LookupIndex(census, worlds, basis);
  t.diagnostic(
    JSON.stringify({
      nonce: randomUUID(),
      source: [
        "rules.ts",
        "lookup.ts",
        "lookup.test.ts",
        "oracle.py",
        "../../../oracles/domain/w0.py",
        "../../../oracles/domain/jsontok.py",
      ].map((p) => [p, sha256(readFileSync(new URL(p, import.meta.url)))]),
      censusHash: got.censusHash,
      basis,
      worldsSha: sha256(canonical(worlds)),
    }),
  );
  const map = new Map(worlds.map((w) => [w.subject, w]));
  const expected = JSON.parse(
    execFileSync("python3", ["lab/experiments/EXP-DX1/actv-delta/oracle.py"], {
      input: JSON.stringify({ worlds, basis, releases: releases.map((r) => r.doc), pairs }) + "\n",
      maxBuffer: 128 * 1024 ** 2,
      encoding: "utf8",
    }),
  );
  for (const [i, [a, z]] of pairs.entries()) {
    const old = releases[a!]!,
      next = releases[z!]!,
      selected = got.select(old, next, () => {
        throw Error("unexpected world pull");
      });
    assert.deepEqual(selected.keys, expected[i].keys, "lookup " + i);
    const rows: Difference[] = [];
    for (const s of new Set<string>(selected.keys.map((k) => JSON.parse(k)[0])))
      rows.push(...differences(map.get(s)!, basis, old, next));
    rows.sort((a, b) => ordered(a[0], b[0]));
    assert.equal(sha256(canonical(rows)), expected[i].sha, "full row bytes " + i);
    t.diagnostic(
      JSON.stringify({
        old: old.hash,
        next: next.hash,
        subjects: census.length,
        keys: selected.keys.length,
        rows: rows.length,
        sha: expected[i].sha,
        pulls: selected.worldPulls,
      }),
    );
  }
  const available = allIndexes();
  available.delete("EVSUB");
  const safe = new LookupIndex(census, worlds, basis, available),
    idx = pairs.findIndex(([_, z]) => z === 5);
  const fallback = safe.select(W0.R1, releases[5]!, (s) => map.get(s)!);
  assert.deepEqual(fallback.keys, expected[idx].keys);
  assert.equal(fallback.worldPulls, census.length);
  assert.throws(() => new LookupIndex(census.slice(1), worlds, basis), /census/);
});
