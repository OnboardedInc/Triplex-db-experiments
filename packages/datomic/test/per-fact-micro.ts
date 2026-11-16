import fs from "node:fs";
import path from "node:path";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import {
  decodeValueColumns,
  storedValueDomain,
  ValueDomains,
} from "@triplex-build/triplex/runtime";
import { decodeRowText, encodeRowText, encodeRowTextFast } from "../src/rowText.ts";
import { packValue, packValueOnce, createPackedRow } from "../src/rows.ts";
import { stringifyExact, stringifyNativeExact } from "../src/codec.ts";

// [DX-T1-12] Why: price the same saved successful payloads and seal every encoded byte before any live A/B.
// Rejected: claim an end-to-end gain from a synthetic row, or parse EDN with eval/a permissive evaluator.
const [directory, destination, goldenPath] = process.argv.slice(2);
const hostContext = () => {
  try {
    const swap = execFileSync("/usr/sbin/sysctl", ["vm.swapusage"], { encoding: "utf8" });
    const cpu = execFileSync("/bin/ps", ["-A", "-o", "pcpu=,comm="], { encoding: "utf8" });
    const rows = cpu
      .trim()
      .split("\n")
      .map((l) => /^\s*([\d.]+)\s+(.+)$/.exec(l))
      .filter(Boolean);
    return {
      at: Date.now(),
      swapGiB: Number(/used = ([\d.]+)M/.exec(swap)?.[1]) / 1024,
      macOtherCpu: rows
        .filter((m) => !/Virtualization|limactl|ssh /.test(m![2]!))
        .reduce((n, m) => n + Number(m![1]), 0),
    };
  } catch {
    return { at: Date.now(), unavailable: true };
  }
};
const hostBefore = hostContext(),
  goldenBytes = goldenPath ? fs.readFileSync(goldenPath) : null;
if (!directory || !destination) throw Error("per-fact-micro.ts OWNED_RUN NEW_OUTPUT.json");
const tag = path.basename(directory),
  relative = "trace/raw/layout-captures.jsonl.gz";
if (!/^tx2-dxt1-[a-z0-9-]+$/.test(tag)) throw Error("Foreign corpus");
const hash = (b: string | Buffer) => createHash("sha256").update(b).digest("hex");
const bytes = fs.readFileSync(path.join(directory, relative));
const anchorPath = `lab/experiments/EXP-DX1/t1/runs/${tag}/SHA256SUMS`;
const anchor = execFileSync("git", ["show", `HEAD:${anchorPath}`], { encoding: "utf8" });
if (!anchor.split("\n").includes(`${hash(bytes)}  ${relative}`))
  throw Error("Saved corpus differs from original committed seal");
const manifest = JSON.parse(fs.readFileSync(path.join(directory, "trace-run.json"), "utf8"));
const captures = gunzipSync(bytes)
  .toString("utf8")
  .trim()
  .split("\n")
  .map((l) => JSON.parse(l));
if (captures.length !== 300 || new Set(captures.map((c) => c.operationId)).size !== 300)
  throw Error("Expected 300 distinct captured payloads");
const cases = captures.map((c) => {
  if (
    c.run !== tag ||
    c.slot !== tag ||
    c.source !== manifest.source ||
    !Number.isSafeInteger(c.datomicT) ||
    c.datomicT <= c.basisT
  )
    throw Error("Stale or unbound capture");
  const texts = [...String(c.dataEdn).matchAll(/\[:triplex\/row\s+("(?:\\.|[^"\\])*")/g)].map((m) =>
    JSON.parse(m[1]),
  );
  if (texts.length !== 26 + 2 * c.facts && texts.length !== 25 + 2 * c.facts) {
    // [DX-T1-12] Why: journal entity counts vary with actual changed entities; require real rows, never an estimated count.
    // Rejected: fabricate missing rows from the menu's approximate datom formula.
    if (texts.length < 2 * c.facts) throw Error("Incomplete row-text corpus");
  }
  const rows = texts.map((t) => decodeRowText(t));
  const values = rows.map((row) =>
    decodeValueColumns(row, storedValueDomain(ValueDomains.datomic, row.attribute)),
  );
  return { capture: c, rows, values };
});
const sourceFiles = [
  "packages/datomic/src/rows.ts",
  "packages/datomic/src/rowText.ts",
  "packages/datomic/src/codec.ts",
  "packages/datomic/test/per-fact-micro.ts",
  "packages/core/dist/ValueDomain.js",
];
const hashes = Object.fromEntries(sourceFiles.map((f) => [f, hash(fs.readFileSync(f))]));
const golden = cases.map(({ capture: c, rows, values }) => {
  const packed = JSON.stringify(
    values.map((v, i) => packValue(v, storedValueDomain(ValueDomains.datomic, rows[i]!.attribute))),
  );
  const texts = rows.map((r) => encodeRowText(r));
  const body = stringifyExact({
    operationId: c.operationId,
    rowTexts: Object.fromEntries(rows.map((r, i) => [r.id, texts[i]])),
  });
  return {
    operationId: c.operationId,
    band: c.band,
    facts: c.facts,
    rows: rows.length,
    packedSha256: hash(packed),
    rowTextsSha256: hash(JSON.stringify(texts)),
    bodySha256: hash(body),
    bodyBytes: Buffer.byteLength(body),
  };
});
if (goldenBytes) {
  const original = JSON.parse(goldenBytes.toString());
  if (
    original.input.corpusSha256 !== hash(bytes) ||
    JSON.stringify(original.golden) !== JSON.stringify(golden)
  )
    throw Error("Baseline differs from pre-change golden bytes");
}
const candidates: any[] = [];
if (goldenPath)
  for (let round = 0; round < 8; round++)
    for (const index of round % 2 ? [...cases.keys()].reverse() : [...cases.keys()]) {
      const { rows, values, capture: c } = cases[index]!;
      const order = ["baseline", "pack", "row", "body", "combined"];
      const variants = order.slice(round % 5).concat(order.slice(0, round % 5));
      if (round % 2) variants.reverse();
      for (const variant of variants) {
        const p = variant === "pack" || variant === "combined",
          r = variant === "row" || variant === "combined",
          b = variant === "body" || variant === "combined";
        const t0 = performance.now();
        const built = rows.map((row, i) =>
          r
            ? createPackedRow(
                {
                  entityId: row.entity_id,
                  attribute: row.attribute,
                  value: values[i]!,
                  validFrom: row.valid_from,
                  validTo: row.valid_to ?? undefined,
                  createdBy: row.created_by ?? undefined,
                  entityType: row.entity_type ?? undefined,
                },
                row.tx_id,
                row.recorded_at,
                row.id,
                row.recorded_position,
                p,
              )
            : {
                ...row,
                ...(p ? packValueOnce : packValue)(
                  values[i]!,
                  storedValueDomain(ValueDomains.datomic, row.attribute),
                ),
              },
        );
        const t1 = performance.now(),
          texts = built.map((row) => (r ? encodeRowTextFast : encodeRowText)(row)),
          t2 = performance.now();
        const body = (b ? stringifyNativeExact : stringifyExact)({
            operationId: c.operationId,
            rowTexts: Object.fromEntries(built.map((row, i) => [row.id, texts[i]])),
          }),
          t3 = performance.now();
        const packed = built.map((row) =>
          Object.fromEntries(
            [
              "value_type",
              "value_string",
              "value_number",
              "value_boolean",
              "value_datetime",
              "value_json",
            ].map((k) => [k, (row as any)[k]]),
          ),
        );
        if (
          hash(JSON.stringify(packed)) !== golden[index]!.packedSha256 ||
          hash(JSON.stringify(texts)) !== golden[index]!.rowTextsSha256 ||
          hash(body) !== golden[index]!.bodySha256
        )
          throw Error(`Candidate bytes differ: ${variant}/${c.operationId}`);
        if (round)
          candidates.push({
            round,
            variant,
            band: c.band,
            operationId: c.operationId,
            packMs: t1 - t0,
            rowMs: t2 - t1,
            bodyMs: t3 - t2,
            totalMs: t3 - t0,
          });
      }
    }
const times: any[] = [];
for (let round = 0; round < 6; round++)
  for (const index of round % 2 ? [...cases.keys()].reverse() : [...cases.keys()]) {
    const { rows, values, capture: c } = cases[index]!;
    const t0 = performance.now();
    const packed = values.map((v, i) =>
      packValue(v, storedValueDomain(ValueDomains.datomic, rows[i]!.attribute)),
    );
    const t1 = performance.now();
    const texts = rows.map((r) => encodeRowText(r));
    const t2 = performance.now();
    const body = stringifyExact({
      operationId: c.operationId,
      rowTexts: Object.fromEntries(rows.map((r, i) => [r.id, texts[i]])),
    });
    const t3 = performance.now();
    if (
      hash(JSON.stringify(packed)) !== golden[index]!.packedSha256 ||
      hash(JSON.stringify(texts)) !== golden[index]!.rowTextsSha256 ||
      hash(body) !== golden[index]!.bodySha256
    )
      throw Error("Nondeterministic baseline bytes");
    if (round)
      times.push({
        round,
        band: c.band,
        operationId: c.operationId,
        packMs: t1 - t0,
        rowMs: t2 - t1,
        bodyMs: t3 - t2,
        totalMs: t3 - t0,
      });
  }
for (const [file, digest] of Object.entries(hashes))
  if (hash(fs.readFileSync(file)) !== digest) throw Error("Micro program changed during attempt");
fs.writeFileSync(
  destination,
  JSON.stringify(
    {
      schema: "triplex.per-fact-micro/1",
      mode: goldenPath ? "candidates" : "baseline",
      source: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
      programHashes: hashes,
      host: { before: hostBefore, after: hostContext() },
      input: {
        tag,
        source: manifest.source,
        corpusSha256: hash(bytes),
        anchorSha256: hash(anchor),
        goldenSha256: goldenBytes ? hash(goldenBytes) : null,
      },
      golden,
      times,
      candidates,
      limits: [
        "CPU microbenchmark only; not a durable commit A/B",
        "reconstructed row-text request body; no claim of original HTTP envelope equality",
        "first round unmeasured; fixed forward/reverse payload order",
      ],
    },
    null,
    2,
  ) + "\n",
  { flag: "wx" },
);
console.log(
  JSON.stringify({
    output: path.basename(destination),
    payloads: cases.length,
    measurements: times.length,
    byteIdentity: true,
  }),
);
