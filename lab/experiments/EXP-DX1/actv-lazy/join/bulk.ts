import assert from "node:assert/strict";
import { DatomicClient } from "../../../../../packages/datomic/dist/index.js";
import { runtimeApi } from "../../../../bench/lib/triplex.ts";

export type BulkClass = "activation" | "notice";
const classByClaim = new Map<string, BulkClass>();
let installed = false;
export const bulkWireLimit = 64 * 1024;
export const bulkUs = (rows: number, bytes: number) =>
  2400 + 1100 + 45 * rows + Math.ceil((70 * bytes) / 1024);

// [DX-ACT1] Why: the pinned W1 gateway selects the class from the native claim frame. Rejected: an ambient Effect context that can belong to a different writing fiber.
export async function bulkClaim<T>(
  scope: string,
  claim: string,
  kind: BulkClass,
  send: () => Promise<T>,
) {
  if (!installed) {
    installed = true;
    const original = DatomicClient.prototype.transact;
    DatomicClient.prototype.transact = function (db, input, onSent) {
      const claims = input.claims.map((entry) => classByClaim.get(db + "/" + entry.commandId));
      const kind = claims.find((x) => x !== undefined);
      if (!kind) return original.call(this, db, input, onSent);
      assert(claims.length === 1 && input.rows.length <= 96, "Invalid bulk claim frame");
      const wire = { ...input, writeClass: kind };
      return original.call(this, db, wire, onSent);
    };
  }
  const db =
    "s2-" + Buffer.from(String(runtimeApi.DatabaseScope.test(scope))).toString("base64url");
  const key = db + "/" + claim;
  assert(!classByClaim.has(key), "Bulk claim already in flight in this process");
  classByClaim.set(key, kind);
  try {
    return await send();
  } finally {
    classByClaim.delete(key);
  }
}

type Turn = () => Promise<void>;
export class BulkQueue {
  private readonly ready = new Map<string, Turn[]>();
  private availableAt = 0;
  private inFlight = 0;
  private liveTurns = 0;
  private writing = false;
  private timer?: ReturnType<typeof setTimeout>;
  readonly duty: number;
  private readonly observe?: (ms: number) => void;
  constructor(duty = 0.5, observe?: (ms: number) => void) {
    assert(duty > 0 && duty <= 1);
    this.duty = duty;
    this.observe = observe;
  }
  async live<T>(work: () => Promise<T>) {
    this.inFlight++;
    try {
      return await work();
    } finally {
      this.inFlight--;
      this.liveTurns++;
      this.pump();
    }
  }
  submit<T>(scope: string, work: () => Promise<T>) {
    return new Promise<T>((resolve, reject) => {
      const turns = this.ready.get(scope) ?? [];
      turns.push(async () => {
        try {
          resolve(await work());
        } catch (e) {
          reject(e);
        }
      });
      this.ready.set(scope, turns);
      this.pump();
    });
  }
  private pump() {
    if (this.writing || this.timer || !this.ready.size || (this.inFlight && this.liveTurns < 8))
      return;
    const gap = this.availableAt - performance.now();
    if (gap > 0) {
      this.timer = setTimeout(() => {
        this.timer = undefined;
        this.pump();
      }, Math.ceil(gap));
      return;
    }
    // [DX-ACT1] Why: use the W1 choice of live preference and one bulk turn after eight live completions, rotating ready accounts. Rejected: submitting an entire release to the non-preemptible native pipeline.
    const [scope, turns] = this.ready.entries().next().value!;
    const turn = turns.shift()!;
    this.ready.delete(scope);
    if (turns.length) this.ready.set(scope, turns);
    this.writing = true;
    this.liveTurns = 0;
    const start = performance.now();
    void turn().finally(() => {
      const done = performance.now(),
        elapsed = done - start;
      this.observe?.(elapsed);
      this.availableAt = done + elapsed * (1 / this.duty - 1);
      this.writing = false;
      this.pump();
    });
  }
}
