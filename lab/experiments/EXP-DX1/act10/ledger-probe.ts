// [DX-ACT8] One-off probe (diagnostic): the real packed ledger of a subject owing N synthetic forms, against the
// Publish-time estimate (ledger-parts.ts worstLedgerChars). Prints chars per item for both.
import { W0 } from "../../../bench/lib/w0-world.ts";
import { JoinedAccount } from "../actv-lazy/join/account.ts";
import { Archive } from "../actv-lazy/join/archive.ts";
import { BulkQueue } from "../actv-lazy/join/bulk.ts";
import { largeRelease, parseShape } from "../actv-lazy/join/large-release.ts";
import { noticeItems, readLedgers, worstLedgerChars } from "../actv-lazy/join/ledger-parts.ts";
import { RecordedNotices } from "../actv-lazy/join/recorded.ts";
import { Documents, pack } from "../notify1/store.ts";
import { heldAccount, MemDb, memStore, Proc, seedAccount } from "./memstore.ts";
process.env.TX2_PUBLISH_BESIDE = "1";
process.env.TX2_NOTICE_LEDGER = "parts";
const validTime = W0.POPULATION_VALID_TIME;
for (const forms of [200, 1000, 1500]) {
  const db = new MemDb("probe-" + forms, 1);
  db.maxYield = 0;
  const cut = await seedAccount(db, "acct-p", 2);
  const held = heldAccount("acct-p", 2, cut);
  const proc = new Proc(db, "p");
  const a = new JoinedAccount(memStore(proc, held) as any);
  await a.installHeld(validTime);
  await a.publish("r1", W0.R1.doc, validTime, "owed");
  const doc = largeRelease(W0.R1.doc, parseShape("forms=" + forms + ",policies=" + forms + ",permille=1000"));
  await a.publish("big", doc, validTime, "owed", undefined, { docs: "ref" });
  const n = new (Archive as any)(a, memStore(proc, held, db.scope + "-n"), new BulkQueue(1), "notices", "bytes", "progress");
  await new RecordedNotices(n, "parts").record(2);
  const l = (await readLedgers(new Documents(db.comp as any, "settlement-notices-acct-p"), ["pl:s00000000"], await db.head())).get("pl:s00000000")!;
  const real = pack(l.items).length;
  const est = noticeItems([doc, W0.R1.doc]);
  console.log(JSON.stringify({ forms, realItems: l.items.length, realChars: real, perItem: (real / l.items.length).toFixed(1),
    sample: JSON.stringify(l.items[l.items.length - 1], (k, v) => typeof v === "bigint" ? String(v) : v), estItems: est.items.length, estChars: worstLedgerChars(est.items),
    estPerItem: (worstLedgerChars(est.items) / est.items.length).toFixed(1) }));
}
