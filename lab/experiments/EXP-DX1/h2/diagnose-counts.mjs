import fs from "node:fs";
import { inspect } from "node:util";
import { measurementLease } from "../../../bench/lib/w0-lease.ts";
import { openComposition } from "../../../bench/lib/composition.ts";
process.env.DATOMIC_URL = "http://127.0.0.1:8497";
const { scope } = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const lease = await measurementLease();
const comp = await openComposition("reach", "datomic", scope);
try {
  console.log({ scope, head: await comp.currentPosition() });
  for (const limit of [1, 10, 100]) {
    const start = performance.now();
    try {
      const page = await comp.feedPage(0, limit);
      console.log({
        kind: "feed",
        limit,
        transactions: page.transactions.length,
        wallMs: performance.now() - start,
      });
    } catch (e) {
      console.error(inspect(e, { depth: 15, showHidden: true, customInspect: false }));
    }
  }
  const start = performance.now();
  try {
    console.log({
      kind: "counts",
      counts: await comp.storeCounts(),
      wallMs: performance.now() - start,
    });
  } catch (e) {
    console.error(inspect(e, { depth: 15, showHidden: true, customInspect: false }));
    process.exitCode = 1;
  }
} finally {
  await comp.close();
  lease.release();
}
