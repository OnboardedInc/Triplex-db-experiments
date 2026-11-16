import { expect, it } from "vitest";
import { qualifyReplay, sha256 } from "../../../lab/trace/layout-replay.mjs";

function fixture() {
  const manifest = { tag: "run", slot: "run", source: "source", startedAt: 1 };
  const captures = Array.from({ length: 300 }, (_, i) => ({ operationId: `op${i}`, facts: i < 100 ? 7 : i < 200 ? 17 : 35,
    band: i < 100 ? "small" : i < 200 ? "medium" : "large", basisT: 10 + i, datomicT: 11 + i, capturedAt: 5,
    dataEdn: `[[:function {:operation "op${i}"}]]` }));
  const selectionText = JSON.stringify({ ...manifest, run: "run", createdAt: 6,
    commands: captures.map(c => ({ operationId: c.operationId, facts: c.facts })) });
  const rows = captures.flatMap(c => ["A", "B", "C", "D", "E"].flatMap(shape => [0, 1].map(round => ({
    schema: "triplex.layout-replay.v1", source: "source", run: "run", slot: "run", startedAt: 7,
    ...c, dataEdn: undefined, payloadSha256: sha256(c.dataEdn), shape, round, wallMs: 1, txStats: { "tx-fn-ms": .5 },
    datoms: 40, fressianBytes: 10000, valueUtf8Bytes: 9000, ioStats: { api: "with", reads: { avet: 2 } },
    logicalDeltaEqual: shape !== "D", omittedLogicalRows: shape === "D" ? 10 : 0,
  }))));
  const payloads = "immutable payload bytes", capturesText = captures.map(c => JSON.stringify(c)).join("\n"),
    recordsText = rows.map(r => JSON.stringify(r)).join("\n");
  const complete = { schema: "triplex.layout-replay-complete.v1", run: "run", slot: "run", source: "source", startedAt: 7, endedAt: 8,
    counts: { small: 100, medium: 100, large: 100 }, basisBefore: 500, basisAfter: 500, records: 3000,
    payloadSha256: sha256(payloads), capturesSha256: sha256(capturesText), selectionSha256: sha256(selectionText), recordsSha256: sha256(recordsText) };
  return { manifest, bundle: { payloads, capturesText, selectionText, recordsText, complete } };
}
it("qualifies the full, exact 300-payload by five-shape by two-round product only", () => {
  const { bundle, manifest } = fixture();
  expect(qualifyReplay(bundle, manifest, 9).rows).toHaveLength(3000);
  for (const update of [{ source: "old" }, { slot: "foreign" }, { basisAfter: 501 }, { startedAt: 0 }, { endedAt: 2000 }, { records: 2999 }])
    expect(() => qualifyReplay({ ...bundle, complete: { ...bundle.complete, ...update } }, manifest, 9)).toThrow();
  expect(() => qualifyReplay({ ...bundle, payloads: "substituted" }, manifest, 9)).toThrow();
});
it("rejects duplicate, foreign, incomplete and semantically different rows even with resealed JSON", () => {
  const { bundle, manifest } = fixture();
  for (const mutate of [
    (rows: any[]) => { rows[1] = rows[0]; },
    (rows: any[]) => { rows[0].operationId = "foreign"; },
    (rows: any[]) => { rows[0].logicalDeltaEqual = false; },
    (rows: any[]) => { rows[0].payloadSha256 = "wrong"; },
    (rows: any[]) => { rows[0].datomicT++; },
    (rows: any[]) => { rows[0].wallMs = -1; },
    (rows: any[]) => { rows.pop(); },
  ]) {
    const rows = bundle.recordsText.split("\n").map(JSON.parse); mutate(rows);
    const recordsText = rows.map(r => JSON.stringify(r)).join("\n");
    expect(() => qualifyReplay({ ...bundle, recordsText, complete: { ...bundle.complete, recordsSha256: sha256(recordsText) } }, manifest, 9)).toThrow();
  }
});
