import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { beginTrace, finishTrace, withTrace } from "../../../../packages/datomic/dist/index.js";
import { measureW0Http } from "../../../bench/lib/w0-http.ts";
import type { Store, Op } from "./store.ts";
import type { Packet } from "./dispatcher.ts";

import { walCut, appendedWal } from "./wal.ts";

type Extra = Record<string, unknown>;
const now = () => performance.timeOrigin + performance.now();
const bytes = (v: unknown) =>
  Buffer.byteLength(JSON.stringify(v, (_, x) => (typeof x === "bigint" ? x.toString() : x)));
export class Budget {
  readonly rows: Extra[] = [];
  enabled = false;
  constructor(identity: { epoch: string; role: string; dir: string }) {
    this.identity = identity;
  }
  readonly identity: { epoch: string; role: string; dir: string };
  mark(kind: string, start: number, data: Extra = {}) {
    if (this.enabled) this.rows.push({ kind, start, end: now(), ...data });
  }
  packet(p: Packet) {
    this.mark("deliveries", now(), {
      batch: p.batch,
      count: p.deliveries.length,
      payloadBytes: p.deliveries.reduce((n, d) => n + Buffer.byteLength(d.payload), 0),
      deliveryBytes: bytes(p.deliveries),
    });
  }
  async http<T>(kind: string, role: string, f: () => Promise<T>, detail: (v: T) => Extra) {
    if (!this.enabled) return f();
    const start = now(),
      tr = beginTrace(kind === "write" ? "commit" : "internal", "notice." + kind, {
        epoch: this.identity.epoch,
        side: role,
      });
    try {
      const m = await withTrace(tr, () => measureW0Http(f));
      const data = detail(m.value);
      const socket: Record<string, number> = {};
      for (const span of tr?.spans ?? [])
        if (span.name.startsWith("socket."))
          socket[span.name] = (socket[span.name] ?? 0) + span.end - span.start;
      this.mark(kind, start, {
        role,
        trace: tr?.traceId,
        socket,
        ...data,
        requests: m.requests,
        samples: m.samples,
        commits: m.commits,
      });
      return m.value;
    } finally {
      finishTrace(tr);
    }
  }
  store<T extends Store>(base: T, role: string): T {
    return {
      ...base,
      currentPosition: () =>
        this.http(
          "head",
          role,
          () => base.currentPosition(),
          (position) => ({ position }),
        ),
      transactionByCommand: (id: string) =>
        this.http(
          "lookup",
          role,
          () => base.transactionByCommand(id),
          () => ({}),
        ),
      sweepPage: (roots: string[], basis: any) =>
        this.http(
          "pinned",
          role,
          () => base.sweepPage(roots, basis),
          (q) => {
            assert.deepEqual(q.reportedBasis, basis);
            const key = roots[0]?.replace(/^notice:v1:[a-f0-9]+:/, "").split(":")[0];
            return {
              cut: basis.position,
              key,
              roots: roots.length,
              rows: q.rows.length,
              reportedTrips: q.roundTrips,
            };
          },
        ),
      transact: (ops: Op[], meta: any) => {
        const wal =
          this.enabled &&
          role === "receiver" &&
          process.env.NOTIFY_WAL === "1" &&
          base.scopeName?.startsWith("act1-")
            ? path.join(this.identity.dir, base.scopeName + ".db")
            : undefined;
        const before = wal ? walCut(wal) : undefined;
        return this.http(
          "write",
          role,
          () => base.transact(ops, meta),
          (r) => {
            assert(r.ok && r.value.txId && r.value.position);
            const keys = ops
              .filter((o) => o.op === "assert")
              .map((o) => o.entityId.replace(/^notice:v1:[a-f0-9]+:/, "").split(":")[0]);
            const kind = keys.includes("received")
              ? "receive"
              : keys.includes("tail")
                ? "live"
                : keys.includes("ledger") || keys.includes("packet")
                  ? "derive"
                  : "cursor";
            return {
              operation: kind,
              txId: r.value.txId,
              position: r.value.position,
              ...(wal && before ? { wal: appendedWal(before, walCut(wal)) } : {}),
              opBytes: bytes(ops),
              operations: ops.length,
            };
          },
        );
      },
    } as T;
  }
  finish() {
    this.enabled = false;
    fs.writeFileSync(
      path.join(this.identity.dir, this.identity.role + "-budget.json.gz"),
      gzipSync(JSON.stringify({ ...this.identity, dir: undefined, rows: this.rows })),
      { flag: "wx" },
    );
  }
}
export const tick = now;
