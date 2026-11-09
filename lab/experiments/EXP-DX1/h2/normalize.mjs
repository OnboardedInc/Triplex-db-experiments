import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { matchW0Live } from "../../../bench/lib/w0-live.ts";
const hash = (p) => createHash("sha256").update(fs.readFileSync(p)).digest("hex");
// [DX-H2] Why: TARGETS measures scheduled offer to ACK, not transact service time; raw writes preserve both clocks.
// Rejected: rewriting original receipts or treating a short baseline as coverage of the full sweep.
for (const file of process.argv.slice(2)) {
  const report = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!report.live?.baseline || !report.live?.sweep) throw Error("missing completed traffic arms");
  const { baseline, sweep } = report.live;
  if (![baseline, sweep].every((a) => Number.isFinite(a.startedAtMs)))
    throw Error("receipt lacks absolute window binding");
  const out = file.replace(/\.json$/, "-target-clock.json");
  if (fs.existsSync(out)) throw Error("normalization output already exists: " + out);
  const full = (arm) => {
    const r = matchW0Live(arm, arm);
    return Object.fromEntries(["read", "commit", "commitService"].map((k) => [k, r[k].baseline]));
  };
  const result = {
    classification: "DIAGNOSTIC",
    acceptance: false,
    originalStatus: report.status,
    writerClock:
      "scheduled-offer-to-ACK including queueing; all offered command requests, including duplicate resolutions",
    receiptSha256: hash(file),
    normalizerSha256: hash(fileURLToPath(import.meta.url)),
    matcherSha256: hash(fileURLToPath(new URL("../../../bench/lib/w0-live.ts", import.meta.url))),
    rawSha256: { baseline: hash(baseline.raw), sweep: hash(sweep.raw) },
    fullWindow: { baseline: full(baseline), sweep: full(sweep) },
    matched: matchW0Live(baseline, sweep),
  };
  fs.writeFileSync(out, JSON.stringify(result, null, 2) + "\n");
  console.log(out);
}
