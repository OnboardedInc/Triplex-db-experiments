import { defineConfig } from "vitest/config";
import { workspaceAliases } from "../../vitest.workspace-aliases";

export default defineConfig({
  // [EXP-FD01] Why: G0 now includes host; resolve every backend through its public source alias.
  // Rejected: passing the alias factory itself (leaves clean-checkout SQLite tests unresolvable).
  resolve: { alias: workspaceAliases() },
  test: { environment: "node" },
});
