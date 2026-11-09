// [EXP-QNODELAY] Why: reader entry points/imports, including aliased IO, require a
// reviewed parser boundary. Rejected: discovering files by latency field spelling.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { readerSources, auditReaders, hashSource } from "./readers.mjs";

test("every reviewed QLever receipt reader imports and calls the shared parser", () => {
  const inventory = JSON.parse(fs.readFileSync("lab/receipts/reader-inventory.json", "utf8"));
  const sources = readerSources(process.cwd());
  const hashes = new Map(sources.map((s) => [s.path, s.sha256]));
  for (const file of [
    "lab/receipts/reader-inventory.json",
    "lab/receipts/tsconfig.json",
    "package.json",
  ])
    hashes.set(file, hashSource(fs.readFileSync(file)));
  const result = auditReaders(sources, inventory);
  assert.deepEqual(result.failures, []);
  const after = readerSources(process.cwd());
  assert.deepEqual(
    after.map((s) => s.path),
    sources.map((s) => s.path),
    "source set changed",
  );
  for (const [file, hash] of hashes)
    assert.equal(hashSource(fs.readFileSync(file)), hash, `source changed: ${file}`);
  const receipt = {
    sources: sources.length,
    readers: inventory.sources.filter((s) => s.role === "reader").length,
    entryPoints: inventory.entryPoints,
    sourceHashes: Object.fromEntries(hashes),
    importGraph: result.graph,
  };
  const bytes = JSON.stringify(receipt);
  // [EXP-QNODELAY] Why: TAP can split large JSON lines; retain exact audit bytes.
  // Rejected: reconstructing a source receipt from truncated/chunked console text.
  const output = process.env.TX2_QNODELAY_READER_AUDIT;
  if (output) fs.writeFileSync(output, bytes + "\n", { flag: "wx" });
  console.log(
    JSON.stringify({
      sources: receipt.sources,
      readers: receipt.readers,
      auditSha256: hashSource(bytes + "\n"),
    }),
  );
});
for (const tree of ["lab", "packages"])
  for (const ext of ["mjs", "ts", "py", "sh"])
    test(`new reader cannot evade review through aliases or units: ${tree}/${ext}`, () => {
      const root = fs.mkdtempSync(path.join(os.tmpdir(), "qnodelay-r4-reader-"));
      try {
        fs.mkdirSync(path.join(root, tree));
        const text =
          ext === "py"
            ? 'import json as j\nr = j.load(open("receipt.json"))\nprint(r["seconds"])'
            : ext === "sh"
              ? 'cat "$receipt" | jq .time'
              : 'import {readFileSync as load} from "node:fs"; const r = JSON.parse(load("receipt.json")); process.stderr.write(String(r.seconds));';
        fs.writeFileSync(path.join(root, tree, `new.${ext}`), text);
        const sources = readerSources(root);
        assert.equal(sources.length, 1);
        assert.match(
          auditReaders(sources, { sources: [], entryPoints: [] }).failures.join("\n"),
          /unreviewed input boundary/,
        );
        if (ext !== "sh") {
          const reviewed = {
            sources: [
              {
                path: sources[0].path,
                sha256: hashSource(text),
                role: "reader",
                boundaries: 1,
                reason: "reads receipt.json",
              },
            ],
            entryPoints: [],
          };
          assert.match(
            auditReaders(sources, reviewed).failures.join("\n"),
            /must import|must call/,
          );
        }
      } finally {
        fs.rmSync(root, { recursive: true, force: true });
      }
    });
test("an imported parser cannot replace an actual reader call", () => {
  const text =
    'import {parseLatencyReceipt} from "./receipts/parse.ts"; const r = JSON.parse(bytes);';
  const source = {
    path: "lab/new.mjs",
    text,
    sha256: hashSource(text),
    imports: ["./receipts/parse.ts"],
  };
  const result = auditReaders([source], {
    sources: [
      {
        path: source.path,
        sha256: source.sha256,
        role: "reader",
        boundaries: 1,
        reason: "receipt reader",
      },
    ],
    entryPoints: [],
  });
  assert.match(result.failures.join("\n"), /parser boundary removed/);
  const other = { ...source, imports: ["./another/receipts/parse.ts"] };
  assert.match(
    auditReaders([other], {
      sources: [
        {
          path: source.path,
          sha256: source.sha256,
          role: "reader",
          boundaries: 0,
          reason: "fixture",
        },
      ],
      entryPoints: [],
    }).failures.join("\n"),
    /must import the parser/,
  );
});
