import assert from "node:assert/strict";
import {
  DatomicClient,
  errorCode,
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
  verifiedDigest?: string;
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
      digest = target.verifiedDigest;
    assert(
      typeof digest === "string" &&
        (target.verified > 0 ? /^[0-9a-f]{64}$/.test(digest) : digest === ""),
    );
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

export async function readAtOrigin(
  endpoint: AccountEndpoint,
  basis: { origin: string; recordedPosition?: number; basisT?: string; validAt: number },
  subject: string,
  history = false,
) {
  // [DX-HA1] Why: an original database pin can land in a neighboring tenant's transaction. Rejected: requiring that every held basis have an exact receipt for this account.
  const coordinates: ["position" | "t", number][] = [];
  if (basis.recordedPosition !== undefined) coordinates.push(["position", basis.recordedPosition]);
  if (basis.basisT !== undefined) {
    assert(/^\d+$/.test(basis.basisT));
    coordinates.push(["t", Number(BigInt(basis.basisT))]);
  }
  assert(coordinates.length > 0 && Number.isFinite(basis.validAt));
  assert(subject.startsWith(endpoint.account + "~"));
  const cuts = await Promise.all(
    coordinates.map(async ([kind, n]) => {
      assert(Number.isSafeInteger(n) && n >= 0);
      const cut = await endpoint.translate(basis.origin, kind, n);
      assert.equal(cut.account, endpoint.account);
      return cut.sequence;
    }),
  );
  const sequence = Math.min(...cuts);
  if (sequence === 0) return [];
  const entry = (await endpoint.page({ account: endpoint.account, after: sequence - 1 }, 1))
    .entries[0];
  assert(entry?.sequence === sequence);
  return endpoint.read({ sequence, receipt: entry.receipt }, subject, basis.validAt, history);
}

// [DX-HA1] Why: a client may receive the old route after the source has fenced. Rejected: minting a new operation identity or turning a lost response into a terminal rejection.
export class RoutedAccount {
  constructor(
    readonly account: string,
    readonly directory: Directory,
    readonly resolve: (place: Place) => AccountEndpoint,
  ) {}
  private async current() {
    const place = await this.directory.current(this.account),
      endpoint = this.resolve(place);
    assert.equal(endpoint.account, this.account);
    assert.deepEqual(endpoint.place, place);
    return endpoint;
  }
  async commit(input: Input, timeoutMs = 120000) {
    assert(Number.isFinite(timeoutMs) && timeoutMs > 0);
    const { onSent, ...body } = input;
    const command = structuredClone(body);
    const deadline = clock() + timeoutMs;
    for (;;) {
      const endpoint = await this.current();
      try {
        return await endpoint.commit(onSent ? { ...command, onSent } : command);
      } catch (err) {
        const code = err instanceof PlacementError ? err.code : errorCode(err);
        if (code !== "AccountFenced" && code !== "OutcomeUnknown" && code !== "Transport")
          throw err;
        if (clock() >= deadline) throw new PlacementError("OutcomeUnknown", input.operationId);
      }
      await sleep(100);
    }
  }
  async read(receipt: Receipt, subject: string, validAt = 10, history = false) {
    return readReceipt(await this.current(), receipt, subject, validAt, history);
  }
  async at(basis: Parameters<typeof readAtOrigin>[1], subject: string, history = false) {
    return readAtOrigin(await this.current(), basis, subject, history);
  }
  async resume(origin: string, nextT: string, limit: number) {
    return resumeOrigin(await this.current(), origin, nextT, limit);
  }
}
