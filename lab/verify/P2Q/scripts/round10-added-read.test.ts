// [CX-VP2Q-4-R10] Why: prove the scratch member is a real public type property and an executable unguarded read.
// Rejected: merely appending unused text to an interface (does not prove a runtime policy bypass exists).
import path from "node:path";
import { randomUUID } from "node:crypto";
import ts from "typescript";
import { expect, it, vi } from "vitest";
import * as policy from "../../../../packages/qlever/src/broker/snapshot.js";
import { graphIri } from "../../../../packages/qlever/src/rdf.js";
import { REPO, ModelReplica, openRt, freshDir, ops, writeJson } from "./harness.js";
it("round10 independent scratch control proves the added public read bypasses both policies", async () => {
  const file = path.join(REPO, "packages/core/src/store/Triples.ts");
  const program = ts.createProgram([file], { noResolve: true, skipLibCheck: true });
  const declaration = program.getSourceFile(file)!.statements.find(node => ts.isInterfaceDeclaration(node) && node.name.text === "TriplesService")!;
  const names = program.getTypeChecker().getPropertiesOfType(program.getTypeChecker().getTypeAtLocation(declaration)).map(symbol => symbol.name);
  expect(names).toContain("round10Read");
  const scope = `round10-scratch:${randomUUID()}`, replica = new ModelReplica(graphIri(scope));
  const rt = await openRt(freshDir("round10-scratch"), scope, replica, { autoApply: false });
  try {
    await rt.run(rt.triples.transact(ops("s:round10", 1, "first")));
    expect(typeof (rt.triples as any).round10Read).toBe("function");
    const gate = vi.spyOn(policy, "awaitSnapshotBasis"), mask = vi.spyOn(policy, "snapshotRows");
    try {
      const requested = rt.broker.head() + 4096;
      const value = await rt.run((rt.triples as any).round10Read({ recordedPosition: requested, validAt: Date.now() }));
      writeJson("round10-added-read-observation.json", { purpose: "counterexample, not product acceptance", names, requested, observed: rt.broker.head(), value, gateCalls: gate.mock.calls.length, maskCalls: mask.mock.calls.length });
      expect(value).toEqual([]);
      expect(gate.mock.calls.length).toBe(0);
      expect(mask.mock.calls.length).toBe(0);
    } finally { gate.mockRestore(); mask.mockRestore(); }
  } finally { await rt.dispose(); await rt.broker.close(); }
});
