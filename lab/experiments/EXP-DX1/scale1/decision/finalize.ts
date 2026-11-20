import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileHash } from "../measurements.ts";
import { summaryFiles } from "../source.ts";
import { checkCell, ratios, type Observation } from "./check.ts";
import {
  activeSubjects,
  cellKey,
  cellOrder,
  cellSeconds,
  factsFor,
  field,
  layoutOf,
  repetitions,
  rates,
  sha,
  task,
} from "./plan.ts";
import { fieldValue } from "../../../../bench/lib/deep-world.ts";
import { fieldPolicy } from "../../w1/field/bench-check.ts";
import { verifyWriteOptions, type WriterReadback } from "../../w1/write-options.ts";
import { read, write } from "./seed.ts";
import type { Row } from "./writes.ts";
import type { Request } from "./server.ts";

const exists = fs.existsSync;
const names = [
  "admission.json",
  "attempt.json",
  "request.json",
  "field-options.json",
  "image.json",
  "seed.json",
  "error.json",
  "STATUS.json",
  "placements.json",
  "preflight.json",
  "durability.json",
  "cleanup.json",
  "measurement.json",
  "upstream.json",
  "restored.json",
  "unit.json",
  "writer-expectation.json",
  "writer-readbacks.json",
];

export function checkRecorded(dir: string, a: Request & { slot: string; at: number }) {
  const pin = read(
    path.join(import.meta.dirname, a.layout === "single" ? "single-pins.json" : "pins.json"),
  ).items.find((x: any) => x.seed.people === a.people)!;
  const bound = (d: any) =>
    assert(
      d.source === a.source &&
        d.nonce === a.nonce &&
        d.slot === a.slot &&
        d.population === pin.seed.digest,
    );
  const preflight = read(path.join(dir, "preflight.json"));
  bound(preflight);
  assert(
    preflight.at >= a.at &&
      preflight.saves === 6 &&
      preflight.claims === 6 &&
      preflight.fieldCuts === 12 &&
      /^[a-f0-9]{64}$/.test(preflight.feedHash) &&
      preflight.pinnedAccounts === 2 &&
      preflight.scope === "dx-scale-decision-probe-" + a.nonce,
  );
  assert.deepEqual(read(path.join(dir, "field-options.json")), fieldPolicy(a.mode, true));
  assert.deepEqual(read(path.join(dir, "durability.json")), { settings: "on|on|on" });
  const expectation = read(path.join(dir, "writer-expectation.json"));
  assert.deepEqual(
    [expectation.source, expectation.slot, expectation.attempt],
    [a.source, a.slot, a.nonce],
  );
  const verifyOptions = (r: WriterReadback, db: string, cut: number) => {
    assert.deepEqual(r.expected, expectation);
    verifyWriteOptions(r.observed, db, expectation, r.historyRange);
    assert.equal(r.observed.position, cut);
  };
  verifyOptions(preflight.options, preflight.db, 1);
  if (a.phase === "seed") {
    const seed = read(path.join(dir, "seed.json")),
      image = read(path.join(dir, "image.json"));
    bound(seed);
    bound(image);
    assert.deepEqual(seed, {
      ...seed,
      ...Object.fromEntries(Object.entries(image).filter(([k]) => k !== "bytes" && k !== "sha256")),
    });
    assert(
      seed.started >= a.at &&
        seed.completed >= seed.started &&
        seed.facts === layoutOf(a.layout).flat().length * factsFor(a.people),
    );
    assert.deepEqual(
      seed.scopes.map((s: any) => s.accounts),
      layoutOf(a.layout),
    );
    for (const [i, s] of seed.scopes.entries()) {
      const p = seed.proofs[i];
      assert(
        p.facts === s.accounts.length * factsFor(a.people) &&
          p.cut === s.seedCut &&
          p.observed + 1 === s.cut,
      );
      assert(p.cursor === s.accounts.length * a.people && p.scope === i);
    }
    assert(
      /^[a-f0-9]{64}$/.test(image.sha256) &&
        fs.statSync(path.join(dir, "seed.pgdump")).size === image.bytes,
    );
    return;
  }
  const raw = read(path.join(dir, "initial.json")),
    restored = read(path.join(dir, "restored.json"));
  bound(raw);
  bound(restored.identity);
  assert(restored.reopenedAt >= a.at && restored.origin.nonce !== a.nonce);
  assert.deepEqual(raw.scopes, restored.origin.scopes);
  const readbacks = read(path.join(dir, "writer-readbacks.json"));
  bound(readbacks);
  assert(readbacks.at >= restored.reopenedAt && readbacks.entries.length === raw.scopes.length);
  for (const [i, s] of raw.scopes.entries()) verifyOptions(readbacks.entries[i], s.db, s.seedCut);
  const base = activeSubjects(a.people);
  const m = read(path.join(dir, "measurement.json"));
  bound(m);
  assert(m.mode === a.mode && m.from === a.from && m.withReaders === (a.withReaders ?? true));
  assert(m.elapsedMs >= (a.layout === "single" ? 630000 : 900000));
  assert(raw.accounts.length === layoutOf(a.layout).flat().length);
  const model = raw.accounts.map((r: [string, Row[]][], i: number) => {
    const rows = new Map(r);
    assert.equal(rows.size, base[i]!.length);
    for (const p of base[i]!) {
      const e = task(i, p),
        fields = rows.get(e)!;
      assert(fields.length === 3);
      for (const [ordinal, row] of fields.entries()) {
        const expected = fieldValue(p, 0, ordinal, 0);
        assert(
          row.entity_id === e &&
            row.attribute === field(ordinal) &&
            row.value_string === expected.value,
        );
        assert(
          row.id &&
            row.recorded_position <= raw.scopes.find((s: any) => s.accounts.includes(i)).seedCut,
        );
      }
    }
    return rows;
  });
  const checks: ReturnType<typeof checkCell>[] = [];
  let scopes = raw.scopes;
  let previousEnd = a.at;
  for (const r of repetitions(a.layout))
    for (const c of cellOrder(r, a.layout)) {
      const label = cellKey(c, r),
        full = read<Observation>(path.join(dir, label + "-raw.json"));
      const written = read(path.join(dir, label + "-writer.json"));
      const result = read(path.join(dir, label + "-result.json"));
      bound(full);
      bound(written);
      bound(result);
      assert(
        full.cell === c &&
          full.repeat === r &&
          full.withReaders === m.withReaders &&
          full.start >= previousEnd &&
          full.start >= readbacks.at,
      );
      assert(written.key === label && written.start === full.start);
      assert.deepEqual(full.scopes, scopes);
      assert.deepEqual(full.scopes, written.scopes);
      // Recovery annotates one original issued command. It may not rewrite the measured clock.
      assert.deepEqual(
        full.writes.map((w) => [w.id, w.due, w.enqueued, w.dispatched, w.sent, w.end]),
        written.writes.map((w: any) => [w.id, w.due, w.enqueued, w.dispatched, w.sent, w.end]),
      );
      const stats = checkCell(full, model);
      const pinRows = read(path.join(dir, label + "-cuts.json"));
      bound(pinRows);
      assert(pinRows.at >= full.start + cellSeconds(c) * 1000 && pinRows.key === label);
      assert.deepEqual(
        pinRows.pins,
        stats.cuts.map((c) => ({ ...c, values: [c.before, c.after] })),
      );
      const { distributions: _ignore, ...expected } = stats;
      const actual = Object.fromEntries(Object.keys(expected).map((k) => [k, result[k]]));
      assert.equal(result.rawSemanticHash, sha(full));
      assert.deepEqual(actual, expected);
      assert.deepEqual(expected, m.cells[checks.length]);
      checks.push(stats);
      scopes = scopes.map((s: any) => ({
        ...s,
        cut: Math.max(s.cut, ...full.feed.filter((x) => x.db === s.db).map((x) => x.position)),
      }));
      previousEnd = full.start + cellSeconds(c) * 1000;
    }
  assert.deepEqual(
    m.comparisons,
    (a.layout === "single" ? [] : rates).map((rate) => ({
      rate,
      ratios: ratios(
        checks.filter((r) => r.cell === "alone"),
        checks.filter((r) => r.cell === rate),
      ),
      completeCapacity: checks.filter((r) => r.cell === rate).every((r) => r.capacityBars),
    })),
  );
}

export async function packageAttempt(dir: string) {
  const a = read(path.join(dir, "attempt.json")),
    unit = read(path.join(dir, "unit.json"));
  assert(
    a.tag === path.basename(dir) &&
      a.slot === "tx2-dxscale1-" + a.tag &&
      a.nonce === unit.nonce &&
      a.slot === unit.slot,
  );
  const cleanup = read(path.join(dir, "cleanup.json"));
  assert.deepEqual(cleanup, { containers: [], volumes: [], networks: [] });
  const files = [
    ...names.filter((n) => exists(path.join(dir, n))),
    ...fs
      .readdirSync(dir)
      .filter((f) =>
        /^r[01]-(?:alone|35|50|235|394|3p5|4p9|23p5|39p4)-(?:result|resources|cuts)\.json$/.test(f),
      ),
  ];
  let checkError: string | undefined;
  if (unit.result === "success") {
    try {
      checkRecorded(dir, a);
    } catch (e) {
      checkError = String(e);
    }
  }
  const terminal = {
    source: a.source,
    nonce: a.nonce,
    tag: a.tag,
    slot: a.slot,
    writerRelease: "WFIX1",
    cleanup: true,
    endedAt: unit.endedAt,
    scopeReports: unit.result === "success" && !checkError ? a.spec.scopes : 0,
    service: unit.result !== "success" ? unit.result : checkError ? "checker-failed" : "success",
    ...(checkError ? { checkError } : {}),
    timedFiles: fs.readdirSync(dir).filter((f) => f.endsWith("-writer.json")).length,
  };
  // [DX-SCALE1] Why: archive the exact first attempt even after a checker fails. Rejected: scheduling another measured arm to recover from an export or verification exception.
  const resultDir = path.join(dir, "transfer");
  assert(!exists(path.join(dir, "transfer.json")), "Already packaged");
  fs.mkdirSync(resultDir, { recursive: true });
  for (const f of files) fs.copyFileSync(path.join(dir, f), path.join(resultDir, f));
  const progress = path.join(dir, "seed-progress.jsonl");
  if (exists(progress)) {
    // [DX-SCALE1] Why: the compact transfer verifies JSON members, while the loader appends durable progress records. Rejected: making a sealed seed unusable because its diagnostic stream has a different format.
    const records = [],
      rejectedLines = [];
    for (const [index, line] of fs.readFileSync(progress, "utf8").trimEnd().split("\n").entries()) {
      try {
        const r = JSON.parse(line);
        assert(r.source === a.source && r.slot === a.slot && r.nonce === a.nonce && r.at >= a.at);
        records.push(r);
      } catch {
        rejectedLines.push(index + 1);
      }
    }
    fs.writeFileSync(
      path.join(resultDir, "seed-progress.json"),
      JSON.stringify({ records, rejectedLines, rawSha256: await fileHash(progress) }) + "\n",
    );
  }
  fs.writeFileSync(path.join(resultDir, "terminal.json"), JSON.stringify(terminal) + "\n");
  const archive = path.join(dir, "summaries.tar.zst");
  execFileSync("tar", ["-I", "zstd -3", "-cf", archive + ".partial", "-C", resultDir, "."], {
    timeout: 180000,
  });
  execFileSync("zstd", ["-tq", archive + ".partial"], { timeout: 180000 });
  fs.renameSync(archive + ".partial", archive);
  const rawNames = fs
    .readdirSync(dir)
    .filter(
      (name) =>
        name.endsWith("-raw.json") ||
        name.endsWith("-writer.json") ||
        name.endsWith("-observers.json") ||
        ["initial.json", "observers.log", "seed-progress.jsonl"].includes(name),
    );
  const rawIndex = await Promise.all(
    rawNames.map(async (name) => ({
      name,
      bytes: fs.statSync(path.join(dir, name)).size,
      sha256: await fileHash(path.join(dir, name)),
    })),
  );
  const index = path.join(dir, "raw-index.json");
  if (exists(index)) assert.deepEqual(read(index), rawIndex);
  else write(index, rawIndex);
  let actualArchive: { name: string; bytes: number; sha256: string } | null = null;
  if (rawNames.length > 0) {
    const packed = path.join(dir, "raw.tar.zst");
    if (!exists(packed)) {
      execFileSync(
        "tar",
        ["-I", "zstd -1 -T2", "-cf", packed + ".partial", "-C", dir, ...rawNames],
        { timeout: 120000 },
      );
      execFileSync("zstd", ["-tq", packed + ".partial"], { timeout: 120000 });
      fs.renameSync(packed + ".partial", packed);
    }
    actualArchive = {
      name: "raw.tar.zst",
      bytes: fs.statSync(packed).size,
      sha256: await fileHash(packed),
    };
  }
  write(path.join(dir, "transfer.json"), {
    tag: a.tag,
    source: a.source,
    nonce: a.nonce,
    result: terminal.service,
    summary: {
      name: "summaries.tar.zst",
      bytes: fs.statSync(archive).size,
      sha256: await fileHash(archive),
    },
    summaryFiles: summaryFiles(resultDir),
    raw: actualArchive,
    serverRawIndex: await fileHash(index),
  });
  return terminal;
}

if (process.argv[1] === import.meta.filename) {
  const dir = process.argv[2]!;
  assert(path.dirname(dir) === "/var/tmp/triplex-scale1/decision/attempts");
  console.log(JSON.stringify(await packageAttempt(dir)));
}
