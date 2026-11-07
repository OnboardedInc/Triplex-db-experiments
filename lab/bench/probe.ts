/** Development probe (not a gate): one 400-fact seed command through a composition, printing any failure. */
import { openComposition } from "./lib/composition.ts";
import { seedOps } from "./lib/commands.ts";
import { sharedFacts } from "./lib/world.ts";

const [lane, name] = [(process.argv[2] ?? "xtdb") as "xtdb" | "qlever", process.argv[3] ?? "public-queued"];
const comp = await openComposition(name, lane, `n01-probe-${Date.now()}`);
const t0 = performance.now();
const out: any = await comp.transact(seedOps(sharedFacts(5).slice(0, 400)), { commandId: `probe-${Date.now()}` });
console.log(out.ok ? `ok position ${out.value.position}` : `FAIL ${out.tag}: ${String(out.error?.message ?? out.error).slice(0, 800)}`, `${(performance.now() - t0).toFixed(0)} ms`);
if (!out.ok) console.log(String(out.error?.stack ?? "").slice(0, 1500), JSON.stringify(out.error?.cause ?? null)?.slice(0, 800));
await comp.close();
