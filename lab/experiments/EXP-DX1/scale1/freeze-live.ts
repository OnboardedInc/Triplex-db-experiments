import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { geometryHash, liveProfile, liveWindows, liveEdits } from "./deep-live.ts";
import { tenantPlan } from "./tenant-traffic.ts";
const file = new URL("./deep-live-pins.json", import.meta.url);
const mode = process.argv[2] ?? "check";
assert(["write", "check"].includes(mode));
const pins: Record<string, unknown> = {};
const firstBusiness = new Map<number, string>();
for (const live of ["staggered", "coincident"] as const) {
  const logical: Record<string, string> = {};
  let primary = 0,
    small = 0;
  for (let physical = 0; physical < 10; physical++) {
    const p = tenantPlan(
      { study: "interference", topology: "separate", physical, live },
      "interference",
      false,
    );
    Object.assign(logical, p.logical);
    const business = createHash("sha256");
    for (const e of p.events)
      if (!e.resend) {
        business.update(
          JSON.stringify([
            e.localSeq,
            e.localSubject,
            e.kind,
            e.deep,
            e.facts,
            e.correction,
            e.ackLoss,
            liveEdits(e.localSubject, e.localSeq, e.kind, e.deep),
          ]) + "\n",
        );
        primary++;
        if (e.facts <= 3) small++;
      }
    const sha = business.digest("hex");
    if (live === "staggered") firstBusiness.set(physical, sha);
    else assert.equal(sha, firstBusiness.get(physical), "Peak alignment changed a business intent");
  }
  if (mode === "check") {
    const pooled = tenantPlan(
      { study: "interference", topology: "pooled", physical: 0, live },
      "interference",
    );
    assert.deepEqual(pooled.logical, logical);
  }
  assert(small > primary / 2);
  pins[live] = {
    profile: liveProfile,
    geometry: geometryHash(liveWindows(live)),
    logical,
    primary,
    atMostThreeAssertions: small,
  };
  console.log(live, primary, small);
}
if (mode === "write") fs.writeFileSync(file, JSON.stringify(pins, null, 2) + "\n", { flag: "wx" });
else assert.deepEqual(pins, JSON.parse(fs.readFileSync(file, "utf8")));
