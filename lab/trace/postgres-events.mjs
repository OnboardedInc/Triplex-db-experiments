// @ts-nocheck -- External log and recorder field shapes are checked at the trace boundary.
import fs from "node:fs";
import { createInterface } from "node:readline";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
const durationLine =
  /(?:^| )dxpg\|(\d{4}-\d\d-\d\d \d\d:\d\d:\d\d\.\d{3} UTC)\|(\d+)\|([a-z\d.]+)\|(\d+)\|(triplex-(?:tx|gw-[wr]))\|LOG:\s+duration: (\d+(?:\.\d+)?) ms$/;

export function parsePostgresDuration(line) {
  const result = durationLine.exec(line);
  if (!result) return null;
  const [, wall, pid, session, seq, application, duration] = result;
  const wallEnd = Date.parse(wall),
    durationMs = Number(duration);
  if (!Number.isFinite(wallEnd) || !Number.isFinite(durationMs)) return null;
  return { backend: Number(pid), session, seq: Number(seq), application, durationMs, wallEnd };
}

// [DX-TAIL1] Why: PostgreSQL uses the guest wall clock and exposes no monotonic timestamp on a duration.
// Rejected: aligning it across clock steps or joining SQL to a save merely because their times overlap.
export function wallBridge(seal) {
  const anchors = seal?.clockAnchors;
  const clock = seal?.clock;
  if (
    clock?.domain !== "linux-monotonic" ||
    !/^[0-9a-f-]{36}$/.test(clock.bootId) ||
    !Number.isFinite(clock.offsetMs) ||
    !Array.isArray(anchors) ||
    anchors.length < 2 ||
    !anchors.every(
      (point) =>
        Array.isArray(point) &&
        point.length === 3 &&
        point.every(Number.isFinite) &&
        point[2] >= 0 &&
        point[2] <= 0.1,
    )
  )
    return () => null;
  const eras = [0];
  for (let i = 1; i < anchors.length; i++) {
    const [aw, am] = anchors[i - 1],
      [bw, bm] = anchors[i];
    if (bw <= aw || bm <= am) return () => null;
    eras.push(eras[i - 1] + Number(bw - aw > 4000 || Math.abs(bw - aw - (bm - am)) > 2));
  }
  return (wall) => {
    if (!Number.isFinite(wall)) return null;
    let left = 0,
      right = anchors.length - 1;
    if (wall < anchors[left][0] || wall > anchors[right][0]) return null;
    while (right - left > 1) {
      const mid = (left + right) >>> 1;
      if (wall < anchors[mid][0]) right = mid;
      else left = mid;
    }
    const [aw, am, aj] = anchors[left],
      [bw, bm, bj] = anchors[right];
    const drift = Math.abs(bw - aw - (bm - am));
    if (eras[right] !== eras[left]) return null;
    return {
      at: clock.offsetMs + am + ((wall - aw) * (bm - am)) / (bw - aw),
      era: eras[left],
      clock: { ...clock, uncertaintyMs: 1 + drift + Math.max(aj, bj), crossProcessQualified: true },
    };
  };
}

export async function postgresEvents(input, output, seal, identity) {
  const bridge = wallBridge(seal);
  const counts = { qualified: 0, unknown: 0 };
  const lines = createInterface({ input: fs.createReadStream(input), crlfDelay: Infinity });
  async function* normalized() {
    for await (const line of lines) {
      const observed = parsePostgresDuration(line);
      if (!observed) continue;
      const finish = bridge(observed.wallEnd);
      const start = bridge(observed.wallEnd - observed.durationMs);
      if (finish && start && finish.era === start.era && finish.at >= start.at) {
        counts.qualified++;
        yield (
          JSON.stringify({
            ...identity,
            ...observed,
            process: "postgres",
            thread: observed.backend,
            type: "event",
            name: "postgres.statement-duration",
            layer: "postgres",
            start: start.at,
            end: finish.at,
            clock: finish.clock,
            startInferred: true,
          }) + "\n"
        );
      } else {
        counts.unknown++;
        yield (
          JSON.stringify({
            ...identity,
            ...observed,
            process: "postgres",
            type: "postgres-wall-only",
          }) + "\n"
        );
      }
    }
  }
  await pipeline(Readable.from(normalized()), fs.createWriteStream(output, { flags: "wx" }));
  return counts;
}
