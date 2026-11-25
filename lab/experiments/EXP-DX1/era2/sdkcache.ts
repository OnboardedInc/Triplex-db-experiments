// [DX-ERA2 fifth pass, B5] The SDK's Reach cache across a removal stopped after its commit, on the commit boundary.
// The client (packages/datomic/src/DatomicClient.ts) reads a1 at a pin twice (the second read is served from its cache:
// the gateway answers the entity unchanged); the removal of a1 is sent to the write gateway, which pauses after its
// commit; once the read gateway's removalStamp is past its sequence (committed, not published), the client reads the
// same pin again. It must not answer the value, and must not reuse its cached entity.
//   tsx sdkcache.ts WRITE_URL READ_URL DB VALUE OUT.json
import { writeFileSync } from "node:fs";
import { DatomicClient } from "../../../../packages/datomic/src/DatomicClient.ts";
import { decodeEntity } from "../../../../packages/datomic/src/reach.ts";

const [W, R, D, value, out] = process.argv.slice(2);
// (the reads use row pages, as the SDK's own demand reads do: readDemandWorld passes rowPage)
// a refused pull is swallowed by the client (counted as a fault): name the first such error
const sdkErrors: string[] = [];
const OriginalTypeError = globalThis.TypeError;
globalThis.TypeError = class extends OriginalTypeError {
  constructor(message?: string) {
    super(message);
    if (sdkErrors.length < 5) sdkErrors.push(`${message} @ ${(this.stack ?? "").split("\n").slice(1, 3).join(" | ")}`);
  }
} as TypeErrorConstructor;
const post = async (url: string, body: unknown) => {
  const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return { status: r.status, body: (await r.json()) as Record<string, unknown> };
};
const frontier = async (u: string) => (await (await fetch(`${u}/v2/db/${D}/erasure-frontier`)).json()) as { seq: number; removalStamp: number };
const text = (x: unknown) =>
  JSON.stringify(x, (_k, v) => (v instanceof Map ? Object.fromEntries(v) : typeof v === "bigint" ? String(v) : v));
const head = (await post(`${R}/v2/db/${D}/reach`, { root: "acct/a/one", basis: { validAt: 1e12 } })).body["position"] as number;
const basis = { recordedPosition: head, validAt: 1e12 };
const client = new DatomicClient(R, 30000);
const warm = await client.reachEntities(D, ["acct/a/one"], basis, true);
if (warm === undefined) {
  // the gateway declined the pull: say why, and stop
  const probe = await fetch(`${R}/v2/db/${D}/reach`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ root: "acct/a/one", basis, session: "sdkcache-probe", erasureRefs: true }),
  });
  const why = {
    pin: head,
    diagnostics: client.reachDiagnostics,
    probeStatus: probe.status,
    probeHeaders: Object.fromEntries([...probe.headers.entries()].filter(([k]) => k.startsWith("x-"))),
    probeBody: await probe.text().then((t) => {
      const body = JSON.parse(t) as { entities: [string, number, unknown[]][] };
      const [id, rev, rows] = body.entities[0]!;
      let decodeError = "none";
      try {
        decodeEntity(id, rev, rows as never, () => {});
      } catch (e) {
        decodeError = `${(e as Error).name}: ${(e as Error).message} @ ${((e as Error).stack ?? "").split("\n").slice(1, 3).join(" | ")}`;
      }
      return { decodeError, head: t.slice(0, 200) };
    }),
    sdkErrors,
  };
  writeFileSync(out, JSON.stringify(why, null, 1));
  console.log("ERA2_SDKCACHE_DECLINED", JSON.stringify(why));
  process.exit(1);
}
const hits0 = client.reachDiagnostics.referenceHits;
const warm2 = await client.reachEntities(D, ["acct/a/one"], basis, true);
const hits1 = client.reachDiagnostics.referenceHits;
const f0 = await frontier(R);
const removal = post(`${W}/v2/db/${D}/erase`, { commandId: "sdk-rm-a1", selectors: [{ entityId: "acct/a/one", attribute: ":v" }] })
  .catch((e) => ({ status: 0, body: { error: String(e) } }));
let f = f0;
for (let i = 0; i < 300 && !(f.removalStamp > f.seq); i++) {
  await new Promise((r) => setTimeout(r, 100));
  f = await frontier(R);
}
const after = await client.reachEntities(D, ["acct/a/one"], basis, true);
const hits2 = client.reachDiagnostics.referenceHits;
const removed = await removal;
const f2 = await frontier(R);
const result = {
  pin: head,
  warmAnswersValue: text(warm).includes(value),
  secondReadServedFromCache: hits1 - hits0,
  frontierBefore: { seq: f0.seq, removalStamp: f0.removalStamp },
  frontierAtTheCommit: { seq: f.seq, removalStamp: f.removalStamp },
  committedNotPublished: f.removalStamp > f.seq,
  afterCommitAnswersValue: text(after).includes(value),
  afterCommitServedFromCache: hits2 - hits1,
  removal: removed.status,
  frontierAfterPublication: { seq: f2.seq, removalStamp: f2.removalStamp },
};
writeFileSync(out, JSON.stringify(result, null, 1));
console.log("ERA2_SDKCACHE", JSON.stringify(result));
void warm2;
