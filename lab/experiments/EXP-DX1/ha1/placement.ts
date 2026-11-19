import assert from "node:assert/strict";
import {
  DatomicClient,
  immutable,
  type Input,
  type Receipt,
} from "../../../../packages/datomic/test/ha1-account.ts";
import { clock, hash, sleep } from "./common.ts";
export type Cursor = { account: string; after: number };
export type RecordAt = {
  account: string;
  sequence: number;
  prev: string;
  digest: string;
  receipt: Receipt;
  feed: any;
  body?: string;
  observedFacts: number;
  valueHash: string;
};
export type Snapshot = {
  account: string;
  mode: "serving" | "importing" | "fenced";
  generation: number;
  source: string;
  target: string | null;
  sequence: number;
  digest: string;
  verified: number;
  sealT: number | null;
  sealP: number | null;
};
export type Place = { endpoint: string; db: string; generation: number };
export class PlacementError extends Error {
  constructor(
    readonly code: string,
    msg: string,
  ) {
    super(msg);
  }
}
export class AccountEndpoint {
  readonly native: DatomicClient;
  constructor(
    readonly account: string,
    readonly place: Place,
    readonly admin?: string,
  ) {
    assert(/^[a-z0-9-]{1,64}$/.test(account));
    this.native = new DatomicClient(place.endpoint, 25000);
  }
  close() {
    this.native.close();
  }
  async post<T>(op: string, body: object = {}, privileged = false): Promise<T> {
    const res = await fetch(this.place.endpoint + "/ha1/shared/" + op, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(privileged && this.admin ? { "x-ha1-admin": this.admin } : {}),
      },
      body: JSON.stringify({
        ...body,
        haDatabase: this.place.db,
        haAccount: this.account,
        haGeneration: this.place.generation,
      }),
      signal: AbortSignal.timeout(30000),
    });
    const v = (await res.json()) as any;
    if (!res.ok) throw new PlacementError(v.code, v.message);
    return v as T;
  }
  async commit(input: Input) {
    const payload = { ...input, haAccount: this.account, haGeneration: this.place.generation };
    return immutable(await this.native.transact(this.place.db, payload));
  }
  state() {
    return this.post<Snapshot>("state");
  }
  lookup(operationId: string) {
    return this.post<{ found: boolean; sequence: number; receipt: Receipt }>("lookup", {
      operationId,
    });
  }
  async page(cursor: Cursor, limit: number, exporting = false) {
    assert.equal(cursor.account, this.account);
    const page = await this.post<{
      account: string;
      after: number;
      next: number;
      entries: RecordAt[];
    }>(exporting ? "export" : "feed", { after: cursor.after, limit }, exporting);
    assert.equal(page.account, this.account);
    assert.equal(page.after, cursor.after);
    assert(page.entries.length <= limit && page.next === cursor.after + page.entries.length);
    let n = cursor.after;
    for (const r of page.entries) {
      assert(r.account === this.account && r.sequence === ++n);
      immutable(r.receipt);
    }
    return page;
  }
  async read(
    pin: { sequence: number; receipt: Receipt },
    subject: string,
    validAt = 10,
    history = false,
  ) {
    return (
      await this.post<{ rows: Record<string, any>[] }>("read", {
        ...pin,
        subject,
        validAt,
        history,
      })
    ).rows.sort((a, b) => a["id"].v.localeCompare(b["id"].v));
  }
  translate(origin: string, coordinate: "t" | "position", value: number) {
    return this.post<{ account: string; sequence: number }>("translate", {
      origin,
      coordinate,
      value,
    });
  }
}
export interface Directory {
  current(account: string): Promise<Place>;
  publish(account: string, source: Place, target: Place): Promise<void>;
}
// [DX-HA1] Why: durable source generation, immutable per-account events and a verified destination prefix bound the final delta. Rejected: a process-local router lock or an account-wide scan while writes are stopped.
export class AccountMove {
  constructor(
    readonly source: AccountEndpoint,
    readonly target: AccountEndpoint,
    readonly directory: Directory,
  ) {
    assert(
      source.account === target.account &&
        source.place.db !== target.place.db &&
        source.place.generation + 1 === target.place.generation,
    );
  }
  async copy(untilSequence: number, limit = 8) {
    let { verified } = await this.target.state(),
      checked = 0,
      facts = 0;
    while (verified < untilSequence) {
      const cursor = { account: this.source.account, after: verified },
        page = await this.source.page(cursor, Math.min(limit, untilSequence - verified), true);
      assert(page.entries.length > 0, "Missing source suffix");
      for (const entry of page.entries) {
        assert(
          entry.body &&
            hash(entry.prev + ":" + entry.sequence + ":" + hash(entry.body)) === entry.digest,
        );
        const copied = await this.target.post<Receipt>("import", { entry }, true);
        assert.deepEqual(immutable(copied), entry.receipt);
        const readback = await this.target.page(
          { account: cursor.account, after: verified },
          1,
          true,
        );
        // [DX-HA1] Why: compare actual destination rows, normalized native feed and original receipt before publishing the checkpoint. Rejected: checking the copied command bytes alone.
        assert.deepEqual(readback.entries, [entry]);
        const v = await this.target.post<Snapshot>(
          "verify",
          { sequence: entry.sequence, digest: entry.digest },
          true,
        );
        assert.equal(v.verified, entry.sequence);
        verified = v.verified;
        checked++;
        facts += entry.observedFacts;
      }
    }
    return { verified, checked, facts };
  }
  async fence(limit: number) {
    const target = await this.target.state(),
      cursor = { account: this.target.account, after: Math.max(0, target.verified - 1) };
    const digest = target.verified ? (await this.target.page(cursor, 1)).entries[0]!.digest : "";
    return this.source.post<Snapshot>(
      "fence",
      { verified: target.verified, digest, limit, dest: this.target.place.db },
      true,
    );
  }
  async switch(seal: Snapshot) {
    const actual = await this.source.state();
    assert.deepEqual(actual, seal);
    assert(
      seal.mode === "fenced" &&
        seal.source === this.source.place.db &&
        seal.account === this.source.account &&
        seal.target === this.target.place.db &&
        seal.generation === this.source.place.generation &&
        seal.sealT !== null &&
        seal.sealP !== null,
    );
    const current = await this.directory.current(seal.account);
    if (current.db === this.target.place.db) {
      assert.deepEqual(current, this.target.place);
      return { checked: 0, facts: 0 };
    }
    assert.deepEqual(current, this.source.place);
    let t = await this.target.state();
    const delta =
      t.mode === "importing" ? await this.copy(seal.sequence) : { checked: 0, facts: 0 };
    if (t.mode === "importing")
      t = await this.target.post<Snapshot>(
        "activate",
        {
          sequence: seal.sequence,
          digest: seal.digest,
          source: this.source.place.db,
          endT: seal.sealT,
          endP: seal.sealP,
        },
        true,
      );
    assert(
      t.mode === "serving" &&
        t.source === this.source.place.db &&
        t.generation === this.target.place.generation &&
        t.verified === seal.sequence,
    );
    await this.directory.publish(seal.account, this.source.place, this.target.place);
    return delta;
  }
}
export async function catchUpAndFence(m: AccountMove, limit: number) {
  for (let i = 0; i < 32; i++) {
    const src = await m.source.state();
    await m.copy(src.sequence);
    const start = clock();
    try {
      return { seal: await m.fence(limit), start };
    } catch (e) {
      if (!(e instanceof PlacementError) || e.code !== "CatchUpFirst") throw e;
      await sleep(3);
    }
  }
  throw Error("Live copy has not caught the source; account remains serving");
}

export async function readReceipt(
  endpoint: AccountEndpoint,
  receipt: Receipt,
  subject: string,
  validAt = 10,
  history = false,
) {
  const own = await endpoint.lookup(receipt.operationId);
  assert(own.found);
  assert.deepEqual(own.receipt, receipt);
  return endpoint.read({ sequence: own.sequence, receipt }, subject, validAt, history);
}
export async function resumeOrigin(
  endpoint: AccountEndpoint,
  origin: string,
  nextT: string,
  limit: number,
) {
  assert(/^[1-9]\d*$/.test(nextT));
  const t = Number(BigInt(nextT) - 1n);
  assert(Number.isSafeInteger(t));
  const translated = await endpoint.translate(origin, "t", t);
  return endpoint.page({ account: endpoint.account, after: translated.sequence }, limit);
}
