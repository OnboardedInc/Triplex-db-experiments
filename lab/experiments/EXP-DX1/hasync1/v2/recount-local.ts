import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { recountTraffic, unavailableOffers } from "../offers.ts";

const [directory] = process.argv.slice(2);
assert(directory && path.isAbsolute(directory));
const parse = (dir: string, file: string) =>
  JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
const mode =
  /^hasync-(?:ack|index|move|commit|import|cut-wal|cut-reply|restart|seed-edited|fleet-shared|fleet-dedicated)-([0-9a-f-]{36})$/;
type Replay = { bytes: number; ms: number };
const rows = [];
for (const name of fs.readdirSync(directory).sort()) {
  const match = mode.exec(name);
  if (!match) continue;
  const dir = path.join(directory, name);
  const files = fs.readdirSync(dir);
  if (!files.includes("cleanup.json")) continue;
  const attempt = parse(dir, "attempt.json");
  assert.equal(attempt.nonce, match[1]);
  assert.equal(name, attempt.mode + "-" + attempt.nonce);
  assert.deepEqual(parse(dir, "cleanup.json"), {
    nonce: attempt.nonce,
    containers: 0,
    networks: 0,
  });
  const observation = files.includes("observations.json")
    ? parse(dir, "observations.json")
    : undefined;
  if (observation)
    assert.deepEqual(
      [observation.nonce, observation.source, observation.slot],
      [attempt.nonce, attempt.source, attempt.slot],
    );
  const events = files.includes("events.jsonl")
    ? fs
        .readFileSync(path.join(dir, "events.jsonl"), "utf8")
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line))
    : [];
  assert(events.every((v) => v.nonce === attempt.nonce));
  const cp = events.find((v) => v.type === "checkpoint-source")?.data;
  const facts = (observation?.result?.population?.facts ?? observation?.result?.facts) as
    | number
    | undefined;
  const basis = (kind: string) => events.find((v) => v.type === kind)?.ms as number | undefined;
  const stage = (before: string, after: string) => {
    const a = basis(before),
      b = basis(after);
    return a === undefined || b === undefined ? null : b - a;
  };
  for (const file of files.filter((f) => /^traffic-(?:field|cell-\d+)-timing\.json$/.test(f))) {
    const timing = parse(dir, file);
    const label = file.slice("traffic-".length, -"-timing.json".length);
    assert.equal(timing.raw, "traffic-" + label + ".jsonl");
    const scopeKey = label.startsWith("cell-")
      ? (10 + Number(label.slice(5))).toString(36)
      : "tx2-ha1-" + (cp?.nonce ?? attempt.nonce).slice(0, 8) + "-sync";
    const database =
      "s2-" +
      Buffer.from(JSON.stringify(["triplex-scope-v1", "ha1", scopeKey, "test", 0])).toString(
        "base64url",
      );
    const body = fs.readFileSync(path.join(dir, timing.raw), "utf8");
    const summary = recountTraffic(body, timing, {
      nonce: attempt.nonce,
      slot: attempt.slot,
      source: attempt.source,
      database,
    });
    const outcomes = body
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line))
      .filter((line) => line.stage === "outcome")
      .map((line) => line.data);
    const unavailable = unavailableOffers(
      outcomes,
      summary.marks.fault,
      summary.first?.due ?? summary.stopAt,
    );
    const native = observation?.result?.nativeReplay as Replay[] | undefined;
    const settled = files.includes("traffic-" + label + "-settlement.json")
      ? (parse(dir, "traffic-" + label + "-settlement.json").settlements as {
          disposition: string;
        }[])
      : undefined;
    rows.push({
      name,
      mode: attempt.mode as string,
      source: attempt.source.git as string,
      label,
      facts: facts ?? null,
      people: observation?.profile.people ?? cp?.people ?? null,
      complete: Boolean(observation),
      firstMs: summary.faultToNewWriteMs,
      readGapMs: summary.maxReadGapMs,
      unavailable,
      settled: settled?.length ?? null,
      retried: settled?.filter((s) => s.disposition === "retried").length ?? null,
      replayBytes: native?.reduce((n, r) => n + r.bytes, 0) ?? null,
      replayMs: native?.reduce((n, r) => n + r.ms, 0) ?? null,
      brokerMs: stage("promoted", "broker-ready"),
      peerMs: stage("broker-ready", "peer-ready"),
      rewindMs: events.find((v) => v.type === "rejoined")?.data.ms ?? null,
      coldReadMs: summary.firstDeepServiceMs ?? null,
    });
  }
}

// [DX-HASYNC1] Why: report a slope only from distinct completed scale cells. Rejected: extrapolating from one size, a failed run, or a startup retry.
function fit(metric: "firstMs" | "readGapMs" | "rewindMs" | "brokerMs" | "peerMs") {
  return ["hasync-ack", "hasync-index", "hasync-move"].flatMap((mode) => {
    const points = rows.filter(
      (v) => v.mode === mode && v.complete && v.facts && v.facts >= 100000 && v[metric] !== null,
    );
    const rungs = new Set(points.map((v) => v.facts));
    if (rungs.size < 2) return [];
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    const x = points.map((p) => Math.log2(p.facts!)),
      y = points.map((p) => p[metric]! as number);
    const cx = mean(x),
      cy = mean(y);
    const slope =
      x.reduce((total, v, i) => total + (v - cx) * (y[i]! - cy), 0) /
      x.reduce((total, v) => total + (v - cx) ** 2, 0);
    return [{ mode, metric, cells: points.map((p) => p.name), millisecondsPerDoubling: slope }];
  });
}
process.stdout.write(
  JSON.stringify(
    {
      rows,
      fits: [
        ...fit("firstMs"),
        ...fit("readGapMs"),
        ...fit("rewindMs"),
        ...fit("brokerMs"),
        ...fit("peerMs"),
      ],
    },
    null,
    2,
  ) + "\n",
);
