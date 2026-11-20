import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { createInterface } from "node:readline";
import type { DeepIdentity } from "./deep-profile.ts";

type NativeWritePath = {
  function: string;
  historyRange: boolean;
  scheduling: boolean;
  packedRows: number;
};
type NativeCut = {
  position: number;
  t: string;
  operation: string;
  commands: string[];
  size: number;
  datoms: number;
  facts: number;
  writePath?: NativeWritePath;
};
export class DeepCommitMeter {
  private readonly positions = new Map<number, NativeCut>();
  private readonly groups = new Map<string, NativeCut[]>();
  readonly database: string;
  constructor(database: string) {
    this.database = database;
  }

  observe(db: string, input: any, reply: any, position: number, commands: string[]) {
    assert.equal(db, this.database);
    assert(
      reply.position?.t === "long" &&
        reply.position.v === String(position) &&
        Number.isSafeInteger(reply.delta) &&
        input.position + reply.delta === position,
    );
    assert(reply.t?.t === "long" && typeof reply.t.v === "string" && /^[1-9]\d*$/.test(reply.t.v));
    assert.equal(reply.operationId, input.operationId);
    const size = reply.groupSize ?? 1;
    assert(
      Number.isSafeInteger(size) &&
        size >= 1 &&
        Number.isSafeInteger(reply.datoms) &&
        reply.datoms > 0,
    );
    const row: NativeCut = {
      position,
      t: reply.t.v,
      operation: input.operationId,
      commands,
      size,
      datoms: reply.datoms,
      facts: input.rows.reduce(
        (n: number, r: any) =>
          n + Number(r.entity_type === "_Transaction" && r.attribute === ":_tx/change"),
        0,
      ),
      ...(reply.writePath === undefined ? {} : { writePath: reply.writePath }),
    };
    this.add(row);
  }
  private add(row: NativeCut) {
    const { position } = row;
    assert(
      Number.isSafeInteger(position) &&
        position > 0 &&
        /^[1-9]\d*$/.test(row.t) &&
        typeof row.operation === "string" &&
        row.operation,
    );
    assert(Array.isArray(row.commands) && row.commands.every((id) => typeof id === "string" && id));
    assert(
      Number.isSafeInteger(row.size) &&
        row.size >= 1 &&
        Number.isSafeInteger(row.datoms) &&
        row.datoms > 0 &&
        Number.isSafeInteger(row.facts) &&
        row.facts >= 0,
    );
    if (row.writePath !== undefined) {
      const { function: writer, historyRange, scheduling, packedRows } = row.writePath;
      assert(typeof writer === "string" && writer.length > 0);
      assert(typeof historyRange === "boolean" && typeof scheduling === "boolean");
      assert(Number.isSafeInteger(packedRows) && packedRows >= 0);
    }
    const prior = this.positions.get(position);
    if (prior) {
      assert.deepEqual(prior, row);
      return;
    }
    this.positions.set(position, row);
    const group = this.groups.get(row.t) ?? [];
    group.push(row);
    this.groups.set(row.t, group);
  }
  static async read(file: string, identity: DeepIdentity, database: string, positions: number) {
    const verified = new DeepCommitMeter(database);
    let previous = -1;
    for await (const line of createInterface({
      input: fs.createReadStream(file),
      crlfDelay: Infinity,
    })) {
      const row = JSON.parse(line);
      if (previous < 0) {
        assert.deepEqual(row, { format: "deep-native-receipts/1", identity, database });
        previous = 0;
      } else {
        assert(row.position > previous);
        verified.add(row);
        previous = row.position;
      }
    }
    assert(previous >= 0 && verified.positions.size === positions);
    return verified;
  }

  // [DX-INT1] Why: derive the selected path from the actual receipt rows both before and after export.
  // Rejected: trusting launcher flags or accepting a report with no matching native receipt.
  writePath() {
    let first: NativeCut | undefined;
    let packedRows = 0,
      rangeRequests = 0,
      unexpectedFunctions = 0;
    for (const row of this.positions.values()) {
      const path = row.writePath;
      assert(path && !path.scheduling && row.size === 1);
      if (!first || row.position < first.position) first = row;
      packedRows += path.packedRows;
      rangeRequests += Number(path.historyRange);
      unexpectedFunctions += Number(!/^:triplex\.write\/v-[a-f0-9]{24}$/.test(path.function));
    }
    return {
      database: this.database,
      nativeCommits: this.positions.size,
      packedRows,
      rangeRequests,
      unexpectedFunctions,
      first: first && {
        position: first.position,
        operationId: first.operation,
        nativeT: first.t,
        function: first.writePath!.function,
      },
    };
  }

  verifyCommand(position: number, command: string) {
    assert(
      this.positions.get(position)?.commands.includes(command),
      "Missing native command receipt",
    );
  }

  // [DX-SCALE1] Why: multiple logical receipts can name a single native transaction. Verify its complete ordered membership and count its physical datoms once. Rejected: treating ACK count as disk commits or multiplying group datoms by the number of saves.
  private count(expected: number, rows: NativeCut[], ms: number) {
    assert(Number.isFinite(ms) && ms > 0);
    const ids = new Set(rows.map((r) => r.t));
    let physicalDatoms = 0,
      grouped = 0,
      completeGroups = true;
    for (const id of ids) {
      const members = [...this.groups.get(id)!].sort((a, b) => a.position - b.position);
      const first = members[0]!;
      completeGroups &&= members.every(
        (r, i) =>
          r.position === first.position + i &&
          r.size === members.length &&
          r.datoms === first.datoms,
      );
      physicalDatoms += first.datoms;
      if (members.length > 1) grouped++;
    }
    const facts = rows.reduce((n, row) => n + row.facts, 0);
    const complete = expected === rows.length && completeGroups && rows.length > 0 && facts > 0;
    return {
      expected,
      observed: rows.length,
      completeGroups,
      qualified: complete,
      seconds: ms / 1000,
      physicalTransactions: ids.size,
      multiCommandTransactions: grouped,
      physicalDatoms,
      changedFacts: facts,
      logicalPerS: complete ? (rows.length * 1000) / ms : null,
      physicalPerS: complete ? (ids.size * 1000) / ms : null,
      changedFactsPerS: complete ? (facts * 1000) / ms : null,
      datomsPerS: complete ? (physicalDatoms * 1000) / ms : null,
    };
  }

  release(first: number, last: number, ms: number, markerCommand: string) {
    assert(
      Number.isSafeInteger(first) && Number.isSafeInteger(last) && first >= 1 && last >= first,
    );
    const marker = this.positions.get(first);
    if (marker) assert(marker.commands.includes(markerCommand));
    const rows: NativeCut[] = [];
    for (let p = first; p <= last; p++) {
      const row = this.positions.get(p);
      if (row) rows.push(row);
    }
    return { first, last, ...this.count(last - first + 1, rows, ms) };
  }
  verifyFacts(position: number, expected: number) {
    const row = this.positions.get(position);
    if (row)
      assert.equal(
        row.facts,
        expected,
        "Native change journal differs from the acknowledged operations",
      );
  }

  burst(
    writes: readonly {
      position?: number;
      ackPublishedAt?: number;
      outcome?: string;
      resend?: boolean;
      stream?: string;
      commandId?: string;
    }[],
    from: number,
    to: number,
  ) {
    const accepted = writes.filter(
      (w) =>
        w.stream === "background" &&
        !w.resend &&
        w.outcome === "committed" &&
        w.ackPublishedAt! >= from &&
        w.ackPublishedAt! < to,
    );
    assert.equal(new Set(accepted.map((w) => w.position)).size, accepted.length);
    const rows: NativeCut[] = [];
    for (const w of accepted) {
      assert(Number.isSafeInteger(w.position) && typeof w.commandId === "string");
      const row = this.positions.get(w.position!);
      if (row) {
        assert(row.commands.includes(w.commandId!));
        rows.push(row);
      }
    }
    return { from, to, ...this.count(accepted.length, rows, to - from) };
  }

  seal(file: string, identity: DeepIdentity) {
    const f = fs.openSync(file, "wx"),
      hash = createHash("sha256");
    const emit = (row: unknown) => {
      const line = JSON.stringify(row) + "\n";
      fs.writeFileSync(f, line);
      hash.update(line);
    };
    try {
      emit({ format: "deep-native-receipts/1", identity, database: this.database });
      for (const p of [...this.positions.keys()].sort((a, b) => a - b)) emit(this.positions.get(p));
      fs.fsyncSync(f);
    } finally {
      fs.closeSync(f);
    }
    return {
      identity,
      database: this.database,
      positions: this.positions.size,
      sha256: hash.digest("hex"),
    };
  }
}
