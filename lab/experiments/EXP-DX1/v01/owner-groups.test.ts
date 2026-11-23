import assert from "node:assert/strict";
import { test } from "node:test";
import { ownerGroups } from "./adopted.ts";

// [DX-INT1] The pair's per-group reads: a person is "loader" when any predecessor row lies in (seed cut, aged head].
test("owner groups split loader-edited, earlier-window and seed people by their predecessor positions", () => {
  const row = (recorded_position: number) => ({ recorded_position }) as never;
  const rows = new Map<string, never[]>([
    ["acct/a/1", [row(10), row(10), row(10)]],
    ["acct/a/2", [row(10), row(15), row(10)]],
    ["acct/a/3", [row(10), row(25), row(10)]],
    ["acct/a/4", [row(20), row(25), row(10)]],
  ]);
  const groups = ownerGroups([{ rows } as never], 10, 20);
  assert.deepEqual(Object.fromEntries(groups), { "acct/a/1": "seed", "acct/a/2": "loader", "acct/a/3": "earlier-window", "acct/a/4": "loader" });
  // On the fresh copy the aged head is the seed cut, so no one is loader-edited.
  assert.deepEqual([...ownerGroups([{ rows } as never], 10, 10).values()], ["seed", "earlier-window", "earlier-window", "earlier-window"]);
  assert.throws(() => ownerGroups([], 10, 9));
});
