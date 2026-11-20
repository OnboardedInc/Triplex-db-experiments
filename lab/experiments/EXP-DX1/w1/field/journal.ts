import assert from "node:assert/strict";

type JournalRow = {
  attribute: string;
  value_string: string | null;
  value_json: string | null;
  value_datetime: number | null;
  value_number: number | null;
};
export type JournalIntent = {
  tx: string;
  position: number;
  command: string;
  clock: number;
  root: string;
  changes: ReadonlyArray<Record<string, unknown>>;
};

export function checkJournal(
  [tx, position, rows]: [string, number, readonly JournalRow[]],
  intent: JournalIntent,
) {
  assert.equal(tx, intent.tx);
  assert.equal(position, intent.position);
  assert.equal(rows.length, 4 + intent.changes.length);
  const fields = (attr: string) => rows.filter((row) => row.attribute === ":_tx/" + attr);
  assert.deepEqual(
    fields("position").map((row) => row.value_number),
    [intent.position],
  );
  assert.deepEqual(
    fields("command-id").map((row) => row.value_string),
    [intent.command],
  );
  assert.deepEqual(
    fields("instant").map((row) => row.value_datetime),
    [intent.clock],
  );
  assert.deepEqual(
    fields("changed-entity").map((row) => row.value_string),
    [intent.root],
  );
  const key = (c: Record<string, unknown>) => `${c.op}/${c.tripleId}`;
  const ordered = (changes: readonly Record<string, unknown>[]) =>
    [...changes].sort((a, b) => key(a).localeCompare(key(b)));
  assert.deepEqual(
    ordered(fields("change").map((row) => JSON.parse(row.value_json!))),
    ordered(intent.changes),
  );
}
