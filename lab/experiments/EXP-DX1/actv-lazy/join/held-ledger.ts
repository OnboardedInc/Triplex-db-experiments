import assert from "node:assert/strict";
import { setTimeout as sleep } from "node:timers/promises";
import { DatomicClient } from "../../../../../packages/datomic/dist/index.js";
import { decodeRowText } from "../../../../../packages/datomic/dist/rowText.js";
import { now, decodeFeed } from "../../scale1/decision/observer.ts";
import type { Save } from "../../scale1/decision/writes.ts";
import { checkSavedIdentity } from "../../v01/adopted.ts";

type Joined = { txId: string; commandId: string };
type Entry = Joined | Save;
type Wire = Parameters<typeof decodeFeed>[1];

export class HeldLedger {
  private cursor: number;
  private highest: number;
  private readonly expected = new Map<number, Entry>();
  private serial = Promise.resolve();
  private readonly reader: DatomicClient;
  private readonly database: string;
  private readonly subjectFunction?: string;

  constructor(reader: DatomicClient, database: string, at: number, subjectFunction?: string) {
    this.reader = reader;
    this.database = database;
    this.subjectFunction = subjectFunction;
    this.cursor = this.highest = at;
  }

  private add(position: number, e: Entry) {
    assert(position > this.cursor && !this.expected.has(position), "Duplicate native cut");
    this.expected.set(position, e);
    this.highest = Math.max(this.highest, position);
  }

  saved(row: Save) {
    assert(row.receipt);
    this.add(row.receipt.p, row);
  }

  joined(row: Joined & { position: number }) {
    // [DX-ACT5] A frame already adopted from the journal (its receipt arrived after the walk) is the same write.
    if (this.adopted.get(row.position) === row.commandId) return;
    this.add(row.position, { txId: row.txId, commandId: row.commandId });
  }
  private readonly adopted = new Map<number, string>();

  pending() {
    return this.highest;
  }

  /** [DX-ACT5] Every native position up to this one is matched to a known writer (reads pinned here are checkable). */
  verified() {
    return this.cursor;
  }

  // [DX-ACT1] Why: rank the matched save and metadata frames against one contiguous native journal.
  // Rejected: accepting a policy cut solely because its global transaction number advanced.
  // [DX-ACT5] `adopt`: a transaction this process did not write but whose only command id matches (a settlement frame a
  // killed child committed) is accepted as a joined write. Unset, as before.
  verifyThrough(position: number, mayAwaitAck = false, adopt?: RegExp) {
    const next = this.serial.then(async () => {
      const deadline = now() + 500;
      while (this.cursor < position) {
        const available = Math.min(100, position - this.cursor),
          after = this.cursor;
        const { transactions } = await this.reader.request<{ transactions: Wire[] }>(
          "POST",
          "/v2/db/" + this.database + "/transactions",
          { after, limit: available },
        );
        assert(transactions.length <= available);
        if (!transactions.length) {
          if (mayAwaitAck) return;
          assert(now() < deadline, "Missing native journal suffix");
          await sleep(5);
          continue;
        }
        for (const frame of transactions) {
          const [tx, p, encoded] = frame;
          assert.equal(p, this.cursor + 1);
          let want = this.expected.get(p);
          if (!want && adopt) {
            const ids = encoded.map(decodeRowText).filter((row) => row.attribute === ":_tx/command-id");
            if (ids.length === 1 && adopt.test(String(ids[0]!.value_string))) {
              want = { txId: tx, commandId: String(ids[0]!.value_string) };
              this.adopted.set(p, want.commandId);
            }
          }
          if (!want && mayAwaitAck) return;
          assert(want, "Unknown writer in held database at position " + p);
          if ("status" in want) {
            const ordered = this.subjectFunction !== undefined;
            checkSavedIdentity(
              want,
              decodeFeed(this.database, frame, now(), ordered),
              ordered ? "per-person-ordered" : "grouped",
              this.subjectFunction,
            );
          } else {
            const claims = encoded
              .map(decodeRowText)
              .filter((row) => row.attribute === ":_tx/command-id");
            assert.deepEqual(
              [tx, claims.map((r) => r.value_string)],
              [want.txId, [want.commandId]],
            );
          }
          this.expected.delete(p);
          this.cursor = p;
        }
      }
    });
    this.serial = next;
    return next;
  }
}
