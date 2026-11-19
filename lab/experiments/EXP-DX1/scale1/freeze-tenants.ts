import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import {
  tenantAccounts,
  tenantPinKey,
  tenantPopulationHash,
  type TenantStudy,
  type Topology,
} from "./tenants.ts";
import { tenantPlan, tenantWindows } from "./tenant-traffic.ts";
// [DX-SCALE1] Why: freeze ordered seed contents separately from each account's offers and each arm's exact reader schedule. Rejected: building an expected digest from the measured attempt at startup.
const modes: Record<TenantStudy, string[]> = {
  smoke: ["interference"],
  interference: ["interference"],
  small: ["small"],
  million: ["zero", "reader", "activation"],
};
const choice = process.argv[2] ?? "check";
assert(["check", "write", "check-offers", "write-windows"].includes(choice));
const offerPins: Record<string, Record<string, string>> = {},
  seedPins: Record<string, string> = {},
  windows: Record<string, string> = {};
for (const [study, arms] of Object.entries(modes) as [TenantStudy, string[]][]) {
  const one = { study, topology: "pooled" as const, physical: 0 };
  for (const arm of arms) {
    const key = study + "/" + arm;
    if (choice !== "write-windows") offerPins[key] = tenantPlan(one, arm, false).logical;
    windows[key] = createHash("sha256")
      .update(JSON.stringify(tenantWindows(one, arm)))
      .digest("hex");
  }
  if (choice === "write" || choice === "check") {
    for (const topology of ["pooled", "separate"] as Topology[]) {
      if (study === "million" && topology === "separate") continue;
      const n = topology === "pooled" ? 1 : tenantAccounts(one).length;
      for (let physical = 0; physical < n; physical++) {
        const spec = { study, topology, physical };
        seedPins[tenantPinKey(spec)] = tenantPopulationHash(spec);
      }
    }
  }
  console.log(study);
}
function verify(file: string, values: object) {
  const uri = new URL(file, import.meta.url);
  if (choice === "write" || choice === "write-windows")
    fs.writeFileSync(uri, JSON.stringify(values, null, 2) + "\n");
  else assert.deepEqual(values, JSON.parse(fs.readFileSync(uri, "utf8")));
}
verify("./tenant-windows.json", windows);
if (choice !== "write-windows") verify("./tenant-traces.json", offerPins);
if (choice === "check" || choice === "write") verify("./tenant-seeds.json", seedPins);
