import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { startupAdmission } from "./cold-admission.mjs";
import { summarizeOffers } from "./cold-windows.mjs";
import { checkProfileFlags, coldStartLog, launchProfile, roles, startupFlags } from "./launch.mjs";

// [DX-JVM1] Why: check full flags through HotSpot and exercise refused-offer accounting without consuming a lab VM slot.
// Rejected: inferring JVM acceptance from parser tests or treating the reduced process as a server timing result.
const [java, directory] = process.argv.slice(2);
assert(java && directory);
const options = { jvm: "j25-g1", txJvm: "j25-zgc", reduced: true };
assert.deepEqual(launchProfile("server", options), launchProfile("server", { ...options, startup: "today" }));
for (const startup of ["today", "tuned"]) {
  const profile = launchProfile("server", { ...options, startup });
  for (const role of roles) {
    const logFlag = coldStartLog.replace("/trace/%p-startup.log", join(directory, role + "-startup.log"));
    const expected = profile[role];
    const flags = expected.flags.filter((flag) => process.platform === "linux" || flag !== "-XX:-UseTransparentHugePages");
    const bytes = execFileSync(java, [...flags, ...startupFlags, logFlag, "-version"], { encoding: "utf8" });
    checkProfileFlags({ ...expected, flags }, bytes);
    console.log(startup, role, profile[role].collector);
  }
}
const admit = startupAdmission();
assert.equal(Array.from({ length: 2315 }, () => admit(1, 0)).filter(Boolean).length, 1165);
assert(admit(0, 0) && admit(1, 60_000));
const refused = [{ due: 0, status: "startup-refused", startupRefusal: "queue" }];
const acked = [{ due: 15_000, end: 15_041, dispatched: 15_005, account: 0, status: "acked" }];
const view = summarizeOffers([...refused, ...acked], 0);
assert.deepEqual([view.bins[0].queueRefusals, view.bins[0].allOfferP99Ms, view.bins[1].allOfferP99Ms], [1, null, 41]);
assert.equal(view.allOfferSettledSeconds, null);
