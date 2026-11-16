// @ts-nocheck -- [DX-T1-11] Why: validate engine-owned replay records at the evidence boundary. Rejected: infer equivalence from exit zero.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { pathToFileURL } from "node:url";
import { verifiedRawManifest } from "./pack-oracle.mjs";

export const sha256 = (text) => createHash("sha256").update(text).digest("hex");
const requireThat = (ok, reason) => {
  if (!ok) throw Error(reason);
};
const lines = (text) => text.trim().split("\n").filter(Boolean).map(JSON.parse);
export const factBand = (n) =>
  n >= 5 && n <= 10 ? "small" : n >= 11 && n <= 25 ? "medium" : n >= 26 && n <= 50 ? "large" : null;
export function qualifyReplay(bundle, manifest, now = Date.now()) {
  const { payloads, capturesText, selectionText, recordsText, complete } = bundle;
  const captures = lines(capturesText),
    rows = lines(recordsText),
    selection = JSON.parse(selectionText);
  requireThat(
    complete.schema === "triplex.layout-replay-complete.v1" &&
      [complete, selection].every(
        (r) => r.run === manifest.tag && r.slot === manifest.slot && r.source === manifest.source,
      ),
    "Replay attempt binding differs",
  );
  requireThat(
    [manifest.startedAt, selection.createdAt, complete.startedAt, complete.endedAt].every(
      Number.isFinite,
    ) &&
      manifest.startedAt <= selection.createdAt &&
      selection.createdAt <= complete.startedAt &&
      complete.startedAt <= complete.endedAt &&
      complete.endedAt <= now + 1000,
    "Replay freshness differs",
  );
  requireThat(
    complete.payloadSha256 === sha256(payloads) &&
      complete.capturesSha256 === sha256(capturesText) &&
      complete.selectionSha256 === sha256(selectionText) &&
      complete.recordsSha256 === sha256(recordsText),
    "Replay bytes differ",
  );
  requireThat(
    complete.records === 3000 &&
      rows.length === 3000 &&
      captures.length === 300 &&
      Number.isSafeInteger(complete.basisBefore) &&
      complete.basisBefore === complete.basisAfter,
    "Replay count or engine basis differs",
  );
  const commands = new Map(selection.commands.map((r) => [r.operationId, r]));
  requireThat(commands.size === selection.commands.length, "Duplicate primary selection");
  const expected = new Map();
  for (const c of captures) {
    const w = commands.get(c.operationId);
    requireThat(
      w &&
        c.schema === "triplex.layout-capture.v1" &&
        c.run === manifest.tag &&
        c.source === manifest.source &&
        c.slot === manifest.slot &&
        !expected.has(c.operationId) &&
        w.facts === c.facts &&
        c.band === factBand(c.facts) &&
        Number.isSafeInteger(c.basisT) &&
        Number.isSafeInteger(c.datomicT) &&
        c.basisT < c.datomicT &&
        c.datomicT <= complete.basisBefore &&
        Number.isFinite(c.capturedAt) &&
        manifest.startedAt <= c.capturedAt &&
        c.capturedAt <= selection.createdAt &&
        typeof c.dataEdn === "string" &&
        c.dataEdn.length > 10,
      "Replay capture identity, basis or input differs",
    );
    expected.set(c.operationId, { ...c, hash: sha256(c.dataEdn) });
  }
  for (const band of ["small", "medium", "large"])
    requireThat(
      complete.counts[band] === 100 && captures.filter((c) => c.band === band).length === 100,
      "Replay band denominator differs",
    );
  const seen = new Set();
  for (const r of rows) {
    const c = expected.get(r.operationId),
      key = `${r.operationId}/${r.shape}/${r.round}`;
    requireThat(
      c &&
        !seen.has(key) &&
        ["A", "B", "C", "D", "E"].includes(r.shape) &&
        [0, 1].includes(r.round) &&
        r.schema === "triplex.layout-replay.v1" &&
        r.run === manifest.tag &&
        r.slot === manifest.slot &&
        r.source === manifest.source &&
        r.startedAt === complete.startedAt &&
        r.facts === c.facts &&
        r.band === c.band &&
        r.basisT === c.basisT &&
        r.datomicT === c.datomicT &&
        r.capturedAt === c.capturedAt &&
        r.payloadSha256 === c.hash,
      "Replay row source/input binding differs",
    );
    requireThat(
      [r.wallMs, r.txStats?.["tx-fn-ms"]].every((x) => Number.isFinite(x) && x >= 0) &&
        [r.datoms, r.fressianBytes, r.valueUtf8Bytes].every(
          (x) => Number.isSafeInteger(x) && x > 0,
        ) &&
        r.ioStats?.api === "with" &&
        typeof r.ioStats.reads === "object" &&
        Object.values(r.ioStats.reads).every((x) => Number.isFinite(x) && x >= 0),
      "Invalid replay counters",
    );
    requireThat(
      r.shape === "D"
        ? r.logicalDeltaEqual === false &&
            Number.isSafeInteger(r.omittedLogicalRows) &&
            r.omittedLogicalRows > 0
        : r.logicalDeltaEqual === true && r.omittedLogicalRows === 0,
      "Replay logical row result differs",
    );
    seen.add(key);
  }
  requireThat(seen.size === expected.size * 10, "Incomplete replay Cartesian product");
  return { captures, rows, complete, selection };
}

export function readRaw(dir, name) {
  const file = path.join(dir, "trace/raw", name);
  return fs.existsSync(file)
    ? fs.readFileSync(file, "utf8")
    : gunzipSync(fs.readFileSync(file + ".gz")).toString("utf8");
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [mode, dir] = process.argv.slice(2),
    manifest = JSON.parse(fs.readFileSync(path.join(dir, "trace-run.json"), "utf8"));
  const writesText = fs.readFileSync(path.join(dir, "driver/ns-writes.jsonl"), "utf8");
  const bench = JSON.parse(fs.readFileSync(path.join(dir, "driver/ns-report.json"), "utf8"));
  requireThat(
    bench.status === "DONE" && !bench.finalizationErrors?.length,
    "Replay requires a completed bound benchmark",
  );
  const commands = lines(writesText)
    .filter((w) => w.stream === "background" && !w.resend)
    .map((w) => {
      requireThat(
        w.outcome === "committed" &&
          !w.expired &&
          typeof w.publicationOperationId === "string" &&
          /^[a-f0-9]{32}$/.test(w.traceId),
        "Uncommitted/unbound primary command",
      );
      return {
        operationId: w.publicationOperationId,
        facts: w.facts,
        traceId: w.traceId,
        position: w.position,
      };
    });
  if (mode === "prepare") {
    const selection = {
      schema: "triplex.layout-selection.v1",
      run: manifest.tag,
      source: manifest.source,
      slot: manifest.slot,
      createdAt: Date.now(),
      writesSha256: sha256(writesText),
      commands,
    };
    fs.writeFileSync(
      path.join(dir, "trace/raw/layout-selection.json"),
      JSON.stringify(selection) + "\n",
      { flag: "wx" },
    );
  } else if (mode === "qualify") {
    const seal = await verifiedRawManifest(dir);
    const q = qualifyReplay(
      {
        payloads: readRaw(dir, "layout-payloads.edn"),
        capturesText: readRaw(dir, "layout-captures.jsonl"),
        selectionText: readRaw(dir, "layout-selection.json"),
        recordsText: readRaw(dir, "layout-replay.jsonl"),
        complete: JSON.parse(readRaw(dir, "layout-replay-complete.json")),
      },
      manifest,
    );
    requireThat(
      q.selection.writesSha256 === sha256(writesText) &&
        JSON.stringify(q.selection.commands) === JSON.stringify(commands),
      "Primary selection bytes differ",
    );
    fs.writeFileSync(
      path.join(dir, "layout-replay-qualified.json"),
      JSON.stringify(
        {
          kind: "pure peer pricing; logical row delta only; no layout/oracle acceptance",
          run: manifest.tag,
          source: manifest.source,
          captures: q.captures.length,
          records: q.rows.length,
          rawManifestSha256: sha256(seal),
          complete: q.complete,
        },
        null,
        2,
      ) + "\n",
    );
  } else throw Error("Usage: layout-replay.mjs prepare|qualify RUN_DIR");
}
