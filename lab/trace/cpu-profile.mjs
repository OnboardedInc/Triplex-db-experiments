// @ts-nocheck -- V8 CPU profile JSON is validated against attempt metadata and clock brackets.
import fs from "node:fs";
import path from "node:path";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
// [DX-T1-4] Why: native sample points need exact actor, fresh bytes and two verified boot-clock brackets.
// Rejected: treating unsampled time as CPU work or fitting an offset to a slow request.
export function indexCpuProfile(profile, markers, reference) {
  if (
    markers.length !== 2 ||
    markers[0].stage !== "start" ||
    markers[1].stage !== "end" ||
    markers.some(
      (m) =>
        m.clock?.bootId !== reference.bootId ||
        m.clock.domain !== "linux-monotonic" ||
        !(m.afterMonoMs >= m.beforeMonoMs),
    )
  )
    throw Error("CPU profile clock binding absent/foreign");
  if (
    !Number.isFinite(profile.startTime) ||
    !Number.isFinite(profile.endTime) ||
    profile.endTime <= profile.startTime ||
    profile.samples?.length !== profile.timeDeltas?.length ||
    !profile.samples?.length
  )
    throw Error("Invalid CPU profile boundaries");
  const nodes = new Map(profile.nodes.map((n) => [n.id, n])),
    parents = new Map();
  if (nodes.size !== profile.nodes.length) throw Error("Duplicate CPU profile node");
  for (const n of nodes.values())
    for (const id of n.children ?? []) {
      if (!nodes.has(id) || parents.has(id)) throw Error("Invalid CPU profile ancestry");
      parents.set(id, n.id);
    }
  const stacks = new Map();
  const stack = (id) => {
    if (stacks.has(id)) return stacks.get(id);
    const frames = [],
      seen = new Set();
    while (id !== undefined) {
      if (seen.has(id) || !nodes.has(id)) throw Error("Invalid CPU profile sample node");
      seen.add(id);
      frames.push(nodes.get(id).callFrame?.functionName || "(anonymous)");
      id = parents.get(id);
    }
    stacks.set([...seen][0], frames);
    return frames;
  };
  let at = profile.startTime;
  const points = profile.samples.map((id, i) => {
    const delta = profile.timeDeltas[i];
    if (!Number.isFinite(delta)) throw Error("Invalid CPU profile delta");
    at += delta;
    return {
      monoMs: at / 1000,
      at: reference.offsetMs + at / 1000,
      stack: stack(id),
      gapMs: delta / 1000,
    };
  });
  if (
    points.some(
      (p) => p.monoMs < profile.startTime / 1000 || p.monoMs > (profile.endTime + 10000) / 1000,
    )
  )
    throw Error("CPU samples exceed profile boundary");
  // [DX-T1-4] Why: observed V8 output contains a signed 2-us backstep; keep its timestamp and expose it.
  // Rejected: clamping deltas (shifts later samples), or rejecting an otherwise clock-bound recording.
  const backsteps = points.filter((p) => p.gapMs < 0).length;
  points.sort((a, b) => a.at - b.at);
  for (const m of markers)
    if (
      !points.some(
        (p) =>
          p.monoMs >= m.beforeMonoMs &&
          p.monoMs <= m.afterMonoMs &&
          p.stack.includes("triplexCpuProfileClockMarker"),
      )
    )
      throw Error("V8 samples do not match both boot-clock markers");
  return {
    samples: points.length,
    backsteps,
    process: markers[0].process,
    thread: markers[0].thread,
    window(start, end) {
      let lo = 0,
        hi = points.length;
      while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (points[mid].at < start) lo = mid + 1;
        else hi = mid;
      }
      const selected = [];
      for (let i = lo; i < points.length && points[i].at <= end; i++) selected.push(points[i]);
      const counts = new Map();
      for (const p of selected) {
        const fn = p.stack.find((f) => !["(root)", "(idle)"].includes(f)) ?? "(idle)";
        counts.set(fn, (counts.get(fn) ?? 0) + 1);
      }
      return {
        samples: selected.length,
        top: [...counts].sort((a, b) => b[1] - a[1]).slice(0, 8),
        longGaps: selected.filter((p) => p.gapMs > 3).length,
        maxGapMs: selected.length ? Math.max(...selected.map((p) => p.gapMs)) : null,
        points: selected
          .filter((_, i) => i % Math.max(1, Math.ceil(selected.length / 120)) === 0)
          .map((p) => ({ at: p.at, stack: p.stack.slice(0, 10) })),
      };
    },
  };
}
export async function loadCpuProfile(
  runDir,
  manifest,
  clockRows,
  reference,
  writerProcess,
  endedAt,
) {
  if (!manifest?.requireNodeCpuProfile) return null;
  if (!reference) throw Error("CPU profile writer boot clock absent");
  const markers = clockRows
    .filter((r) => r.thread === 0)
    .sort((a, b) => a.beforeMonoMs - b.beforeMonoMs);
  if (
    markers.some(
      (r) => r.run !== manifest.tag || r.source !== manifest.source || r.slot !== manifest.slot,
    )
  )
    throw Error("Foreign CPU profile marker");
  if (
    markers.some(
      (m) =>
        m.process !== writerProcess ||
        m.thread !== 0 ||
        reference.offsetMs + m.beforeMonoMs < manifest.startedAt - 1000 ||
        !Number.isFinite(endedAt) ||
        reference.offsetMs + m.afterMonoMs > endedAt + 1000,
    )
  )
    throw Error("Stale or foreign writer CPU calibration");
  const pid = /^node-(\d+)$/.exec(markers[0]?.process ?? "")?.[1];
  if (!pid) throw Error("CPU profile PID missing");
  const raw = path.join(runDir, "trace/raw"),
    files = fs
      .readdirSync(raw)
      .filter((f) =>
        new RegExp("^CPU\\.\\d{8}\\.\\d{6}\\." + pid + "\\.0\\.\\d+\\.cpuprofile\\.gz$").test(f),
      );
  if (files.length !== 1) throw Error("Expected one fresh writer CPU profile");
  const bytes = fs.readFileSync(path.join(raw, files[0]));
  if (
    !fs
      .readFileSync(path.join(runDir, "trace/SHA256SUMS"), "utf8")
      .split("\n")
      .includes(createHash("sha256").update(bytes).digest("hex") + "  " + files[0])
  )
    throw Error("CPU profile hash mismatch");
  const decoded = gunzipSync(bytes, { maxOutputLength: 256 * 1024 ** 2 });
  return indexCpuProfile(JSON.parse(decoded.toString("utf8")), markers, reference);
}
