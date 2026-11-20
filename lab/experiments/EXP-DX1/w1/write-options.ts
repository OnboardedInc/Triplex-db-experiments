import assert from "node:assert/strict";

export type WriterOptions = {
  predecessorLookup: boolean;
  groupCommit: boolean;
  livePriority: boolean;
  fieldCoalesce: boolean;
  queueClock: boolean;
  stageClock: boolean;
  smallRows: boolean;
  reusePrepared: boolean;
  maxMembers: number;
  budgetMicros: number | null;
  bulkRows: number;
  bulkBytes: number;
  ledger: boolean;
  packedJournal: boolean;
  fastReply: boolean;
};

export type WriterExpectation = {
  source: string;
  slot: string;
  attempt: string;
  gatewaySourceHash: string;
  historyRange: boolean;
  options: WriterOptions;
};

export type WriterObservation = {
  attempt: string;
  database: string;
  gatewaySourceHash: string;
  position: number;
  t: string;
  strictRecordClocks: boolean;
  rowsVersion: number;
  commitFunction: string;
  commitFunctionInstalled: boolean;
  baseFunctionHash: string;
  options: WriterOptions;
};

export function verifyWriteOptions(
  observed: WriterObservation,
  db: string,
  expected: WriterExpectation,
  historyRange: boolean,
) {
  assert.equal(observed.database, db);
  assert.equal(observed.attempt, expected.attempt);
  assert.equal(observed.gatewaySourceHash, expected.gatewaySourceHash);
  assert.deepEqual(observed.options, expected.options);
  // [DX-WFIX1] Why: the field arms can select native predecessor lookup with the ordinary SDK identity wire.
  // Rejected: using the SDK history-range flag as evidence of the installed native function.
  assert.equal(historyRange, expected.historyRange);
  assert.equal(observed.strictRecordClocks, true);
  assert.equal(observed.rowsVersion, 3);
  assert.equal(observed.commitFunctionInstalled, true);
  assert.match(
    observed.commitFunction,
    expected.options.predecessorLookup ? /^:triplex\.write\/v-[a-f0-9]{24}$/ : /^:triplex\/commit$/,
  );
  assert.match(observed.baseFunctionHash, /^[a-f0-9]{64}$/);
  assert.match(observed.t, /^[1-9][0-9]*$/);
  assert(Number.isSafeInteger(observed.position) && observed.position >= 0);
}

export async function readWriteOptions(url: string, db: string, binding: string | undefined) {
  assert(binding, "Writer option expectation missing");
  const expected = JSON.parse(binding) as WriterExpectation;
  assert.match(expected.gatewaySourceHash, /^[a-f0-9]{64}$/);
  const historyRange = (process.env.TRIPLEX_DATOMIC_FAST_PATHS ?? "")
    .split(",")
    .includes("history-range");
  const response = await fetch(new URL(`/v1/db/${db}/write-options`, url), {
    signal: AbortSignal.timeout(35000),
  });
  assert(response.ok, "Writer option readback failed");
  const observed = (await response.json()) as WriterObservation;
  verifyWriteOptions(observed, db, expected, historyRange);
  return { expected, observed, historyRange };
}

export type WriterReadback = Awaited<ReturnType<typeof readWriteOptions>>;
