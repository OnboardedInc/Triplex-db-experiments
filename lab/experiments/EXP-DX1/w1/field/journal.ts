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
  /** [DX-S4] A save of several owners names each in one changed-entity row; `root` is then the first of them. */
  roots?: readonly string[];
  changes: ReadonlyArray<Record<string, unknown>>;
};

export function checkJournal(
  [tx, position, rows]: [string, number, readonly JournalRow[]],
  intent: JournalIntent,
) {
  assert.equal(tx, intent.tx);
  assert.equal(position, intent.position);
  assert.equal(rows.length, 3 + (intent.roots?.length ?? 1) + intent.changes.length);
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
    fields("changed-entity").map((row) => row.value_string).sort(),
    [...(intent.roots ?? [intent.root])].sort(),
  );
  const key = (c: Record<string, unknown>) => `${c.op}/${c.tripleId}`;
  const ordered = (changes: readonly Record<string, unknown>[]) =>
    [...changes].sort((a, b) => key(a).localeCompare(key(b)));
  assert.deepEqual(
    ordered(fields("change").map((row) => JSON.parse(row.value_json!))),
    ordered(intent.changes),
  );
}
