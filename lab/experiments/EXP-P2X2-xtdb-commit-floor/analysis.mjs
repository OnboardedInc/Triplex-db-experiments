// [EXP-P2X2] Why: missing observations must not become zero latency or native margin.
// Rejected: defaulting missing values to zero (would incorrectly select D2).
export function summary(values) {
  if (!values.length || values.some((v) => !Number.isFinite(v) || v < 0))
    throw new Error("invalid samples");
  const a = [...values].sort((x, y) => x - y),
    q = (p) => a[Math.ceil(p * a.length) - 1];
  return {
    n: a.length,
    p50: q(0.5),
    p90: q(0.9),
    p99: q(0.99),
    max: a.at(-1),
    mean: a.reduce((a, b) => a + b, 0) / a.length,
  };
}
export function decision({ f3, f5, resolve }) {
  const valid = (x) => typeof x === "number" && Number.isFinite(x) && x >= 0;
  if ((valid(f3) && f3 > 6) || (valid(f5) && f5 > 20) || (valid(resolve) && resolve > 7))
    return "D1";
  return [f3, f5, resolve].every(valid) ? "D2" : "NOT RUN";
}
export function metricRows(raw) {
  return raw.split("\n").flatMap((line) => {
    const m = /^([^ #]+)\s+([-+\d.eE]+)$/.exec(line);
    return m ? [{ key: m[1], name: m[1].split("{")[0], value: Number(m[2]) }] : [];
  });
}
export function metricDiff(before, after, name, suffix) {
  const b = metricRows(before).filter((r) => r.name === name + suffix),
    a = metricRows(after).filter((r) => r.name === name + suffix);
  if (!a.length || a.length !== b.length || a.some((r) => !b.some((s) => s.key === r.key)))
    return null;
  const diff = a.reduce((sum, r) => sum + r.value - b.find((s) => s.key === r.key).value, 0);
  return diff >= 0 ? diff : null;
}
export function engineMeans(before, after, commits) {
  const means = {};
  for (const name of [
    "node_tx_execute_seconds",
    "node_tx_await_seconds",
    "node_tx_submit_seconds",
    "tx_op_timer_seconds",
  ]) {
    const sum = metricDiff(before, after, name, "_sum"),
      count = metricDiff(before, after, name, "_count");
    means[name] = {
      sumSeconds: sum,
      count,
      meanMs: sum !== null && count > 0 ? (1000 * sum) / count : null,
      perCommitMs: sum !== null && count > 0 && commits > 0 ? (1000 * sum) / commits : null,
    };
  }
  const e = means.node_tx_execute_seconds,
    a = means.node_tx_await_seconds;
  means.sourceAppendMs =
    e.meanMs !== null && a.meanMs !== null && e.count === a.count ? e.meanMs - a.meanMs : null;
  means.awaitShare = e.sumSeconds > 0 && a.sumSeconds !== null ? a.sumSeconds / e.sumSeconds : null;
  return means;
}

// [EXP-P2X2] Why: error reporting must not capture variables local to the failed read. Rejected: constructing sample data in the catch path.
export function failedRead(attemptIndex, event, retry, error) {
  return {
    attemptIndex,
    seq: event.seq,
    resend: event.resend,
    retry,
    contentMatches: false,
    error: {
      tag: error?._tag ?? error?.name ?? "unknown",
      message: String(error?.message ?? error),
    },
  };
}

// [EXP-P2X2] Why: absent fields and stale observations must not qualify by undefined equality.
// Rejected: comparing two unchecked objects (empty objects could otherwise match).
export function bindingMatches(a, b, window) {
  const hex = (v, n) => typeof v === "string" && new RegExp(`^[a-f0-9]{${n}}$`).test(v);
  const start = Date.parse(window?.startedAt),
    end = Date.parse(window?.endedAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return false;
  const valid = (x) =>
    x &&
    hex(x.container, 64) &&
    hex(x.head, 40) &&
    typeof x.image === "string" &&
    /^sha256:[a-f0-9]{64}$/.test(x.image) &&
    hex(x.configSha256, 64) &&
    Number.isFinite(Date.parse(x.startedAt)) &&
    Date.parse(x.startedAt) <= Date.parse(x.at) &&
    x.owner?.holder === "CX-P2X2" &&
    Number.isFinite(Date.parse(x.owner.createdAt)) &&
    x.caps?.memory === 3758096384 &&
    x.caps?.cpus === 2000000000 &&
    x.caps?.cpuset === "4,5" &&
    x.files &&
    Object.keys(x.files).length > 0 &&
    Object.values(x.files).every((v) => hex(v, 64)) &&
    Date.parse(x.at) >= start &&
    Date.parse(x.at) <= end;
  return Boolean(
    valid(a) &&
    valid(b) &&
    Date.parse(b.at) >= Date.parse(a.at) &&
    ["container", "head", "image", "configSha256", "startedAt"].every((k) => a[k] === b[k]) &&
    JSON.stringify(a.caps) === JSON.stringify(b.caps) &&
    JSON.stringify(a.owner) === JSON.stringify(b.owner) &&
    JSON.stringify(a.files) === JSON.stringify(b.files),
  );
}
