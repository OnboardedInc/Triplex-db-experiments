import { submitReferenceCommand } from "./w0-seed-order.ts";
import fs from "node:fs";
import type { CompositionHandle } from "./composition.ts";
import { W0, canonical, sha256, triplexValue, V_W0, many } from "./w0-world.ts";
type Row = readonly [string, string, any];
export interface W0Command {
  position: number;
  rows: readonly Row[];
  validFrom: number;
}
export function* seedCommands(N: number): Generator<W0Command> {
  const R = W0.rung(N);
  let position = 0;
  const command = (rows: readonly Row[], validFrom = V_W0): W0Command => ({
    position: ++position,
    rows,
    validFrom,
  });
  for (let q = 1; q <= R.K; q++)
    yield command([[W0.jurisdictionId(R, q), "stateMinWageCents", W0.stateFloor(q)]]);
  for (let r = 1; r <= R.L; r++) {
    const loc = W0.locationId(R, r);
    yield command([
      [loc, "jurisdiction", W0.jurisdictionId(R, W0.jurisdictionOf(R, r))],
      ...(W0.hasLocalFloor(r) ? [[loc, "localMinWageCents", 1850] as Row] : []),
    ]);
  }
  // [EXP-P5] Why: population worlds omit overwritten assertions and the future raise; reconstruct the reference command plan. Rejected: grouping final facts by tx (loses positions and history).
  for (const pl of W0.population(R)) {
    const p = pl.plan,
      S = p.S;
    const first = position;
    const hire: Row[] = [];
    if (p.startDate !== null) hire.push([S, "startDate", p.startDate]);
    if (p.rank !== null) hire.push([S, "location", W0.locationId(R, p.rank)]);
    if (p.pay !== null)
      hire.push([S, "baselinePayRateCents", p.pay.baseline], [S, "payRateCents", p.pay.baseline]);
    if (p.wm !== null) hire.push([S, "weeklyMinutes", p.wm]);
    if (hire.length) yield command(hire);
    const s1: Row[] = [];
    if (p.s1) s1.push([S, "section1AttestedAt", "2026-11-01T15:00:00.000000Z"]);
    if (p.ssn !== null) s1.push([S, "ssn", p.ssn]);
    if (s1.length) yield command(s1);
    if (p.bgc !== null) yield command([[S, "bgcStatus", p.bgc]]);
    if (p.ev !== null)
      yield command([
        [S, "everifyStatus", p.ev],
        [S, "everifyStatusAt", p.evAt],
      ]);
    if (p.evres !== null) yield command([[S, "everifySubmitResult", p.evres]]);
    if (p.doc !== null) {
      const d = S + "/doc:1",
        rows: Row[] = [
          [S, "documents", d],
          [d, "docType", p.doc.type],
        ];
      if (p.doc.expiresOn !== null) rows.push([d, "expiresOn", p.doc.expiresOn]);
      if (p.doc.reverified) rows.push([d, "reverified", true]);
      yield command(rows);
    }
    for (const r of [...p.i9Records, p.bgcRecord, p.payRecordBefore])
      if (r)
        yield command([
          [S, "decisions", r.id],
          [r.id, "target", r.target],
          [r.id, "verdict", r.verdict],
          [r.id, "author", r.author],
        ]);
    if (p.pay && p.pay.c !== 0) yield command([[S, "payRateCents", p.pay.final]]);
    const r = p.payRecordAfter;
    if (r)
      yield command([
        [S, "decisions", r.id],
        [r.id, "target", r.target],
        [r.id, "verdict", r.verdict],
        [r.id, "author", r.author],
      ]);
    const n = pl.answers;
    for (let first = 1; first <= n; first += p.hops) {
      const last = Math.min(first + p.hops - 1, n),
        rows: Row[] = [[S, "answers", S + "/ans:" + first]];
      for (let k = first; k <= last; k++) {
        const a = S + "/ans:" + k;
        rows.push([a, "field", "q" + k], [a, "value", "a" + k]);
        if (k < last) rows.push([a, "next", S + "/ans:" + (k + 1)]);
      }
      yield command(rows);
    }
    if (p.raise)
      yield command([[S, "payRateCents", p.pay!.final + 100]], Date.parse("2026-11-16T00:00:00Z"));
    if (position - first !== pl.commands) throw new Error("reference command count mismatch: " + S);
  }
}
export async function seedW0(
  comp: CompositionHandle,
  N: number,
  logFile: string,
  checkpoint?: () => Promise<void>,
  concurrency = 1,
  serialPrefix = 0,
  range?: {
    from: number;
    through: number;
    latest: Map<string, string>;
    discardLog?: boolean;
  },
) {
  // [DX-H5] Why: W0's immutable fingerprint includes reference commit positions.
  // Rejected: silently accepting reordered concurrent seed commands as the reference world.
  if (!Number.isSafeInteger(concurrency) || concurrency < 1 || concurrency > 64)
    throw Error("invalid seed concurrency");
  if (!Number.isSafeInteger(serialPrefix) || serialPrefix < 0)
    throw Error("invalid serial seed prefix");
  // [DX-S5] Why: ranges resume only at the observed dense head, with scalar identities restored from durable journals.
  // Rejected: replaying committed writes (duplicates can conceal an incorrect recovery position).
  const from = range?.from ?? 0;
  const through = range?.through ?? W0.populationBasis(W0.rung(N)).tx;
  if (!Number.isSafeInteger(from) || !Number.isSafeInteger(through) || from < 0 || through < from)
    throw Error("invalid seed range");
  if ((await comp.currentPosition()) !== from) throw new Error("W0 seed head mismatch");
  const seedStarted = performance.now();
  const Rseed = W0.rung(N);
  const fd = fs.openSync(logFile, range?.discardLog ? "w" : "wx"),
    latest = range?.latest ?? new Map<string, string>();
  let assertions = 0,
    retractions = 0,
    position = from;
  const commandsHash = (await import("node:crypto")).createHash("sha256");
  // [DX-H6] Why: submit the one reference stream in order, retaining bounded ACKs and scalar dependencies.
  // Rejected: per-subject concurrent producers (their arrival positions differ from the reference).
  const pending: { c: W0Command; operations: any[]; commandId: string; ack: Promise<any> }[] = [];
  const pendingKeys = new Map<string, number>();
  let peakInFlight = 0;
  const drain = async () => {
    const { c, operations, commandId, ack } = pending.shift()!;
    const result = await ack;
    if (!result.ok || result.value.position !== c.position) {
      fs.writeFileSync(
        logFile + ".failure.json",
        JSON.stringify(
          { expectedPosition: c.position, commandId, operations, result },
          (_key, value) => (typeof value === "bigint" ? value.toString() : value),
          2,
        ) + "\n",
      );
      if (!result.ok) throw new Error(`seed ${c.position}: ${result.tag}`);
      throw new Error(`reference position mismatch ${c.position} != ${result.value.position}`);
    }
    for (const t of result.value.triples)
      if (!many.has(t.attribute)) latest.set(t.entityId + "\0" + t.attribute, t.id);
    for (const [e, a] of c.rows)
      if (pendingKeys.get(e + "\0" + a) === c.position) pendingKeys.delete(e + "\0" + a);
    assertions += c.rows.length;
    retractions += operations.length - c.rows.length;
    position = c.position;
    const line = canonical({ commandId, operations, receipt: result.value }) + "\n";
    if (!range?.discardLog) fs.writeSync(fd, line);
    commandsHash.update(line);
    if (position % 1000 === 0)
      console.error(
        `[DX-H6 seed] ${position} commands, ${((position - from) / ((performance.now() - seedStarted) / 1000)).toFixed(1)} commands/s, window ${concurrency}`,
      );
    await checkpoint?.();
  };
  try {
    for (const c of seedCommands(N)) {
      if (c.position <= from) continue;
      if (c.position > through) break;
      while (
        pending.length >= (c.position <= serialPrefix ? 1 : concurrency) ||
        c.rows.some(([e, a]) => !many.has(a) && pendingKeys.has(e + "\0" + a))
      )
        await drain();
      const operations: any[] = [];
      for (const [e, a, v] of c.rows) {
        const key = e + "\0" + a;
        // [EXP-P5] Why: replacement is atomic with the new assertion; the scheduled raise closes valid time instead of retracting today's value. Rejected: globally retracting for a future raise (breaks G0).
        if (!many.has(a) && c.validFrom <= V_W0 && latest.has(key))
          operations.push({ op: "retract", id: latest.get(key) });
        operations.push({
          op: "assert",
          entityId: e,
          attribute: a,
          value: triplexValue(a, v),
          validFrom: c.validFrom,
          ...(a === "payRateCents" &&
          c.validFrom <= V_W0 &&
          W0.plan(Rseed, Number(e.slice(4))).raise
            ? { validTo: Date.parse("2026-11-16T00:00:00Z") }
            : {}),
        });
      }
      const commandId = `p5:seed:${c.position}`;
      const { ack } = await submitReferenceCommand(comp, operations, {
        commandId,
        actor: "p5-seed",
      });
      // Observe rejections immediately even if an earlier ordered ACK is still pending.
      void ack.catch(() => {});
      pending.push({ c, operations, commandId, ack });
      for (const [e, a] of c.rows) if (!many.has(a)) pendingKeys.set(e + "\0" + a, c.position);
      peakInFlight = Math.max(peakInFlight, pending.length);
    }
    while (pending.length) await drain();
  } finally {
    const unresolved = await Promise.allSettled(pending.map((p) => p.ack));
    if (pending.length)
      fs.writeFileSync(
        logFile + ".unconsumed.ndjson",
        pending
          .map((p, i) =>
            JSON.stringify(
              {
                expectedPosition: p.c.position,
                commandId: p.commandId,
                operations: p.operations,
                outcome: unresolved[i],
              },
              (_key, value) => (typeof value === "bigint" ? value.toString() : value),
            ),
          )
          .join("\n") + "\n",
      );
    fs.closeSync(fd);
  }
  const R = W0.rung(N),
    basis = W0.populationBasis(R);
  if (position !== through) throw new Error("population range mismatch");
  const commandWallMs = performance.now() - seedStarted;
  const countsStarted = performance.now();
  const counts = await comp.storeCounts();
  const countsWallMs = performance.now() - countsStarted;
  return {
    submissionOrder:
      comp.backend?.name === "datomic"
        ? "public-onSent-before-next-reference-command"
        : "caller-order",
    serialPrefix,
    requestedInFlight: concurrency,
    peakInFlight,
    commandWallMs,
    ...(range
      ? { fromPosition: from, throughPosition: through, seededCommands: position - from }
      : {}),
    commandCommandsPerS: (position - from) / (commandWallMs / 1000),
    countsWallMs,
    spec: "W0-1.1.2",
    seed: "W0-pop-1",
    N,
    L: R.L,
    K: R.K,
    basis: range ? { ...basis, tx: through } : basis,
    assertions,
    retractions,
    commands: position,
    logSha256: commandsHash.digest("hex"),
    counts,
    releaseHashes: [W0.R1.hash, W0.R2.hash, W0.R3.hash],
    wallMs: performance.now() - seedStarted,
    commandsPerS: (position - from) / ((performance.now() - seedStarted) / 1000),
    mapper: sha256(fs.readFileSync(new URL("./w0-seed.ts", import.meta.url))),
  };
}
