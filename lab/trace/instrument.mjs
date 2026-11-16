// @ts-nocheck -- [DX-T1-10] Why: validate heterogeneous recorded clocks at the boundary. Rejected: silently invent an ACK or a zero scheduler delay.
const finite = (...xs) => xs.every(Number.isFinite);
const exact = (xs, p) =>
  xs.length ? [...xs].sort((a, b) => a - b)[Math.max(0, Math.ceil(xs.length * p) - 1)] : null;
const summary = (values) => { const xs = values.filter(Number.isFinite); return ({
  count: xs.length,
  p50Ms: exact(xs, 0.5),
  p99Ms: exact(xs, 0.99),
  maxMs: xs.length ? Math.max(...xs) : null,
}); };
export const VERDICT_CLOCK = "ack/1";
// [DX-T1-12] Why: every judged commit ends at the final receipt, even in old off runs without an offer stamp.
// Rejected: falling back to finish or subtracting scheduler lateness (both change Sam's chosen clock).
export function verdictEnd(w) {
  if (!finite(w.scheduledAt, w.startedAt, w.finishedAt, w.ackPublishedAt, w.latencyMs) ||
      w.expired || w.startedAt < w.scheduledAt || w.finishedAt < w.startedAt ||
      w.ackPublishedAt < w.startedAt || w.ackPublishedAt > w.finishedAt + 0.001 ||
      Math.abs(w.latencyMs - (w.finishedAt - w.scheduledAt)) > 0.001)
    throw Error("Invalid commit acknowledgement boundary");
  return w.ackPublishedAt;
}
export function verdictMs(w) {
  const value = verdictEnd(w) - w.scheduledAt;
  if (w.verdictClock !== undefined && w.verdictClock !== VERDICT_CLOCK)
    throw Error("Mixed commit verdict clocks");
  if (w.verdictMs !== undefined && (!Number.isFinite(w.verdictMs) || Math.abs(w.verdictMs - value) > 0.001))
    throw Error("Recorded verdict differs from acknowledgement");
  return value;
}
export function commitClocks(w) {
  if (
    !finite(w.scheduledAt, w.startedAt, w.finishedAt, w.ackPublishedAt, w.latencyMs, w.waitMs) ||
    w.startedAt < w.scheduledAt ||
    w.finishedAt < w.startedAt ||
    w.ackPublishedAt < w.startedAt ||
    w.ackPublishedAt > w.finishedAt + 0.001 ||
    Math.abs(w.latencyMs - (w.finishedAt - w.scheduledAt)) > 0.001 ||
    Math.abs(w.waitMs - (w.startedAt - w.scheduledAt)) > 0.001
  )
    throw Error("Invalid commit acknowledgement boundary");
  const observedLate = Array.isArray(w.queue)
    ? w.queue
        .filter((q) => q.cause === "scheduler-late")
        .reduce((n, q) => {
          if (
            !finite(q.start, q.end) ||
            q.start < w.scheduledAt - 0.001 ||
            q.end > w.startedAt + 0.001 ||
            q.end < q.start
          )
            throw Error("Invalid scheduler interval");
          return n + q.end - q.start;
        }, 0)
    : null;
  const timerLatenessMs = Number.isFinite(w.offeredAt) ? w.offeredAt - w.scheduledAt : observedLate;
  if (
    timerLatenessMs === null ||
    timerLatenessMs < 0 ||
    timerLatenessMs > w.waitMs + 0.001 ||
    (observedLate !== null && Math.abs(observedLate - timerLatenessMs) > 0.001)
  )
    throw Error("Missing or inconsistent offer clock");
  const latencyToAckMs = w.ackPublishedAt - w.scheduledAt,
    latencyCorrectedMs = latencyToAckMs - timerLatenessMs;
  for (const [key, value] of Object.entries({
    latencyToAckMs,
    latencyCorrectedMs,
    timerLatenessMs,
  }))
    if (w[key] !== undefined && (!Number.isFinite(w[key]) || Math.abs(w[key] - value) > 0.001))
      throw Error("Recorded clock field differs: " + key);
  return {
    latencyToAckMs,
    latencyCorrectedMs,
    timerLatenessMs,
    postAckMs: w.finishedAt - w.ackPublishedAt,
  };
}

// [DX-T1-10] Why: reuse the benchmark histogram and exact window populations, without changing its authoritative bars.
// Rejected: counterfactual subtraction in the verdict or a corrected numerator against an uncorrected zero denominator.
export function instrumentMetrics(bench, writes, baseline, Histogram) {
  const clocked = w => {
    const ack = verdictMs(w);
    if (Number.isFinite(w.offeredAt) || Array.isArray(w.queue)) return { ...w, ...commitClocks(w) };
    return { ...w, latencyToAckMs: ack, postAckMs: w.finishedAt - w.ackPublishedAt, timerLatenessMs: null, latencyCorrectedMs: null };
  };
  const prim = writes.filter((w) => w.stream === "background" && !w.resend),
    good = prim.filter((w) => w.outcome === "committed" && !w.expired),
    valid = good.map(clocked);
  const base = baseline?.filter(w => w.outcome === "committed" && !w.expired).map(clocked) ?? null;
  const hist = (xs) => {
    const h = new Histogram();
    xs.filter(Number.isFinite).forEach((v) => h.recordMs(v));
    return h;
  };
  const band = (w) => (w.facts <= 10 ? "5-10" : w.facts <= 25 ? "11-25" : "26-50");
  const phases = [...(bench.phases ?? []), ...Object.entries(bench.pooledPhases ?? {}).filter(([name]) => !(bench.phases ?? []).some(p => p.name === name)).map(([name, s]) => ({ name, ...s, end: true }))],
    phase = (n) => phases.find((p) => p.name === n),
    window = (p) => ({ from: p.start + bench.config.settleS * 1000, to: p.end });
  const inWindow = (rows, from, to) =>
    rows.filter((w) => w.scheduledAt >= from && w.scheduledAt < to);
  const ranges = p => p.intervals?.map(x => ({ from: x.from + bench.traceStartAbsMs, to: x.to + bench.traceStartAbsMs })) ?? [window(p)];
  const inRanges = (rows, rs) => rows.filter(w => rs.some(r => w.scheduledAt >= r.from && w.scheduledAt < r.to));
  const metric = (w, key) =>
    key === "observed" ? w.latencyMs : key === "ackOnly" ? w.latencyToAckMs : w.latencyCorrectedMs;
  const definitions = {};
  for (const key of ["observed", "ackOnly", "corrected"]) {
    const bands = (rows) =>
      Object.fromEntries(
        ["5-10", "11-25", "26-50"].map((b) => [
          b,
          hist(rows.filter((w) => band(w) === b).map((w) => metric(w, key))).summary(),
        ]),
      );
    const l = phase("L256"),
      ww = l && window(l),
      loaded = ww ? inRanges(valid, ranges(l)) : [];
    const x = {
      allPrimary: summary(valid.map((w) => metric(w, key))),
      bandsAtL256: bands(loaded),
      bandsBurst: bands(valid.filter((w) => w.burst)),
      phases: {},
      recovery: null,
    };
    for (const p of phases.filter((p) => p.end)) {
      const rs = ranges(p),
        pop = inRanges(valid, rs),
        h = hist(pop.map((r) => metric(r, key)));
      const eligible =
        base && rs.every(w => bench.matchedBaseline?.offeredUntilTraceS * 1000 >= w.to - bench.traceStartAbsMs);
      const b = eligible
        ? base.filter(r => rs.some(w => r.offsetMs >= w.from - bench.traceStartAbsMs && r.offsetMs < w.to - bench.traceStartAbsMs))
        : [];
      const bh = hist(b.map((r) => metric(r, key))),
        denom = bh.percentileMs(99),
        num = h.summary().p99Ms;
      x.phases[p.name] = {
        count: pop.length,
        commit: h.summary(),
        maxMs: pop.length ? Math.max(...pop.map((r) => metric(r, key))) : null,
        baselineCount: b.length,
        baselineP99Ms: denom,
        writerRatio: denom > 0 && num !== null ? num / denom : null,
      };
    }
    const recovery = phase("recovery"),
      original = bench.priorities?.P1?.recovery;
    if ((recovery || bench.config?.profile === "v3") && original?.windows) {
      const width = recovery ? Math.min(30000, recovery.end - recovery.start) : 30000,
        windows = original.windows.map((r) => {
          const rs = r.intervals?.map(x => ({ from: x.from + bench.traceStartAbsMs, to: x.to + bench.traceStartAbsMs })) ?? [{ from: recovery.start + r.fromS * 1000, to: recovery.start + r.fromS * 1000 + width }],
            ch = hist(inRanges(valid, rs).map((w) => metric(w, key))),
            matched =
              base && rs.every(x => bench.matchedBaseline?.offeredUntilTraceS * 1000 >= x.to - bench.traceStartAbsMs)
                ? base.filter(w => rs.some(x => w.offsetMs >= x.from - bench.traceStartAbsMs && w.offsetMs < x.to - bench.traceStartAbsMs))
                : [],
            bh = hist(matched.map((w) => metric(w, key))),
            num = ch.percentileMs(99),
            denom = bh.percentileMs(99),
            rate = phase("L256")?.stats?.goodputPerS;
          const meets =
            r.violations === 0 &&
            r.readP99Ms !== null &&
            r.readP99Ms <= 100 &&
            (rate === undefined || r.reads / (rs.length * width / 1000) >= 0.9 * rate) &&
            denom > 0 &&
            num !== null &&
            num <= 1.25 * denom;
          return { ...r, commitP99Ms: num, matchedZeroReaderP99Ms: denom, meets };
        });
      const first = windows.find((w) => w.meets);
      x.recovery = { windows, recoveredAfterMs: first ? first.fromS * 1000 + width : null };
    }
    definitions[key] = x;
  }
  return {
    schema: "triplex.instrument.v1",
    authoritative: "ackOnly",
    correctedRule:
      "ACK minus scheduled offer minus observed scheduler lateness: counterfactual on-time offer; subject/slot waits remain. GC/event-loop lateness is removed too, so this is diagnostic, not acceptance.",
    ackRule: "ACK minus scheduled offer: actual scheduler lateness retained.",
    primary: prim.length,
    qualified: valid.length,
    missing: prim.length - valid.length,
    timerLateness: summary(valid.map((w) => w.timerLatenessMs)),
    postAck: summary(valid.map((w) => w.postAckMs)),
    definitions,
  };
}

export function idleAndPhaseMetrics(writes, phases, requests = []) {
  const sorted = writes
      .filter((w) => !w.expired && finite(w.startedAt, w.finishedAt))
      .toSorted((a, b) => a.startedAt - b.startedAt),
    groups = new Map(),
    byId = new Map(),
    counts = {};
  let lastFinish = -Infinity;
  for (const r of requests) {
    const list = byId.get(r.traceId) ?? [];
    list.push(r);
    byId.set(r.traceId, list);
  }
  for (const w of sorted) {
    const gap = w.startedAt - lastFinish;
    lastFinish = Math.max(lastFinish, w.finishedAt);
    if (w.stream !== "background" || w.resend || w.outcome !== "committed") continue;
    const b = w.facts <= 10 ? "5-10" : w.facts <= 25 ? "11-25" : "26-50";
    const bucket =
      gap < 0
        ? "overlap"
        : gap < 50
          ? "0-50"
          : gap < 100
            ? "50-100"
            : gap < 250
              ? "100-250"
              : gap < 1000
                ? "250-1000"
                : ">=1000";
    const key = b + "/" + bucket,
      g = groups.get(key) ?? {
        band: b,
        gap: bucket,
        service: [],
        ackService: [],
        peer: [],
        gateway: [],
        before: [],
        after: [],
      };
    g.service.push(w.finishedAt - w.startedAt);
    if (Number.isFinite(w.ackPublishedAt)) g.ackService.push(w.ackPublishedAt - w.startedAt);
    if (finite(w.transactCalledAt, w.transactReturnedAt, w.ackPublishedAt)) {
      g.before.push(w.transactCalledAt - w.startedAt);
      g.after.push(w.ackPublishedAt - w.transactReturnedAt);
    }
    for (const r of byId.get(w.traceId) ?? [])
      if (r.process === "gw-w") {
        const spans = r.spans ?? [];
        const peer = spans.filter((s) => s.layer === "peer-wait");
        if (peer.length) g.peer.push(peer.reduce((n, s) => n + s.end - s.start, 0));
        const own = spans.filter((s) => s.layer === "gateway");
        if (own.length) g.gateway.push(own.reduce((n, s) => n + s.end - s.start, 0));
      }
    groups.set(key, g);
    const p = phases.find((p) => p.start <= w.scheduledAt && p.end > w.scheduledAt),
      name = p?.name ?? "between",
      kind = ["L4", "L16", "tail"].includes(name)
        ? "burst"
        : ["grow3", "grow10"].includes(name)
          ? "growth"
          : "sparse";
    const c = counts[kind] ?? { commands: 0, over50: 0, totalSlowMs: 0, phases: {} };
    c.commands++;
    if (verdictMs(w) > 50) {
      c.over50++;
      c.totalSlowMs += verdictMs(w);
      c.phases[name] = (c.phases[name] ?? 0) + 1;
    }
    c.finishOver50 = (c.finishOver50 ?? 0) + Number(w.latencyMs > 50);
    counts[kind] = c;
  }
  return {
    rule: "Actual idle gap from every earlier non-expired completion; exact active-prefix overlap, not a 40-row heuristic. Service includes work after ACK. Layer marginal quantiles do not add.",
    groups: [...groups.values()].map((g) => ({
      ...g,
      ...Object.fromEntries(
        ["service", "ackService", "peer", "gateway", "before", "after"].map((k) => [
          k,
          summary(g[k]),
        ]),
      ),
    })),
    phaseTypes: counts,
  };
}
const n = (x) => (Number.isFinite(x) ? x.toFixed(3) : "unavailable");
export function instrumentMarkdown(m) {
  if (!m) return "";
  const rows = [];
  const defs = ["ackOnly", "observed", "corrected"];
  const add = (label, get, limit) =>
    rows.push(`| ${label} | ${defs.map((d) => n(get(m.definitions[d]))).join(" | ")} | ${limit} |`);
  add("All-primary p50 ms", (d) => d.allPrimary.p50Ms, "reported");
  add("All-primary p99 ms", (d) => d.allPrimary.p99Ms, "<=50");
  for (const band of ["5-10", "11-25", "26-50"])
    for (const p of ["p50Ms", "p99Ms"])
      add(
        `L256 ${band} ${p}`,
        (d) => d.bandsAtL256[band][p],
        band === "26-50" ? "p99<=100; p50 reported" : p === "p50Ms" ? "<=10" : "<=50",
      );
  for (const band of ["5-10", "11-25"])
    add(`Burst ${band} p50 ms`, (d) => d.bandsBurst[band].p50Ms, "<=10");
  for (const name of ["L256", "L1024"]) {
    add(
      `${name} writer p99 ratio`,
      (d) => d.phases[name]?.writerRatio,
      name === "L256" ? "<=1.25" : "<=2",
    );
    add(
      `${name} writer maximum ms`,
      (d) => d.phases[name]?.maxMs,
      name === "L256" ? "<=2000" : "reported",
    );
  }
  add("Recovery ms", (d) => d.recovery?.recoveredAfterMs, "<=60000; unavailable is not met");
  return `\n## Commit clock definitions\n\nVerdict: scheduled offer to the final receipt handed to the caller (ack/1, Sam 2026-11-16). Actual scheduler lateness counts. Legacy finish is reported, never judged. Corrected removes observed offer lateness, including GC/event-loop stalls, and cannot qualify a PASS. ${m.missing} of ${m.primary} primary commands lack a qualified ACK. Non-latency P2 values and read/feed clocks are unchanged. Commit-based bars need at least 500 primary commits, including both sides of a ratio.\n\nTimer lateness p50/p99: ${n(m.timerLateness.p50Ms)}/${n(m.timerLateness.p99Ms)} ms; post-ACK p50/p99: ${n(m.postAck.p50Ms)}/${n(m.postAck.p99Ms)} ms.\n\n| Measurement | verdict (ACK) | legacy finish | corrected diagnostic | bar |\n| --- | --- | --- | --- | --- |\n${rows.join("\n")}\n`;
}
export function idleMarkdown(m) {
  if (!m) return "";
  return `\n## Commit service by actual idle gap\n\n${m.rule}\n\n| fact band | gap ms | n | service p50/p99 ms | to-ACK service p50 ms | peer p50 ms | gateway scopes p50 ms | client before/after p50 ms |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n${m.groups.map((g) => `| ${g.band} | ${g.gap} | ${g.service.count} | ${n(g.service.p50Ms)}/${n(g.service.p99Ms)} | ${n(g.ackService.p50Ms)} | ${n(g.peer.p50Ms)} | ${n(g.gateway.p50Ms)} | ${n(g.before.p50Ms)}/${n(g.after.p50Ms)} |`).join("\n")}\n\n| phase type | primary commands | >50 ms | slow wall ms |\n| --- | --- | --- | --- |\n${Object.entries(
    m.phaseTypes,
  )
    .map(([k, c]) => `| ${k} | ${c.commands} | ${c.over50} | ${n(c.totalSlowMs)} |`)
    .join("\n")}\n`;
}
