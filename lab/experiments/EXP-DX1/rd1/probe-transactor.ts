import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { setTimeout as sleep } from "node:timers/promises";
import { bindNativeTransaction } from "../../../trace/native-transactions.mjs";
import { alignClockRecord, records } from "../../../trace/report.mjs";

type Identity = { run: string; source: string; slot: string };
type Clock = { domain: string; bootId: string; offsetMs: number; crossProcessQualified?: boolean };
export type GatewayExchange = Identity & {
  traceId: string;
  process: string;
  start: number;
  end: number;
  clock: Clock;
  attributes: { databaseHash: string; datomicT: string };
  spans: { name: string; start: number; end: number }[];
};

const key = (db: string, t: string) => `${db}/${t}`;
const isIdentity = (row: Identity, id: Identity) =>
  row.run === id.run && row.source === id.source && row.slot === id.slot;

// [DX-RD1] Why: match the transactor's own process/apply timers to the exact gateway receipt.
// Rejected: substituting gateway wait or tx-with time for the full native process interval.
export async function joinTransactor(
  rows: AsyncIterable<any> | Iterable<any>,
  exchanges: readonly GatewayExchange[],
  id: Identity,
  bootId: string,
) {
  const wanted = new Map<string, GatewayExchange>();
  for (const exchange of exchanges) {
    const { databaseHash, datomicT } = exchange.attributes;
    const k = key(databaseHash, datomicT);
    assert(
      isIdentity(exchange, id) &&
        exchange.process === "gw-w" &&
        exchange.clock?.domain === "linux-monotonic" &&
        exchange.clock.bootId === bootId,
    );
    assert(/^[a-f0-9]{64}$/.test(databaseHash) && /^\d+$/.test(datomicT) && !wanted.has(k));
    wanted.set(k, exchange);
  }
  const bound = new Map<
    string,
    {
      traceId: string;
      t: string;
      databaseHash: string;
      processMs: number;
      applyMs: number;
      end: number;
    }
  >();
  for await (const raw of rows) {
    if (raw.nativeType !== "triplex.NativeTransaction") continue;
    const k = key(raw.databaseHash, raw.datomicT),
      gateway = wanted.get(k);
    if (!gateway) continue;
    assert(
      isIdentity(raw, id) &&
        raw.clock?.domain === "linux-monotonic" &&
        raw.clock.bootId === bootId &&
        raw.clock.crossProcessQualified === true,
      "Native trace identity or boot clock differs",
    );
    const event = bindNativeTransaction(gateway, [alignClockRecord(raw, gateway.clock)]);
    assert(
      event && Number.isFinite(event.start) && !bound.has(gateway.traceId),
      "Missing, stale or duplicate native process observation",
    );
    bound.set(gateway.traceId, {
      traceId: gateway.traceId,
      t: raw.datomicT,
      databaseHash: raw.databaseHash,
      processMs: event.nativeStats.msec,
      applyMs: event.nativeStats["apply-msec"],
      end: event.start,
    });
  }
  return bound;
}

// [DX-RD1] Why: ask the prepared transactor's recorder for one fresh export after all four timed blocks.
// Rejected: exporting midway or accepting a completed file left by an earlier attempt.
export async function finishTransactor(
  dir: string,
  exchanges: readonly GatewayExchange[],
  id: Identity,
  bootId: string,
  deadline: number,
) {
  const jfr = path.join(dir, "tx.jfr"),
    complete = `${jfr}-complete.jsonl`;
  assert(
    ![jfr, `${jfr}.jsonl`, complete].some((file) => fs.existsSync(file)),
    "Prepared native export already exists",
  );
  fs.writeFileSync(path.join(dir, ".finish"), "", { flag: "wx" });
  let marker: any;
  while (performance.now() < deadline) {
    assert(!fs.existsSync(path.join(dir, "tx-jfr-error.txt")), "Transactor JFR export failed");
    const bytes = fs.existsSync(complete) ? fs.readFileSync(complete, "utf8") : "";
    if (bytes.endsWith("\n")) {
      marker = JSON.parse(bytes);
      break;
    }
    await sleep(250);
  }
  assert(
    marker?.type === "jfr-complete" &&
      marker.role === "tx" &&
      marker.process === "tx" &&
      isIdentity(marker, id) &&
      marker.clock?.bootId === bootId &&
      Number.isSafeInteger(marker.events) &&
      marker.events > 0 &&
      marker.clockSamples >= 2,
    "Fresh transactor export is incomplete",
  );
  const sha = createHash("sha256");
  for await (const bytes of fs.createReadStream(jfr)) sha.update(bytes);
  const sha256 = sha.digest("hex");
  assert.equal(sha256, marker.fileSha256, "Native recording byte checksum differs");
  let exportedRows = 0;
  async function* exported() {
    for await (const row of records(`${jfr}.jsonl`)) {
      assert(isIdentity(row, id) && row.process === "tx", "Foreign row in native recording export");
      if (++exportedRows % 1_024 === 0 && performance.now() >= deadline)
        throw Error("Transactor trace exceeded the probe budget");
      yield row;
    }
  }
  const bound = await joinTransactor(exported(), exchanges, id, bootId);
  assert.equal(exportedRows, marker.events, "Transactor export event count differs");
  assert(performance.now() < deadline, "Transactor trace exceeded the probe budget");
  return { sha256, events: marker.events as number, bound };
}
