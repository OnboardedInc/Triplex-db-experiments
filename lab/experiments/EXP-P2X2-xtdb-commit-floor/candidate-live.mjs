// @ts-nocheck -- [EXP-CHECKJS-R2] unannotated local values; unannotated dynamic parameters; initially empty collections. Binding errors remain checked by lab/bin/checkjs.mjs.
// [EXP-P2X2] Why: exercise actual same-subject grouping, cross-subject concurrency and original receipts.
// Rejected: relying only on the queue's fake executor tests before the ten-minute trace.
import path from "node:path";
import { runtime } from "./runtime.mjs";
import { compose } from "./candidate.mjs";
import { attempt, observe, quiet, save, finish } from "./observe.mjs";
const a = attempt("candidate-live"),
  rt = await runtime(process.argv[2], "C", a.id),
  q = compose(rt, a.id),
  before = observe();
save(path.join(a.dir, "before.json"), before);
try {
  const events = Array.from({ length: 20 }, (_, seq) => ({
    seq,
    subject: seq < 10 ? 0 : seq,
    facts: 10,
    resend: false,
  }));
  const pending = events.map((e) => q.submit(e));
  pending.push(q.submit({ ...events[3], resend: true }));
  const out = await Promise.all(pending);
  const lostRetry = await q.submit({ ...events[0], resend: true, retry: true });
  const records = [];
  let content = true;
  for (let i = 0; i < 20; i++) {
    const r = out[i].result,
      record = await rt.run(rt.triples.transaction(r.txId)),
      rows = await rt.run(
        rt.adapter.getByEntity(rt.core.EntityId.make(`subj:${events[i].subject}`), {
          validAt: Date.now(),
          recordedPosition: r.position,
        }),
      );
    const own = rows.filter((row) => row.tx_id === r.txId);
    content &&=
      record?.txId === r.txId &&
      record?.position === r.position &&
      own.length === 10 &&
      own.every((row) => row.value_string === `v${a.id}:${i}-${row.attribute.slice(6)}`);
    records.push(record);
  }
  const duplicate = out[20],
    same = (r, i) =>
      r.duplicate &&
      r.result.txId === out[i].result.txId &&
      r.result.position === out[i].result.position &&
      JSON.stringify(r.record) === JSON.stringify(records[i]);
  const after = observe();
  save(path.join(a.dir, "after.json"), after);
  save(path.join(a.dir, "outcomes.json"), { events, out, lostRetry, records });
  const gates = {
    content,
    duplicates: same(duplicate, 3) && same(lostRetry, 0),
    groupEight: q.groups.includes(8),
    crossSubjectParallel: q.maxRunning > 1 && q.maxRunning <= 16,
    zeroCAS:
      rt.counts.casConflicts === 0 &&
      rt.counts.otherRejections === 0 &&
      rt.counts.transportErrors === 0 &&
      rt.counts.submits === q.groups.length - 1,
    quiet: quiet(before).zero,
  };
  finish(a, {
    binding: before.binding,
    afterBinding: after.binding,
    gates,
    counts: rt.counts,
    groups: q.groups,
    qualified: Object.values(gates).every(Boolean),
  });
  console.log(a.id, gates);
  if (!Object.values(gates).every(Boolean)) process.exitCode = 1;
} finally {
  await rt.close();
}
