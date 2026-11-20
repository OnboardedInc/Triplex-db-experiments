import assert from "node:assert/strict";
import test from "node:test";
import { W0 } from "../../../../bench/lib/w0-world.ts";
import { DomainOracle } from "../../../../bench/lib/w0-gates.ts";
import { entry, hits, indexInputs, leaf, strategy } from "./index.ts";

test("notice and stored-output ranges cover every independently changed row in both directions", async () => {
  const source = W0.rung(50);
  const worlds = [...W0.population(source)].map((p) => p.world);
  const variant = (id: W0.RuleId, params: object) =>
    W0.compileRelease({
      ...W0.R1.doc,
      rules: W0.R1.doc.rules.map((r) => (r.id === id ? { ...r, params } : r)),
    } as W0.ReleaseDoc);
  const variants = [
    W0.R2,
    W0.R3,
    variant("I9S2", { businessDays: 8 }),
    variant("EVSUB", { businessDays: 1 }),
    variant("EVSTAT", { tncBusinessDays: 1 }),
    variant("PAYCHG", { thresholdCents: 0 }),
    variant("PAYCHG", { thresholdCents: 501 }),
    variant("DOCEXP", { leadDays: { ead: 1, visa: 12 } }),
    variant("DOCEXP", { leadDays: { visa: 0 } }),
    variant("OT", { thresholdMinutes: 2201 }),
  ];
  const oracle = new DomainOracle(new URL("./oracle.py", import.meta.url).pathname);
  let checked = 0,
    owed = 0,
    display = 0;
  try {
    for (const validTime of [W0.POPULATION_VALID_TIME, "2026-12-31T00:00:00.000000Z"]) {
      const basis = { tx: 1000000, validTime },
        pages = [false, true].map((expanded) => leaf(worlds.map((w) => entry(w, basis, expanded))));
      for (const candidate of variants)
        for (const [old, next] of [
          [W0.R1, candidate],
          [candidate, W0.R1],
        ] as const) {
          const expected = JSON.parse(
            await oracle.call("check", {
              worlds,
              basis,
              old: old.doc,
              document: next.doc,
              fold: false,
            }),
          );
          for (const [version, page] of pages.entries())
            for (const kind of ["output", "notice"] as const) {
              const expanded = version === 1 && kind === "output";
              const mode = strategy(old, next, kind, true, expanded);
              const selected = new Set(
                mode === "all"
                  ? page.ids
                  : mode === "none"
                    ? []
                    : hits(page, old, next, basis, expanded).ids,
              );
              for (const row of expected) {
                const changed = row.rows.some(
                  ([key]: [string]) => kind === "output" || JSON.parse(key)[3] === "work",
                );
                if (changed) {
                  assert(
                    selected.has(row.subject),
                    JSON.stringify([kind, expanded, row.subject, old.hash, next.hash, mode]),
                  );
                  if (kind === "notice") owed++;
                  else display++;
                }
                checked++;
              }
            }
        }
    }
    assert.equal(checked, worlds.length * 2 * variants.length * 2 * 2 * 2);
    assert(owed > 0 && display > owed);
    assert(!indexInputs.has("weeklyMinutes") && !indexInputs.has("ssn"));
  } finally {
    oracle.close();
  }
});
