import { vi } from "vitest";
import { DatomicClient } from "../../../../packages/datomic/src/DatomicClient.js";
// [DX-B5-L1] Why: run the existing scenarios on a fresh lean scope without copying their assertions.
// Rejected: environment-dependent production defaults (legacy must remain the default).
if (process.env.DATOMIC_TEST_LAYOUT === "lean") {
  const create = DatomicClient.prototype.create;
  vi.spyOn(DatomicClient.prototype, "create").mockImplementation(function(scope, layout) {
    return create.call(this, scope, layout === "lean" ? layout : "lean");
  });
}
