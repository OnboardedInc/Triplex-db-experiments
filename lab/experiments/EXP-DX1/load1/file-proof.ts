import assert from "node:assert/strict";
import { copyFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import type { CompositionHandle } from "../../../bench/lib/composition.ts";
import { fileSource, type Group } from "./export.ts";
import { sealedSnapshot } from "./file-source.ts";
import { identity, sha } from "./source.ts";
import { Snapshot } from "./snapshot.ts";

export async function proveFile(
  comp: CompositionHandle,
  scope: string,
  subjects: number,
  dir: string,
  arm: string,
) {
  const namespace = "acct/copy/",
    validAt = 1700000000000,
    width = 128;
  const meta = {
    mode: "snapshot" as const,
    source: "fixture-export",
    generation: "file-1",
    groups: subjects,
    validAt,
  };
  const fixtures = (duplicate = false): Group[] =>
    Array.from({ length: subjects }, (_, i) => ({
      ordinal: i,
      id: "record-" + i,
      ops: [
        {
          op: "assert",
          ref: i + "/a",
          entityId: namespace + (duplicate ? 0 : i),
          attribute: "large",
          value: { type: "integer", value: "9223372036854775807" },
          validFrom: validAt,
        },
        {
          op: "assert",
          ref: i + "/b",
          entityId: namespace + i,
          attribute: "child",
          value: { type: "ref", value: namespace + i + "/child" },
          validFrom: validAt,
        },
        {
          op: "assert",
          ref: i + "/c",
          entityId: namespace + i + "/child",
          attribute: "flag",
          value: { type: "boolean", value: true },
          validFrom: validAt,
        },
        {
          op: "assert",
          ref: i + "/d",
          entityId: namespace + i,
          attribute: "eventTime",
          value: { type: "datetime", value: validAt + i },
          validFrom: validAt,
        },
        {
          op: "assert",
          ref: i + "/e",
          entityId: namespace + i,
          attribute: "number",
          value: { type: "number", value: i - 0.25 },
          validFrom: validAt,
        },
      ],
    }));
  const exportFile = path.join(dir, arm + ".export.sqlite"),
    ledgerFile = path.join(dir, arm + ".checkpoint.sqlite");
  const declaration = fileSource(exportFile, meta, fixtures()),
    header = declaration.header;
  declaration.close();
  assert.throws(() =>
    sealedSnapshot(exportFile, { ...header, seal: "0".repeat(64) }, namespace, width),
  );
  const wrongFile = path.join(dir, arm + ".overlap.sqlite");
  const overlapping = fileSource(wrongFile, meta, fixtures(true));
  const wrongHeader = overlapping.header;
  overlapping.close();
  assert.throws(() => sealedSnapshot(wrongFile, wrongHeader, namespace, width));
  const invalidFile = path.join(dir, arm + ".unsupported.sqlite");
  const invalidGroups = fixtures();
  const badNumber = invalidGroups[0]!.ops[4]!;
  assert(badNumber.op === "assert" && badNumber.value.type === "number");
  badNumber.value.value = -0;
  const invalidExport = fileSource(invalidFile, meta, invalidGroups);
  const invalidHeader = invalidExport.header;
  invalidExport.close();
  assert.throws(() => sealedSnapshot(invalidFile, invalidHeader, namespace, width));
  const data = sealedSnapshot(exportFile, header, namespace, width);
  const start = performance.now();
  try {
    const neighbor = await comp.transact(
      [
        {
          op: "assert",
          entityId: "acct/other/one",
          attribute: "value",
          value: { type: "string", value: "other" },
          validFrom: validAt,
        },
      ],
      { actor: "other", commandId: "other-before-import", correlationId: sha("other") },
    );
    assert(neighbor.ok);
    const run = await Snapshot.open(comp, data.data, subjects, width, ledgerFile);
    const first = data.data.batches().next().value;
    assert(first);
    let before;
    try {
      before = await run.write(first);
      await run.drain(2);
    } finally {
      run.close();
    }
    assert(before);
    const forgedPath = path.join(dir, arm + ".forged-cursor.sqlite");
    copyFileSync(ledgerFile, forgedPath);
    const forged = new DatabaseSync(forgedPath);
    try {
      forged.exec("DELETE FROM frames");
    } finally {
      forged.close();
    }
    await assert.rejects(Snapshot.open(comp, data.data, subjects, width, forgedPath));
    const reopened = await Snapshot.open(comp, data.data, subjects, width, ledgerFile);
    try {
      await reopened.drain(2);
      assert.deepEqual(await reopened.write(first), before);
      const command = identity(scope, reopened.source, width, first).commandId;
      assert.equal(before.command, command);
      const proof = await reopened.verify();
      assert.equal(proof.facts, subjects * 5);
      assert.equal(proof.cut, reopened.totals().commands + 2);
      return {
        scope,
        sourceSeal: data.data.seal,
        facts: proof.facts,
        elapsedMs: performance.now() - start,
        proof,
        first: before,
        header,
      };
    } finally {
      reopened.close();
    }
  } finally {
    data.close();
  }
}
