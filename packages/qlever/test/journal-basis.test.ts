import { expect, it } from "vitest";
import { journalBasis } from "@triplex-build/triplex";
import { compileQlever } from "../src/compiler.js";

// [EXP-RT01] Why: the QLever journal index must lower the same clock-free record cut. Rejected: assuming the SQL compiler regression covers emitted SPARQL.
it("journal compilation retains record visibility without business-time filters", () => {
  const query = { find: ["?e"], where: [["?e", ":_tx/position", "?position"]] } as const;
  const journal = compileQlever(query, "scope", {
    basis: journalBasis(7) as { validAt: number; allValidTime: true; recordedPosition: number },
  }).sparql;
  const business = compileQlever(query, "scope", {
    basis: { validAt: 900, recordedPosition: 7 },
  }).sparql;
  expect(journal).toContain("recorded_position_order");
  expect(journal).toContain("retracted_position_order");
  expect(journal).not.toMatch(/\?\w*valid_from_order\s*<=/);
  expect(journal).not.toMatch(/\?\w*valid_to_order\s*>/);
  expect(business).toMatch(/\?\w*valid_from_order\s*<=/);
});
