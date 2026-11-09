// [EXP-P5N] Why: one-line-per-run view of the activation receipts (wall, CPU per subject by stage, writer split, load) so runs compare without re-reading screen.json. Pure read of saved files.
import fs from "node:fs";
for (const dir of process.argv.slice(2)) {
  const d = JSON.parse(fs.readFileSync(dir + "/screen.json", "utf8"));
  for (const [k, a] of Object.entries(d.activation ?? {})) {
    const N = a.N, c = a.cpuS, i = a.instrument ?? {}, w = i.writer;
    const per = (x) => ((x * 1000) / N).toFixed(2);
    console.log(
      [dir.split("/").pop(), k, "wall " + (a.wallMs / 1000).toFixed(1) + "s", (a.subjectsPerS).toFixed(0) + "/s",
       "cpu/subj ms read " + per(c.read) + " decode " + per(c.decode) + " kernel " + per(c.kernel) + " store " + per(a.storeCpuS),
       "pageTx p50 " + a.pageTransactionMs.p50?.toFixed(0) + " max " + a.pageTransactionMs.max?.toFixed(0),
       "outbox pulls " + (a.publishStage.pullMs / 1000).toFixed(2) + "s commit/pg " + (a.publishStage.transactMs / a.publishStage.transacts).toFixed(1) + "ms",
       w ? "writer/commit " + (w.sumMs.totalMs / w.appends).toFixed(1) + "ms (fsync " + (w.sumMs.commitMs / w.appends).toFixed(1) + " jrnl " + (w.sumMs.journalMs / w.appends).toFixed(2) + " fact " + (w.sumMs.factMs / w.appends).toFixed(2) + " prep " + (w.sumMs.prepareMs / w.appends).toFixed(1) + ")" : "",
       i.unattributedS !== undefined ? "unattr " + i.unattributedS.toFixed(1) + "s" : "",
       i.eluMainThread !== undefined ? "elu " + i.eluMainThread.toFixed(2) : "",
       a.load ? "load " + a.load.start[0].toFixed(1) + "->" + a.load.end[0].toFixed(1) : ""].filter(Boolean).join(" | "),
    );
  }
}
